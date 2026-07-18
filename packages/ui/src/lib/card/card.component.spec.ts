import { describe, expect, it } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {
  AegisCardComponent,
  type AegisCardElevation,
  type AegisCardPadding,
} from './card.component';
import { AegisButtonComponent } from '../button/button.component';

@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisCardComponent],
  template: `<aegis-card [padding]="padding()" [elevation]="elevation()">
    <h3>Título</h3>
    <p>Contenido de la tarjeta.</p>
  </aegis-card>`,
})
class HostComponent {
  readonly padding = signal<AegisCardPadding>('md');
  readonly elevation = signal<AegisCardElevation>('flat');
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = () => view.detectChanges();
  const root = () => view.fixture.nativeElement as HTMLElement;
  const card = () => root().querySelector('aegis-card') as HTMLElement;
  return { view, host, flush, root, card };
}

describe('<aegis-card> (ui)', () => {
  describe('estructura', () => {
    it('proyecta el contenido en el slot por defecto', async () => {
      await setup();
      expect(screen.getByText('Título')).toBeInTheDocument();
      expect(screen.getByText('Contenido de la tarjeta.')).toBeInTheDocument();
    });

    it('padding por defecto es md; cada valor aplica su clase', async () => {
      const { host, flush, card } = await setup();
      expect(card().className).toContain('aegis-card--p-md');

      for (const p of ['none', 'sm', 'lg'] as const) {
        host.padding.set(p);
        flush();
        expect(card().className).toContain(`aegis-card--p-${p}`);
      }
    });

    it('elevation por defecto es flat; raised aplica su clase', async () => {
      const { host, flush, card } = await setup();
      expect(card().className).toContain('aegis-card--flat');

      host.elevation.set('raised');
      flush();
      expect(card().className).toContain('aegis-card--raised');
    });
  });

  describe('semántica: la Card NO aporta nada, y es deliberado', () => {
    it('no expone ningún rol ARIA', async () => {
      const { card } = await setup();
      expect(card().hasAttribute('role')).toBe(false);
    });

    it('no expone aria-label ni aria-labelledby propios', async () => {
      const { card } = await setup();
      expect(card().hasAttribute('aria-label')).toBe(false);
      expect(card().hasAttribute('aria-labelledby')).toBe(false);
    });

    it('no es enfocable: sin tabindex', async () => {
      const { card } = await setup();
      expect(card().hasAttribute('tabindex')).toBe(false);
    });

    it('Tab no se detiene en la Card', async () => {
      const { card } = await setup();
      await userEvent.tab();
      expect(document.activeElement).not.toBe(card());
    });
  });

  describe('composición con contenido interactivo', () => {
    /** La Card no debe alterar el orden de tabulación de lo que proyecta. */
    @Component({
      selector: 'host-interactive',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [AegisCardComponent, AegisButtonComponent],
      template: `<aegis-card>
          <aegis-button>Primero</aegis-button>
          <aegis-button>Segundo</aegis-button>
        </aegis-card>
        <button type="button">Fuera</button>`,
    })
    class InteractiveHost {}

    it('el orden de tabulación del contenido proyectado es el del DOM, inalterado', async () => {
      await render(InteractiveHost);
      const primero = screen.getByRole('button', { name: 'Primero' });
      const segundo = screen.getByRole('button', { name: 'Segundo' });
      const fuera = screen.getByRole('button', { name: 'Fuera' });

      await userEvent.tab();
      expect(document.activeElement).toBe(primero);
      await userEvent.tab();
      expect(document.activeElement).toBe(segundo);
      await userEvent.tab();
      expect(document.activeElement).toBe(fuera);
    });

    it('un control proyectado conserva su semántica dentro de la Card', async () => {
      const view = await render(InteractiveHost);
      const results = await axe.run(view.fixture.nativeElement as HTMLElement, {
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations, JSON.stringify(results.violations)).toHaveLength(0);
    });
  });

  describe('foco no recortado (2.4.11) — el test que de verdad importa aquí', () => {
    it('la Card NO aplica overflow: hidden, que recortaría el anillo de foco', async () => {
      const { card } = await setup();
      const overflow = getComputedStyle(card()).overflow;
      // `visible` (o vacío en jsdom si no se declara) — nunca `hidden`.
      expect(overflow).not.toBe('hidden');
    });

    it('tampoco declara overflow-x/y ocultos', async () => {
      const { card } = await setup();
      const cs = getComputedStyle(card());
      expect(cs.overflowX).not.toBe('hidden');
      expect(cs.overflowY).not.toBe('hidden');
    });
  });

  describe('casos límite', () => {
    it('Card vacía: renderiza sin romper', async () => {
      @Component({
        selector: 'host-empty',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [AegisCardComponent],
        template: `<aegis-card />`,
      })
      class EmptyHost {}

      const view = await render(EmptyHost);
      const card = (view.fixture.nativeElement as HTMLElement).querySelector('aegis-card');
      expect(card).toBeTruthy();
      expect(card?.textContent?.trim()).toBe('');
    });
  });

  describe('accesibilidad (axe)', () => {
    it('0 violaciones en las 4 x 2 combinaciones de padding x elevation', async () => {
      const { host, flush, root } = await setup();
      for (const p of ['none', 'sm', 'md', 'lg'] as const) {
        for (const e of ['flat', 'raised'] as const) {
          host.padding.set(p);
          host.elevation.set(e);
          flush();
          const results = await axe.run(root(), {
            rules: { 'color-contrast': { enabled: false } },
          });
          expect(results.violations, JSON.stringify(results.violations)).toHaveLength(0);
        }
      }
    });
  });
});
