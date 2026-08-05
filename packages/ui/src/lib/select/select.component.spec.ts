import { describe, expect, it, vi } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { AegisSelectComponent } from './select.component';

interface Pais {
  id: number;
  label: string;
}

@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisSelectComponent],
  template: `
    <aegis-select
      [label]="label()"
      [options]="options()"
      [optionLabel]="optionLabel()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [errorMessage]="errorMessage()"
      [helpText]="helpText()"
      [disabledOptions]="disabledOptions()"
      [maxVisible]="maxVisible()"
      [(value)]="value"
      [(open)]="open"
      (selectionChange)="onSelection($event)"
    />
  `,
})
class HostComponent {
  readonly label = signal('País');
  readonly options = signal<readonly Pais[]>([
    { id: 1, label: 'Argentina' },
    { id: 2, label: 'Brasil' },
    { id: 3, label: 'Chile' },
  ]);
  readonly optionLabel = signal<string | ((o: Pais) => string) | undefined>('label');
  readonly placeholder = signal('Elige un país');
  readonly disabled = signal(false);
  readonly invalid = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly helpText = signal<string | undefined>(undefined);
  readonly disabledOptions = signal<readonly Pais[]>([]);
  readonly maxVisible = signal(100);
  readonly value = signal<Pais | undefined>(undefined);
  readonly open = signal(false);
  readonly selected: Pais[] = [];
  onSelection(p: Pais) {
    this.selected.push(p);
  }
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = async () => {
    view.detectChanges();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    view.detectChanges();
  };
  // jsdom no implementa la Popover API: `:popover-open` NUNCA casa, así que el
  // panel se quedaría en `display: none` y sus opciones fuera del árbol de
  // accesibilidad — `getByRole('option')` no las vería aunque estén en el DOM.
  // Los mocks simulan lo que el navegador hace de verdad al abrir/cerrar. Que el
  // panel se muestre en un navegador REAL lo verifica el gate e2e, no esto.
  const panel = view.container.querySelector('.aegis-select__panel') as HTMLElement;
  panel.showPopover = vi.fn(() => {
    panel.style.display = 'block';
  });
  panel.hidePopover = vi.fn(() => {
    panel.style.display = '';
  });
  await flush();

  const trigger = screen.getByRole('combobox');
  const key = async (k: string) => {
    fireEvent.keyDown(trigger, { key: k });
    await flush();
  };
  const optionEls = () => screen.queryAllByRole('option');
  return { view, host, trigger, panel, flush, key, optionEls };
}

const manyPaises = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i, label: `Pais-${i}` }));

describe('AegisSelectComponent', () => {
  describe('estructura y ARIA', () => {
    it('el disparador es un <button> nativo con role="combobox"', async () => {
      const { trigger } = await setup();
      expect(trigger.tagName).toBe('BUTTON');
      expect(trigger.getAttribute('type')).toBe('button');
      expect(trigger.getAttribute('role')).toBe('combobox');
      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('aria-expanded refleja open en las dos direcciones', async () => {
      const { host, trigger, flush } = await setup();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      host.open.set(true);
      await flush();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      host.open.set(false);
      await flush();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('aria-controls apunta al id del panel, y ese id EXISTE en el DOM', async () => {
      const { trigger, view } = await setup();
      const id = trigger.getAttribute('aria-controls');
      expect(id).toBeTruthy();
      const panel = view.container.querySelector(`#${CSS.escape(id!)}`);
      expect(panel).not.toBeNull();
      expect(panel?.getAttribute('role')).toBe('listbox');
    });

    it('el <label> apunta al disparador', async () => {
      const { trigger, view } = await setup();
      const label = view.container.querySelector('label')!;
      expect(label.getAttribute('for')).toBe(trigger.id);
      expect(trigger.id).toBeTruthy();
    });

    it('data-handles coincide con la tabla de teclado del contrato', async () => {
      const { trigger } = await setup();
      expect(trigger.getAttribute('data-handles')).toBe('Enter Space ArrowDown ArrowUp Home End');
    });

    it('sin helpText ni errorMessage no hay aria-describedby vacío', async () => {
      const { trigger } = await setup();
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });

    it('con helpText y errorMessage, aria-describedby compone los dos ids', async () => {
      const { host, trigger, flush } = await setup();
      host.helpText.set('Ayuda');
      host.errorMessage.set('Error');
      host.invalid.set(true);
      await flush();

      const ids = trigger.getAttribute('aria-describedby')!.split(' ');
      expect(ids).toHaveLength(2);
      for (const id of ids) {
        expect(document.getElementById(id)).not.toBeNull();
      }
      expect(trigger.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('foco virtual', () => {
    it('abierto, aria-activedescendant apunta a una opción RENDERIZADA', async () => {
      const { trigger, key } = await setup();
      await key('ArrowDown');

      const id = trigger.getAttribute('aria-activedescendant');
      expect(id).toBeTruthy();
      const el = document.getElementById(id!);
      expect(el).not.toBeNull();
      expect(el?.getAttribute('role')).toBe('option');
    });

    it('cerrado, aria-activedescendant NO está', async () => {
      const { trigger, key } = await setup();
      await key('ArrowDown');
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(true);

      await key('Enter');
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('el foco DOM permanece en el disparador durante toda la navegación', async () => {
      const { trigger, key } = await setup();
      trigger.focus();
      await key('ArrowDown');
      await key('ArrowDown');
      await key('ArrowUp');

      expect(document.activeElement).toBe(trigger);
    });

    it('recorrer todas las opciones nunca deja un id colgante', async () => {
      const { host, trigger, flush, key } = await setup();
      host.options.set(manyPaises(30));
      await flush();
      await key('ArrowDown');

      for (let i = 0; i < 30; i++) {
        const id = trigger.getAttribute('aria-activedescendant');
        expect(document.getElementById(id ?? ''), `paso ${i}: id "${id}"`).not.toBeNull();
        await key('ArrowDown');
      }
    });
  });

  describe('abrir y cerrar', () => {
    it('click en el disparador abre y vuelve a cerrar', async () => {
      const { host, trigger, flush } = await setup();
      fireEvent.click(trigger);
      await flush();
      expect(host.open()).toBe(true);

      fireEvent.click(trigger);
      await flush();
      expect(host.open()).toBe(false);
    });

    it('ArrowDown cerrado abre y activa la primera', async () => {
      const { host, key, optionEls } = await setup();
      await key('ArrowDown');

      expect(host.open()).toBe(true);
      expect(optionEls()[0].className).toContain('aegis-select__option--active');
    });

    it('ArrowUp cerrado abre y activa la última', async () => {
      const { host, key, optionEls } = await setup();
      await key('ArrowUp');

      expect(host.open()).toBe(true);
      expect(optionEls()[2].className).toContain('aegis-select__option--active');
    });

    it('abrir con value ya puesto activa la SELECCIONADA, no la primera', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.value.set(host.options()[2]);
      await flush();
      await key('ArrowDown');

      expect(optionEls()[2].className).toContain('aegis-select__option--active');
      expect(optionEls()[0].className).not.toContain('aegis-select__option--active');
    });

    it('Enter abre cuando está cerrado', async () => {
      const { host, key } = await setup();
      await key('Enter');
      expect(host.open()).toBe(true);
    });

    it('Space abre cuando está cerrado', async () => {
      const { host, key } = await setup();
      await key(' ');
      expect(host.open()).toBe(true);
    });

    it('disabled impide abrir por click y por teclado', async () => {
      const { host, trigger, flush, key } = await setup();
      host.disabled.set(true);
      await flush();

      fireEvent.click(trigger);
      await flush();
      expect(host.open()).toBe(false);

      await key('ArrowDown');
      expect(host.open()).toBe(false);
    });
  });

  describe('activa ≠ seleccionada', () => {
    it('navegar con flechas NO cambia value ni emite selectionChange', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      await key('ArrowDown');

      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
    });

    it('Enter selecciona la activa, emite y cierra', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      await key('Enter');

      expect(host.value()).toEqual({ id: 1, label: 'Argentina' });
      expect(host.selected).toEqual([{ id: 1, label: 'Argentina' }]);
      expect(host.open()).toBe(false);
    });

    it('Space selecciona: la condición es editable=false, no el typeahead', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      await key(' ');

      expect(host.value()).toEqual({ id: 1, label: 'Argentina' });
      expect(host.open()).toBe(false);
    });

    it('click en una opción la selecciona y cierra', async () => {
      const { host, key, optionEls } = await setup();
      await key('ArrowDown');
      fireEvent.click(optionEls()[1]);

      expect(host.value()).toEqual({ id: 2, label: 'Brasil' });
      expect(host.selected).toEqual([{ id: 2, label: 'Brasil' }]);
    });

    it('aria-selected marca solo la seleccionada', async () => {
      const { key, optionEls } = await setup();
      await key('ArrowDown');
      await key('ArrowDown');
      await key('Enter');
      await key('ArrowDown');

      expect(optionEls().map((e) => e.getAttribute('aria-selected'))).toEqual([
        'false',
        'true',
        'false',
      ]);
    });
  });

  describe('etiqueta, cap y casos límite', () => {
    it('el disparador muestra el placeholder sin selección', async () => {
      const { trigger } = await setup();
      expect(trigger.textContent?.trim()).toContain('Elige un país');
    });

    it('el disparador muestra la ETIQUETA de la opción, resuelta por optionLabel', async () => {
      const { host, trigger, flush } = await setup();
      host.value.set({ id: 2, label: 'Brasil' });
      await flush();

      expect(trigger.textContent?.trim()).toContain('Brasil');
      expect(trigger.textContent).not.toContain('[object Object]');
    });

    it('con options vacío, el panel muestra "Sin resultados."', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.options.set([]);
      await flush();
      await key('ArrowDown');

      expect(optionEls()).toHaveLength(0);
      // La FILA VISIBLE por su clase, no `getByText`: el texto vive a propósito
      // en dos sitios y la aserción tiene que decir en cuál lo espera.
      const fila = document.querySelector('.aegis-select__status');
      expect(fila?.textContent?.trim()).toBe('Sin resultados.');
    });

    it('más de maxVisible aplica el cap del listbox con su fila de truncado', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.options.set(manyPaises(150));
      host.maxVisible.set(100);
      await flush();
      await key('ArrowDown');

      expect(optionEls()).toHaveLength(100);
      const fila = document.querySelector('.aegis-select__status');
      expect(fila?.textContent).toContain('Mostrando los primeros 100 de 150');
    });

    it('las opciones deshabilitadas se saltan al navegar y conservan aria-disabled', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.disabledOptions.set([host.options()[1]]);
      await flush();
      await key('ArrowDown');

      expect(optionEls()[1].getAttribute('aria-disabled')).toBe('true');
      await key('ArrowDown');
      expect(optionEls()[2].className).toContain('aegis-select__option--active');
    });

    it('value fuera de options no marca ninguna opción', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.value.set({ id: 99, label: 'Inexistente' });
      await flush();
      await key('ArrowDown');

      expect(optionEls().every((e) => e.getAttribute('aria-selected') === 'false')).toBe(true);
    });

    it('el nodo de error existe SIEMPRE y vacío (ADR-019 Regla 4)', async () => {
      const { view } = await setup();
      const error = view.container.querySelector('.aegis-select__error');
      expect(error).not.toBeNull();
      expect(error?.textContent?.trim()).toBe('');
    });
  });

  /**
   * RAÍLES CONTRA EL COMPONENTE REAL.
   *
   * Existen por una lección concreta: los tests del listbox verificaban su
   * contrato de anuncios contra un HOST DE PRUEBAS escrito a mano — que sí traía
   * la región live. Daban verde mientras las pieles REALES, que son lo que el
   * usuario toca, no la renderizaban en absoluto. Un contrato verificado contra
   * un consumidor de mentira no dice nada del consumidor de verdad.
   *
   * De ahí que estos midan sobre el componente renderizado, y que comprueben lo
   * que el lector percibe, no lo que el DOM contiene en cualquier sitio.
   */
  describe('estructura y anuncios del COMPONENTE REAL', () => {
    it('el role="listbox" NO tiene más hijos que opciones — con lista vacía', async () => {
      // NVDA cuenta los HIJOS del listbox, no los `role="option"`. Con la fila de
      // estado dentro, anunciaba "1 item" habiendo cero resultados.
      const { host, flush, key } = await setup();
      host.options.set([]);
      await flush();
      await key('ArrowDown');

      const listbox = document.querySelector('[role=listbox]')!;
      expect(listbox.querySelectorAll('[role=option]')).toHaveLength(0);
      expect(listbox.children, 'ningún hijo que no sea una opción').toHaveLength(0);
    });

    it('el role="listbox" NO tiene más hijos que opciones — con lista truncada', async () => {
      const { host, flush, key } = await setup();
      host.options.set(manyPaises(150));
      host.maxVisible.set(100);
      await flush();
      await key('ArrowDown');

      const listbox = document.querySelector('[role=listbox]')!;
      expect(listbox.querySelectorAll('[role=option]')).toHaveLength(100);
      expect(listbox.children, '100 opciones y ni un hijo más').toHaveLength(100);
    });

    it('la fila de estado es HERMANA del listbox y está oculta al lector', async () => {
      const { host, flush, key } = await setup();
      host.options.set([]);
      await flush();
      await key('ArrowDown');

      const listbox = document.querySelector('[role=listbox]')!;
      const fila = document.querySelector('.aegis-select__status')!;
      expect(listbox.contains(fila), 'la fila no puede ser hija del listbox').toBe(false);
      // La anuncia la región live; si además la leyera el panel, sonaría dos veces.
      expect(fila.getAttribute('aria-hidden')).toBe('true');
    });

    it('hay UNA región aria-live, presente desde el primer render y VACÍA', async () => {
      const { view } = await setup();
      const regiones = view.container.querySelectorAll('[aria-live]');

      expect(regiones, 'la piel real debe traer su región live').toHaveLength(1);
      expect(regiones[0].getAttribute('aria-live')).toBe('polite');
      expect(regiones[0].textContent?.trim()).toBe('');
    });

    it('la región live está FUERA del popover (dentro saldría del árbol al cerrar)', async () => {
      const { view } = await setup();
      const panel = view.container.querySelector('.aegis-select__panel')!;
      const region = view.container.querySelector('[aria-live]')!;

      expect(panel.contains(region)).toBe(false);
    });

    it('el vacío se anuncia EN LA REGIÓN LIVE, no solo en cualquier sitio del DOM', async () => {
      // La aserción anterior era `getByText('Sin resultados.')`, que encontraba la
      // fila visual y se daba por satisfecha aunque nada lo anunciara.
      const { host, flush, key } = await setup();
      host.options.set([]);
      await flush();
      await key('ArrowDown');

      const region = document.querySelector('[aria-live]')!;
      expect(region.textContent?.trim()).toBe('Sin resultados.');
    });

    it('el truncado se anuncia EN LA REGIÓN LIVE con su recuento', async () => {
      const { host, flush, key } = await setup();
      host.options.set(manyPaises(150));
      host.maxVisible.set(100);
      await flush();
      await key('ArrowDown');

      const region = document.querySelector('[aria-live]')!;
      expect(region.textContent).toContain('Mostrando los primeros 100 de 150');
    });

    it('el recuento NORMAL no se anuncia: la región sigue vacía', async () => {
      const { key } = await setup();
      await key('ArrowDown');

      const region = document.querySelector('[aria-live]')!;
      expect(region.textContent?.trim()).toBe('');
    });
  });
});
