import { describe, expect, it, vi } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { AegisComboboxComponent } from './combobox.component';

interface Pais {
  id: number;
  label: string;
}

const PAISES: Pais[] = [
  { id: 1, label: 'Argentina' },
  { id: 2, label: 'Brasil' },
  { id: 3, label: 'Chile' },
];

@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisComboboxComponent],
  template: `
    <aegis-combobox
      [label]="label()"
      [options]="options()"
      optionLabel="label"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [errorMessage]="errorMessage()"
      [helpText]="helpText()"
      [labelMode]="labelMode()"
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
  readonly options = signal<readonly Pais[]>(PAISES);
  readonly placeholder = signal('Busca un país');
  readonly disabled = signal(false);
  readonly invalid = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly helpText = signal<string | undefined>(undefined);
  readonly labelMode = signal<'stacked' | 'floating'>('stacked');
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
  // jsdom no implementa la Popover API (ver select.component.spec.ts).
  const panel = view.container.querySelector('.aegis-combobox__panel') as HTMLElement;
  panel.showPopover = vi.fn(() => {
    panel.style.display = 'block';
  });
  panel.hidePopover = vi.fn(() => {
    panel.style.display = '';
  });
  await flush();

  const campo = view.container.querySelector('input') as HTMLInputElement;
  const escribir = async (texto: string) => {
    fireEvent.input(campo, { target: { value: texto } });
    await flush();
  };
  const key = async (k: string) => {
    fireEvent.keyDown(campo, { key: k });
    await flush();
  };
  const optionEls = () => screen.queryAllByRole('option');
  return { view, host, campo, panel, flush, escribir, key, optionEls };
}

const muchos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, label: `Pais-${i}` }));

describe('AegisComboboxComponent', () => {
  describe('integración con el Input real (el punto que hace de esto una piel)', () => {
    it('el campo es un <aegis-input>, no un <input> propio', async () => {
      const { view } = await setup();
      expect(view.container.querySelector('aegis-input')).not.toBeNull();
      // Un solo <input> en todo el componente: el del Input reutilizado.
      expect(view.container.querySelectorAll('input')).toHaveLength(1);
    });

    it('el ARIA del combobox aterriza en el <input> INTERNO, no en el host', async () => {
      const { view, campo } = await setup();
      const host = view.container.querySelector('aegis-input')!;

      expect(campo.getAttribute('role')).toBe('combobox');
      expect(campo.getAttribute('aria-autocomplete')).toBe('list');
      expect(campo.getAttribute('aria-expanded')).toBe('false');
      // Y NO en el envoltorio, que es donde caería sin el passthrough.
      expect(host.hasAttribute('role')).toBe(false);
      expect(host.hasAttribute('aria-expanded')).toBe(false);
    });

    it('aria-controls apunta a un id que EXISTE y es el role="listbox"', async () => {
      const { view, campo } = await setup();
      const id = campo.getAttribute('aria-controls');
      expect(id).toBeTruthy();
      const panel = view.container.querySelector(`#${CSS.escape(id!)}`);
      expect(panel).not.toBeNull();
      expect(panel?.getAttribute('role')).toBe('listbox');
    });

    it('el ARIA de combobox y el del Input COEXISTEN: inválido sigue anunciando su error', async () => {
      const { host, campo, flush } = await setup();
      host.invalid.set(true);
      host.errorMessage.set('Elige un país');
      await flush();
      await flush();

      // Del envoltorio
      expect(campo.getAttribute('role')).toBe('combobox');
      // Del Input, intactos — es el raíl de los siete protegidos en uso real
      expect(campo.getAttribute('aria-invalid')).toBe('true');
      const descrito = campo.getAttribute('aria-describedby');
      expect(descrito).toBeTruthy();
      expect(document.getElementById(descrito!)?.textContent).toContain('Elige un país');
    });

    it('el id del campo lo sigue gobernando el Input (protegido), y el <label> lo apunta', async () => {
      const { view, campo } = await setup();
      const label = view.container.querySelector('label')!;
      expect(campo.id).toBeTruthy();
      expect(label.getAttribute('for')).toBe(campo.id);
    });

    it('el keydown llega al listbox por burbujeo desde el <aegis-input>', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      expect(host.open()).toBe(true);
    });
  });

  describe('filtrado', () => {
    it('teclear filtra por la ETIQUETA', async () => {
      const { escribir, optionEls } = await setup();
      await escribir('bra');

      expect(optionEls().map((e) => e.textContent?.trim())).toEqual(['Brasil']);
    });

    it('el filtro no casa contra el id: teclear "3" no saca Chile', async () => {
      const { host, flush, escribir, optionEls } = await setup();
      host.options.set([{ id: 3, label: 'Chile' }]);
      await flush();
      await escribir('3');

      expect(optionEls()).toHaveLength(0);
    });

    it('teclear abre el panel', async () => {
      const { host, escribir } = await setup();
      expect(host.open()).toBe(false);
      await escribir('a');
      expect(host.open()).toBe(true);
    });

    it('sin coincidencias: "Sin resultados." y aria-activedescendant ausente', async () => {
      const { campo, escribir, optionEls } = await setup();
      await escribir('zzz');

      expect(optionEls()).toHaveLength(0);
      expect(screen.getByText('Sin resultados.')).toBeTruthy();
      expect(campo.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('más de maxVisible: fila de truncado del listbox', async () => {
      const { host, flush, escribir, optionEls } = await setup();
      host.options.set(muchos(150));
      await flush();
      await escribir('Pais');

      expect(optionEls()).toHaveLength(100);
      expect(screen.getByText(/Mostrando los primeros 100 de 150/)).toBeTruthy();
    });

    it('borrar el texto vuelve a mostrar todas y NO limpia value', async () => {
      const { host, flush, escribir, key, optionEls } = await setup();
      await escribir('bra');
      await key('ArrowDown');
      await key('Enter');
      expect(host.value()).toEqual({ id: 2, label: 'Brasil' });

      await escribir('');
      await flush();
      expect(optionEls()).toHaveLength(3);
      expect(host.value()).toEqual({ id: 2, label: 'Brasil' });
    });
  });

  describe('texto del campo vs opción comprometida', () => {
    it('en reposo con value, el campo muestra la etiqueta', async () => {
      const { host, campo, flush } = await setup();
      host.value.set(PAISES[1]);
      await flush();

      expect(campo.value).toBe('Brasil');
    });

    it('Enter compromete, cierra y el campo pasa a la etiqueta', async () => {
      const { host, campo, escribir, key } = await setup();
      await escribir('chi');
      await key('ArrowDown');
      await key('Enter');

      expect(host.value()).toEqual({ id: 3, label: 'Chile' });
      expect(host.selected).toEqual([{ id: 3, label: 'Chile' }]);
      expect(host.open()).toBe(false);
      expect(campo.value).toBe('Chile');
    });

    it('salir sin comprometer restaura la etiqueta (nunca queda texto huérfano)', async () => {
      const { host, campo, flush, escribir } = await setup();
      host.value.set(PAISES[0]);
      await flush();

      await escribir('brasi');
      expect(campo.value).toBe('brasi');

      fireEvent.focusOut(campo);
      await flush();
      expect(campo.value).toBe('Argentina');
      expect(host.open()).toBe(false);
    });

    it('salir sin comprometer y sin value deja el campo vacío', async () => {
      const { campo, flush, escribir } = await setup();
      await escribir('brasi');
      fireEvent.focusOut(campo);
      await flush();

      expect(campo.value).toBe('');
    });

    it('Escape cierra sin comprometer y restaura el texto', async () => {
      const { host, campo, flush, escribir, key } = await setup();
      host.value.set(PAISES[0]);
      await flush();
      await escribir('bra');
      await key('Escape');
      await flush();

      expect(host.value()).toEqual(PAISES[0]);
      expect(campo.value).toBe('Argentina');
    });

    it('texto que el Combobox no originó (autofill) se trata como tecleado: filtra, no compromete', async () => {
      const { host, campo, flush, optionEls } = await setup();
      // Simula el autofill del navegador: escribe en el campo sin pasar por la UI.
      campo.value = 'Brasil';
      fireEvent.input(campo);
      await flush();

      expect(optionEls().map((e) => e.textContent?.trim())).toEqual(['Brasil']);
      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
    });
  });

  describe('teclado (editable=true)', () => {
    it('Space escribe un espacio y NO selecciona', async () => {
      const { host, campo, flush, escribir, key } = await setup();
      await escribir('bra');
      await key('ArrowDown');
      expect(host.value()).toBeUndefined();

      const evt = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      campo.dispatchEvent(evt);
      await flush();

      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
      expect(evt.defaultPrevented).toBe(false);
    });

    it('navegar con flechas NO cambia value ni emite', async () => {
      const { host, key } = await setup();
      await key('ArrowDown');
      await key('ArrowDown');

      expect(host.value()).toBeUndefined();
      expect(host.selected).toEqual([]);
    });

    it('el foco DOM permanece en el campo durante toda la navegación', async () => {
      const { campo, key } = await setup();
      campo.focus();
      await key('ArrowDown');
      await key('ArrowDown');

      expect(document.activeElement).toBe(campo);
    });

    it('aria-activedescendant apunta a una opción RENDERIZADA en cada paso', async () => {
      const { host, campo, flush, key } = await setup();
      host.options.set(muchos(30));
      await flush();
      await key('ArrowDown');

      for (let i = 0; i < 30; i++) {
        const id = campo.getAttribute('aria-activedescendant');
        expect(document.getElementById(id ?? ''), `paso ${i}: id "${id}"`).not.toBeNull();
        await key('ArrowDown');
      }
    });

    it('click en una opción la compromete', async () => {
      const { host, key, optionEls } = await setup();
      await key('ArrowDown');
      fireEvent.click(optionEls()[1]);

      expect(host.value()).toEqual({ id: 2, label: 'Brasil' });
    });

    it('las deshabilitadas se saltan y conservan aria-disabled', async () => {
      const { host, flush, key, optionEls } = await setup();
      host.disabledOptions.set([PAISES[1]]);
      await flush();
      await key('ArrowDown');

      expect(optionEls()[1].getAttribute('aria-disabled')).toBe('true');
      await key('ArrowDown');
      expect(optionEls()[2].className).toContain('aegis-combobox__option--active');
    });
  });

  describe('etiqueta flotante (la decisión de §Autofill)', () => {
    // Cambiar labelMode recrea el <input> (son ramas @if del Input), así que hay
    // que RE-CONSULTARLO: una referencia previa apunta a un nodo ya desprendido.
    it('labelMode="floating" funciona y el ARIA sigue en el <input> interno', async () => {
      const { host, view, flush } = await setup();
      host.labelMode.set('floating');
      await flush();

      const campo = view.container.querySelector('input') as HTMLInputElement;
      expect(campo.getAttribute('role')).toBe('combobox');
      expect(campo.className).toContain('aegis-input--floating');
    });

    it('con floating, filtrar y navegar siguen funcionando', async () => {
      const { host, view, flush } = await setup();
      host.labelMode.set('floating');
      await flush();

      const campo = view.container.querySelector('input') as HTMLInputElement;
      fireEvent.input(campo, { target: { value: 'bra' } });
      await flush();
      fireEvent.keyDown(campo, { key: 'ArrowDown' });
      await flush();

      const id = campo.getAttribute('aria-activedescendant');
      expect(document.getElementById(id ?? '')).not.toBeNull();
    });
  });
});
