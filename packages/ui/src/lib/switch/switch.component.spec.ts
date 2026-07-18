import { describe, expect, it } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { AegisSwitchComponent, type AegisSwitchSize } from './switch.component';

/** Host de pruebas: el consumidor controla todos los inputs vía signals. */
@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisSwitchComponent],
  template: `<aegis-switch
    [label]="label()"
    [(checked)]="checked"
    [disabled]="disabled()"
    [size]="size()"
  />`,
})
class HostComponent {
  readonly label = signal('Notificaciones');
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly size = signal<AegisSwitchSize>('md');
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = () => view.detectChanges();
  const sw = () => screen.getByRole('switch') as HTMLButtonElement;
  const root = () => view.fixture.nativeElement as HTMLElement;
  return { view, host, flush, sw, root };
}

describe('<aegis-switch> (ui)', () => {
  describe('estructura y semántica', () => {
    it('renderiza un <button role="switch">, no un checkbox ni un div', async () => {
      const { sw } = await setup();
      expect(sw().tagName).toBe('BUTTON');
      expect(sw().type).toBe('button');
      expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('renderiza un <label> cuyo `for` coincide con el `id` del <button>', async () => {
      const { root, sw } = await setup();
      const label = root().querySelector('label') as HTMLLabelElement;
      expect(label.htmlFor).toBe(sw().id);
      expect(label.htmlFor).not.toBe('');
    });

    it('el nombre accesible es el texto de label y NO incluye el estado', async () => {
      const { host, flush, sw } = await setup();
      expect(sw().getAttribute('aria-checked')).toBe('false');
      expect(screen.getByRole('switch', { name: 'Notificaciones' })).toBeTruthy();

      host.checked.set(true);
      flush();
      // Mismo nombre en on: el estado viaja por aria-checked, no por el nombre (2.5.3).
      expect(screen.getByRole('switch', { name: 'Notificaciones' })).toBeTruthy();
    });

    it('aria-checked refleja el estado, siempre con valor explícito', async () => {
      const { host, flush, sw } = await setup();
      expect(sw().getAttribute('aria-checked')).toBe('false');
      host.checked.set(true);
      flush();
      expect(sw().getAttribute('aria-checked')).toBe('true');
    });

    it('no duplica el id en el host (el id vive en el <button> interno)', async () => {
      const { root } = await setup();
      expect(root().querySelector('aegis-switch')?.hasAttribute('id')).toBe(false);
    });
  });

  describe('interacción', () => {
    it('activar con el ratón alterna checked (two-way) y aria-checked', async () => {
      const { host, flush, sw } = await setup();
      await userEvent.click(sw());
      flush();
      expect(host.checked()).toBe(true);
      expect(sw().getAttribute('aria-checked')).toBe('true');
    });

    it('clic en el <label> alterna checked', async () => {
      const { host, flush, root } = await setup();
      await userEvent.click(root().querySelector('label') as HTMLLabelElement);
      flush();
      expect(host.checked()).toBe(true);
    });

    it('el foco permanece en el interruptor tras alternar (3.2.2)', async () => {
      const { flush, sw } = await setup();
      await userEvent.click(sw());
      flush();
      expect(document.activeElement).toBe(sw());
    });

    it('focus() mueve el foco al <button> real', async () => {
      const { view, flush, sw } = await setup();
      flush();
      view.fixture.debugElement.children[0].componentInstance.focus();
      expect(document.activeElement).toBe(sw());
    });
  });

  describe('teclado (contrato §Teclado)', () => {
    it('Space alterna checked', async () => {
      const { host, flush, sw } = await setup();
      sw().focus();
      await userEvent.keyboard(' ');
      flush();
      expect(host.checked()).toBe(true);
    });

    it('Enter alterna checked', async () => {
      const { host, flush, sw } = await setup();
      sw().focus();
      await userEvent.keyboard('{Enter}');
      flush();
      expect(host.checked()).toBe(true);
    });

    it('las flechas NO alteran checked (un switch aislado no es un grupo)', async () => {
      const { host, flush, sw } = await setup();
      sw().focus();
      await userEvent.keyboard('{ArrowRight}{ArrowLeft}{ArrowUp}{ArrowDown}');
      flush();
      expect(host.checked()).toBe(false);
    });

    it('Tab lleva el foco al interruptor', async () => {
      const { sw } = await setup();
      await userEvent.tab();
      expect(document.activeElement).toBe(sw());
    });

    // Se renderiza deshabilitado DE ENTRADA, no se deshabilita sobre la marcha:
    // en jsdom, `blur()` sobre un elemento ya deshabilitado no mueve el foco, así
    // que deshabilitar-y-tabular mediría el artefacto del entorno en vez del
    // orden de tabulación real. Partiendo de disabled, el foco nunca estuvo ahí.
    it('Tab SALTA el interruptor deshabilitado', async () => {
      @Component({
        selector: 'host-disabled',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [AegisSwitchComponent],
        template: `<aegis-switch label="Notificaciones" disabled />
          <button type="button">después</button>`,
      })
      class DisabledHost {}

      const view = await render(DisabledHost);
      const root = view.fixture.nativeElement as HTMLElement;
      const sw = screen.getByRole('switch') as HTMLButtonElement;
      const after = screen.getByRole('button', { name: 'después' });

      expect(sw.disabled).toBe(true);
      await userEvent.tab();
      // El foco se va al siguiente enfocable, saltándose el interruptor.
      expect(document.activeElement).toBe(after);
      expect(document.activeElement).not.toBe(sw);
      expect(root.contains(after)).toBe(true);
    });
  });

  describe('disabled', () => {
    it('aplica el atributo nativo disabled y NO aria-disabled', async () => {
      const { host, flush, sw } = await setup();
      host.disabled.set(true);
      flush();
      expect(sw().disabled).toBe(true);
      expect(sw().hasAttribute('aria-disabled')).toBe(false);
    });

    it('con disabled, activar no cambia checked', async () => {
      const { host, flush, sw } = await setup();
      host.disabled.set(true);
      flush();
      await userEvent.click(sw());
      flush();
      expect(host.checked()).toBe(false);
    });

    it('checked + disabled es válido: aria-checked="true" se mantiene', async () => {
      const { host, flush, sw } = await setup();
      host.checked.set(true);
      host.disabled.set(true);
      flush();
      expect(sw().getAttribute('aria-checked')).toBe('true');
      expect(sw().disabled).toBe(true);
    });
  });

  describe('tamaños', () => {
    it('el default es md; cada valor aplica su clase de escala', async () => {
      const { host, flush, sw } = await setup();
      expect(sw().className).toContain('aegis-switch--md');

      for (const size of ['sm', 'lg'] as const) {
        host.size.set(size);
        flush();
        expect(sw().className).toContain(`aegis-switch--${size}`);
      }
    });
  });

  describe('raíl de ADR-019: NINGUNA región live', () => {
    it('no existe ningún aria-live, role="alert" ni role="status" en el componente', async () => {
      const { host, flush, root } = await setup();
      // También tras alternar: nadie puede añadir una región live "por si acaso"
      // para anunciar el cambio de estado. aria-checked ya lo anuncia nativamente.
      for (const checked of [true, false]) {
        host.checked.set(checked);
        flush();
        expect(root().querySelectorAll('[aria-live]')).toHaveLength(0);
        expect(root().querySelectorAll('[role="alert"]')).toHaveLength(0);
        expect(root().querySelectorAll('[role="status"]')).toHaveLength(0);
      }
    });
  });

  describe('accesibilidad (axe)', () => {
    it('0 violaciones en los 3 tamaños x on/off/disabled', async () => {
      const { host, flush, root } = await setup();
      for (const size of ['sm', 'md', 'lg'] as const) {
        for (const [checked, disabled] of [
          [false, false],
          [true, false],
          [false, true],
        ] as const) {
          host.size.set(size);
          host.checked.set(checked);
          host.disabled.set(disabled);
          flush();
          const results = await axe.run(root(), {
            rules: { 'color-contrast': { enabled: false } },
          });
          expect(results.violations, JSON.stringify(results.violations)).toHaveLength(0);
        }
      }
    });

    it('SIN label: el interruptor se queda sin nombre accesible (violación esperada)', async () => {
      const { host, flush, root } = await setup();
      host.label.set('');
      flush();
      const results = await axe.run(root(), { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.map((v) => v.id)).toContain('button-name');
    });
  });
});
