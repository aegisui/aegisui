import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { AegisListbox } from './listbox';

/**
 * Host de pruebas que reproduce el cableado REAL del patrón: el foco DOM vive en
 * el control (`input[role=combobox]`), el `keydown` entra por ahí, y la opción
 * activa se comunica por `aria-activedescendant`. Montarlo de otra forma (foco en
 * las opciones) probaría un patrón distinto del que declara el contrato.
 */
@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisListbox],
  template: `
    <input
      role="combobox"
      data-testid="trigger"
      [attr.aria-activedescendant]="lb.activeDescendantId() ?? null"
      (keydown)="lb.onKeydown($event)"
    />
    <div
      aegisListbox
      #lb="aegisListbox"
      data-testid="listbox"
      [options]="options()"
      [filter]="filter()"
      [maxVisible]="maxVisible()"
      [disabledOptions]="disabledOptions()"
      [typeahead]="typeahead()"
      [loop]="loop()"
      [(activeIndex)]="activeIndex"
      [(value)]="value"
      (optionSelected)="onSelected($event)"
    >
      @for (o of lb.visibleOptions(); track $index) {
        <div
          role="option"
          [id]="lb.optionId($index)"
          [attr.aria-selected]="lb.isSelected($index)"
          [attr.aria-disabled]="lb.isDisabledAt($index) ? 'true' : null"
          (click)="lb.selectAt($index)"
        >
          {{ o }}
        </div>
      }
      @if (lb.statusMessage()) {
        <div data-testid="status">{{ lb.statusMessage() }}</div>
      }
    </div>
    <span data-testid="live" aria-live="polite">{{ lb.statusMessage() }}</span>
  `,
})
class HostComponent {
  readonly options = signal<readonly string[]>(['alfa', 'beta', 'gamma']);
  readonly filter = signal('');
  readonly maxVisible = signal(100);
  readonly disabledOptions = signal<readonly string[]>([]);
  readonly typeahead = signal(true);
  readonly loop = signal(true);
  readonly activeIndex = signal(-1);
  readonly value = signal<string | undefined>(undefined);
  readonly selected: string[] = [];
  onSelected(option: string) {
    this.selected.push(option);
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
  await flush();
  const trigger = screen.getByTestId('trigger');
  const key = async (k: string) => {
    fireEvent.keyDown(trigger, { key: k });
    await flush();
  };
  const optionEls = () => screen.queryAllByRole('option');
  return { view, host, trigger, flush, key, optionEls };
}

const manyOptions = (n: number) => Array.from({ length: n }, (_, i) => `opcion-${i}`);

describe('AegisListbox', () => {
  describe('cap de resultados (ADR-023 §4)', () => {
    it('visibleOptions aplica filter y DESPUÉS maxVisible', async () => {
      const { host, flush, optionEls } = await setup();
      host.options.set(['alfa', 'alfombra', 'beta', 'alambre']);
      host.filter.set('al');
      host.maxVisible.set(2);
      await flush();

      expect(optionEls().map((e) => e.textContent?.trim())).toEqual(['alfa', 'alfombra']);
    });

    it('matchCount cuenta TODAS las coincidencias, no las visibles', async () => {
      const { host, flush } = await setup();
      host.options.set(manyOptions(1240));
      host.maxVisible.set(100);
      await flush();

      // 1240 renderizadas serían 1240; el cap deja 100, pero el mensaje dice el total.
      expect(screen.getByTestId('status').textContent).toContain('de 1240');
    });

    it('truncado: 100 opciones + 1 fila de estado, y la fila NO tiene role="option"', async () => {
      const { host, flush, optionEls } = await setup();
      host.options.set(manyOptions(1240));
      host.maxVisible.set(100);
      await flush();

      expect(optionEls()).toHaveLength(100);
      const status = screen.getByTestId('status');
      expect(status.getAttribute('role')).toBeNull();
      expect(status.textContent?.trim()).toBe(
        'Mostrando los primeros 100 de 1240. Afina la búsqueda.',
      );
    });

    it('la fila de estado no es alcanzable con End (la activa se queda en la última opción)', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.options.set(manyOptions(1240));
      host.maxVisible.set(100);
      await flush();
      await key('End');

      expect(host.activeIndex()).toBe(99);
      const active = document.getElementById(
        screen.getByTestId('trigger').getAttribute('aria-activedescendant') ?? '',
      );
      expect(active?.getAttribute('role')).toBe('option');
      expect(optionEls()).toHaveLength(100);
    });

    it('estado vacío: 0 opciones, "Sin resultados." y aria-activedescendant AUSENTE', async () => {
      const { host, trigger, flush, optionEls } = await setup();
      host.filter.set('no-casa-nada');
      await flush();

      expect(optionEls()).toHaveLength(0);
      expect(screen.getByTestId('status').textContent?.trim()).toBe('Sin resultados.');
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('options vacío (no por filtro) da el mismo estado vacío', async () => {
      const { host, flush } = await setup();
      host.options.set([]);
      await flush();

      expect(screen.getByTestId('status').textContent?.trim()).toBe('Sin resultados.');
    });

    it('maxVisible menor que 1 se trata como 1', async () => {
      const { host, flush, optionEls } = await setup();
      host.maxVisible.set(0);
      await flush();

      expect(optionEls()).toHaveLength(1);
    });
  });

  describe('activa ≠ seleccionada', () => {
    it('navegar con flechas NO cambia value ni emite optionSelected', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      await key('ArrowDown');

      expect(host.activeIndex()).toBe(1);
      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
    });

    it('Enter sobre la activa fija value y emite optionSelected', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      await key('Enter');

      expect(host.value()).toBe('alfa');
      expect(host.selected).toEqual(['alfa']);
    });

    it('Enter sin activa no hace nada', async () => {
      const { host, key } = await setup();
      await key('Enter');

      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
    });

    it('click sobre una opción la selecciona', async () => {
      const { host, flush, optionEls } = await setup();
      fireEvent.click(optionEls()[2]);
      await flush();

      expect(host.value()).toBe('gamma');
      expect(host.selected).toEqual(['gamma']);
    });

    it('aria-selected marca solo la seleccionada', async () => {
      const { key, optionEls } = await setup();
      await key('ArrowDown');
      await key('Enter');

      expect(optionEls().map((e) => e.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'false',
      ]);
    });

    it('value fuera de options no marca ninguna opción', async () => {
      const { host, flush, optionEls } = await setup();
      host.value.set('inexistente');
      await flush();

      expect(host.value()).toBe('inexistente');
      expect(optionEls().every((e) => e.getAttribute('aria-selected') === 'false')).toBe(true);
    });
  });

  describe('teclado', () => {
    it('ArrowDown sin activa activa la primera', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      expect(host.activeIndex()).toBe(0);
    });

    it('ArrowUp sin activa activa la última (simétrico)', async () => {
      const { host, key } = await setup();
      await key('ArrowUp');
      expect(host.activeIndex()).toBe(2);
    });

    it('ArrowDown en la última vuelve a la primera con loop=true', async () => {
      const { host, key } = await setup();
      await key('End');
      await key('ArrowDown');
      expect(host.activeIndex()).toBe(0);
    });

    it('loop=false detiene la navegación en los extremos', async () => {
      const { host, flush, key } = await setup();
      host.loop.set(false);
      await flush();
      await key('End');
      expect(host.activeIndex()).toBe(2);
      await key('ArrowDown');
      expect(host.activeIndex()).toBe(2);

      await key('Home');
      await key('ArrowUp');
      expect(host.activeIndex()).toBe(0);
    });

    it('Home activa la primera y End la última renderizada', async () => {
      const { host, key } = await setup();
      await key('End');
      expect(host.activeIndex()).toBe(2);
      await key('Home');
      expect(host.activeIndex()).toBe(0);
    });

    it('Space selecciona cuando el listbox no está en un campo de texto (typeahead activo)', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      await key(' ');

      expect(host.value()).toBe('alfa');
      expect(host.selected).toEqual(['alfa']);
    });

    it('Space NO selecciona en modo editable (typeahead desactivado): la escritura manda', async () => {
      const { host, flush, key } = await setup();
      host.typeahead.set(false);
      await flush();
      await key('ArrowDown');
      await key(' ');

      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
    });

    it('las teclas de navegación llaman a preventDefault (no hay scroll de página)', async () => {
      const { trigger, flush } = await setup();
      for (const k of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
        const evt = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
        trigger.dispatchEvent(evt);
        await flush();
        expect(evt.defaultPrevented, `${k} debería prevenir el default`).toBe(true);
      }
    });

    it('ignora las combinaciones con modificador', async () => {
      const { host, trigger, flush } = await setup();
      fireEvent.keyDown(trigger, { key: 'ArrowDown', ctrlKey: true });
      await flush();
      expect(host.activeIndex()).toBe(-1);
    });

    it('data-handles coincide con la tabla de teclado del contrato', async () => {
      await setup();
      expect(screen.getByTestId('listbox').getAttribute('data-handles')).toBe(
        'ArrowDown ArrowUp Home End Enter Space',
      );
    });
  });

  describe('opciones deshabilitadas', () => {
    it('se saltan al navegar pero siguen visibles con aria-disabled', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.disabledOptions.set(['beta']);
      await flush();

      expect(optionEls()).toHaveLength(3);
      expect(optionEls()[1].getAttribute('aria-disabled')).toBe('true');

      await key('ArrowDown');
      expect(host.activeIndex()).toBe(0);
      await key('ArrowDown');
      expect(host.activeIndex()).toBe(2);
    });

    it('una deshabilitada no se selecciona por click', async () => {
      const { host, flush, optionEls } = await setup();
      host.disabledOptions.set(['beta']);
      await flush();
      fireEvent.click(optionEls()[1]);
      await flush();

      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
    });

    it('con TODAS deshabilitadas, ArrowDown no activa nada (sin bucle infinito)', async () => {
      const { host, flush, key } = await setup();
      host.disabledOptions.set(['alfa', 'beta', 'gamma']);
      await flush();
      await key('ArrowDown');

      expect(host.activeIndex()).toBe(-1);
    });

    it('Home/End saltan las deshabilitadas de los extremos', async () => {
      const { host, flush, key } = await setup();
      host.disabledOptions.set(['alfa', 'gamma']);
      await flush();
      await key('Home');
      expect(host.activeIndex()).toBe(1);
      await key('End');
      expect(host.activeIndex()).toBe(1);
    });
  });

  describe('typeahead', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('activa por prefijo', async () => {
      const { host, key } = await setup();
      await key('g');
      expect(host.activeIndex()).toBe(2);
    });

    it('acumula el buffer mientras se escribe rápido', async () => {
      const { host, flush, key } = await setup();
      host.options.set(['beta', 'berilio', 'bermejo']);
      await flush();

      await key('b');
      expect(host.activeIndex()).toBe(0);
      await key('e');
      await key('r');
      expect(host.activeIndex()).toBe(1);
    });

    it('el buffer se reinicia a 1 s de inactividad', async () => {
      const { host, flush, key } = await setup();
      host.options.set(['beta', 'berilio']);
      await flush();

      await key('b');
      await key('e');
      expect(host.activeIndex()).toBe(0);

      vi.advanceTimersByTime(1000);
      await key('b');
      // Buffer reiniciado: "b" vuelve a casar con la primera, no con "beb...".
      expect(host.activeIndex()).toBe(0);
    });

    it('con typeahead=false la escritura no mueve la activa', async () => {
      const { host, flush, key } = await setup();
      host.typeahead.set(false);
      await flush();
      await key('g');

      expect(host.activeIndex()).toBe(-1);
    });
  });

  describe('invariante del foco virtual (el raíl de ADR-023 §4)', () => {
    it('recorriendo la lista entera con ArrowDown, getElementById NUNCA es null', async () => {
      const { host, trigger, flush, key } = await setup();
      host.options.set(manyOptions(120));
      host.maxVisible.set(100);
      await flush();

      for (let i = 0; i < 100; i++) {
        await key('ArrowDown');
        const id = trigger.getAttribute('aria-activedescendant');
        expect(id, `paso ${i}: aria-activedescendant ausente`).toBeTruthy();
        expect(
          document.getElementById(id ?? ''),
          `paso ${i}: id "${id}" no existe en el DOM`,
        ).not.toBeNull();
      }
    });

    it('aria-activedescendant se retira cuando no hay activa', async () => {
      const { host, trigger, flush, key } = await setup();
      await key('ArrowDown');
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(true);

      host.filter.set('no-casa-nada');
      await flush();
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('reducir el filtro hasta que desaparece la activa la recoloca sin dejarla fuera de rango', async () => {
      const { host, flush, key } = await setup();
      host.options.set(['alfa', 'alfombra', 'beta']);
      await flush();
      await key('End');
      expect(host.activeIndex()).toBe(2);

      host.filter.set('alf');
      await flush();

      expect(host.activeIndex()).toBeLessThan(2);
      expect(host.activeIndex()).toBeGreaterThanOrEqual(0);
      expect(host.activeIndex()).toBe(0);
    });

    it('al encogerse la lista, aria-activedescendant NUNCA queda apuntando a un id inexistente', async () => {
      // Se comprueba tras UNA sola pasada de detección de cambios, no tras el
      // flush completo: el template lee `activeDescendantId()` durante la pasada
      // en la que el input ya trae la lista nueva. Si el invariante dependiera
      // solo del effect de recolocación, habría un frame con el atributo
      // apuntando a un id que ya no existe — justo lo que ADR-023 §4 prohíbe.
      const { host, trigger, view, key } = await setup();
      await key('End');
      expect(host.activeIndex()).toBe(2);

      host.options.set(['alfa']);
      view.detectChanges();

      const id = trigger.getAttribute('aria-activedescendant');
      if (id !== null) {
        expect(
          document.getElementById(id),
          `id "${id}" no existe tras encoger la lista`,
        ).not.toBeNull();
      }
    });

    it('el id de la activa siempre pertenece a una opción renderizada', async () => {
      const { host, trigger, flush, key } = await setup();
      host.options.set(manyOptions(500));
      host.maxVisible.set(10);
      await flush();
      await key('End');

      const id = trigger.getAttribute('aria-activedescendant');
      const el = document.getElementById(id ?? '');
      expect(el).not.toBeNull();
      expect(el?.getAttribute('role')).toBe('option');
    });

    it('mantiene la activa a la vista con scrollIntoView({ block: "nearest" })', async () => {
      const { flush, key } = await setup();
      const spy = vi.fn();
      for (const el of screen.queryAllByRole('option')) {
        (el as HTMLElement).scrollIntoView = spy;
      }
      await flush();
      await key('ArrowDown');

      expect(spy).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('los ids son únicos aunque el contenido se repita', async () => {
      const { host, flush } = await setup();
      host.options.set(['dup', 'dup', 'dup']);
      await flush();

      const ids = screen.queryAllByRole('option').map((e) => e.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('anuncios (ADR-019)', () => {
    it('hay UNA sola región aria-live="polite", presente desde el primer render y vacía', async () => {
      await setup();
      const regions = document.querySelectorAll('[aria-live]');
      expect(regions).toHaveLength(1);
      expect(regions[0].getAttribute('aria-live')).toBe('polite');
      expect(regions[0].textContent?.trim()).toBe('');
    });

    it('la región live NO está referenciada por aria-describedby (Regla 3)', async () => {
      await setup();
      const liveId = screen.getByTestId('live').id;
      const described = [...document.querySelectorAll('[aria-describedby]')].map((e) =>
        e.getAttribute('aria-describedby'),
      );
      expect(described.some((v) => liveId && v?.includes(liveId))).toBe(false);
    });

    it('el recuento NORMAL no se anuncia: la región sigue vacía', async () => {
      const { host, flush } = await setup();
      host.options.set(manyOptions(5));
      await flush();

      expect(screen.getByTestId('live').textContent?.trim()).toBe('');
    });

    it('el truncado SÍ se anuncia (ningún lector puede inferirlo)', async () => {
      const { host, flush } = await setup();
      host.options.set(manyOptions(1240));
      host.maxVisible.set(100);
      await flush();

      expect(screen.getByTestId('live').textContent).toContain('Afina la búsqueda');
    });

    it('el estado vacío se anuncia', async () => {
      const { host, flush } = await setup();
      host.filter.set('zzz');
      await flush();

      expect(screen.getByTestId('live').textContent?.trim()).toBe('Sin resultados.');
    });

    it('seguir tecleando sin que el mensaje cambie NO lo reescribe', async () => {
      const { host, flush } = await setup();
      host.options.set(manyOptions(1240));
      host.maxVisible.set(100);
      await flush();

      const live = screen.getByTestId('live');
      const before = live.textContent;
      const mutations: MutationRecord[] = [];
      const observer = new MutationObserver((records) => mutations.push(...records));
      observer.observe(live, { childList: true, characterData: true, subtree: true });

      // El filtro cambia DE VERDAD dos veces, pero las 1240 opciones siguen
      // casando, así que el mensaje es idéntico. Es el caso "seguir tecleando
      // dentro del truncado": el usuario escribe y la región NO debe reescribirse.
      host.filter.set('opcion');
      await flush();
      host.filter.set('opcion-');
      await flush();
      observer.disconnect();

      // El mensaje sigue siendo el mismo (sanity: si cambiara, el test no probaría nada).
      expect(live.textContent).toBe(before);
      expect(live.textContent).toContain('de 1240');
      expect(mutations).toHaveLength(0);
    });

    it('las transiciones de mensaje son characterData, NUNCA childList (Regla 4)', async () => {
      const { host, flush } = await setup();
      const live = screen.getByTestId('live');
      const mutations: MutationRecord[] = [];
      const observer = new MutationObserver((records) => mutations.push(...records));
      observer.observe(live, { childList: true, characterData: true, subtree: true });

      host.options.set(manyOptions(1240));
      host.maxVisible.set(100);
      await flush();
      host.filter.set('zzz');
      await flush();
      observer.disconnect();

      expect(mutations.length).toBeGreaterThan(0);
      expect(mutations.every((m) => m.type === 'characterData')).toBe(true);
      expect(mutations.some((m) => m.type === 'childList')).toBe(false);
    });
  });

  describe('estructura ARIA', () => {
    it('el contenedor tiene role="listbox" y las opciones role="option"', async () => {
      const { optionEls } = await setup();
      expect(screen.getByTestId('listbox').getAttribute('role')).toBe('listbox');
      expect(optionEls()).toHaveLength(3);
    });

    it('el foco DOM permanece en el control al navegar (nunca salta a las opciones)', async () => {
      const { trigger, key } = await setup();
      trigger.focus();
      await key('ArrowDown');
      await key('ArrowDown');

      expect(document.activeElement).toBe(trigger);
    });
  });
});
