import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {
  AegisBadgeComponent,
  type AegisBadgeSize,
  type AegisBadgeVariant,
} from './badge.component';

const VARIANTS: readonly AegisBadgeVariant[] = [
  'neutral',
  'accent',
  'success',
  'warning',
  'danger',
];

@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisBadgeComponent],
  template: `<aegis-badge [variant]="variant()" [size]="size()">Activo</aegis-badge>`,
})
class HostComponent {
  readonly variant = signal<AegisBadgeVariant>('neutral');
  readonly size = signal<AegisBadgeSize>('md');
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = () => view.detectChanges();
  const root = () => view.fixture.nativeElement as HTMLElement;
  const badge = () => root().querySelector('aegis-badge') as HTMLElement;
  return { view, host, flush, root, badge };
}

describe('<aegis-badge> (ui)', () => {
  describe('estructura', () => {
    it('renderiza un <span>… en realidad el host, y proyecta el texto', async () => {
      const { badge } = await setup();
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(badge().textContent?.trim()).toBe('Activo');
    });

    it('variant por defecto es neutral; los 5 aplican su clase', async () => {
      const { host, flush, badge } = await setup();
      expect(badge().className).toContain('aegis-badge--neutral');

      for (const v of VARIANTS) {
        host.variant.set(v);
        flush();
        expect(badge().className).toContain(`aegis-badge--${v}`);
      }
    });

    it('size por defecto es md; ambos aplican su clase', async () => {
      const { host, flush, badge } = await setup();
      expect(badge().className).toContain('aegis-badge--md');

      host.size.set('sm');
      flush();
      expect(badge().className).toContain('aegis-badge--sm');
    });
  });

  describe('sin interacción ni semántica propia', () => {
    it('no expone rol ARIA, ni aria-live, ni role="status"/"alert"', async () => {
      const { badge, root } = await setup();
      expect(badge().hasAttribute('role')).toBe(false);
      // Raíl de ADR-019: un badge no se auto-anuncia. Si su valor cambia y eso
      // debe anunciarse, es responsabilidad del contenedor que gestiona el cambio.
      expect(root().querySelectorAll('[aria-live]')).toHaveLength(0);
      expect(root().querySelectorAll('[role="status"]')).toHaveLength(0);
      expect(root().querySelectorAll('[role="alert"]')).toHaveLength(0);
    });

    it('no usa `title` (no accesible por teclado ni fiable en móvil)', async () => {
      const { badge } = await setup();
      expect(badge().hasAttribute('title')).toBe(false);
    });

    it('no es enfocable y Tab no se detiene en él', async () => {
      const { badge } = await setup();
      expect(badge().hasAttribute('tabindex')).toBe(false);
      await userEvent.tab();
      expect(document.activeElement).not.toBe(badge());
    });
  });

  describe('raíl de ADR-014/015 sobre el CSS: tinte, jamás sólido', () => {
    const css = readFileSync(join(__dirname, 'badge.component.css'), 'utf8');
    // Solo las declaraciones, sin los comentarios (que SÍ nombran los tokens
    // prohibidos para explicar por qué no se usan).
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');

    it('NO referencia ningún --aegis-color-destructive-* (esa es la ACCIÓN que borra)', () => {
      expect(declarations).not.toMatch(/--aegis-color-destructive-/);
    });

    it('NO referencia accent-solid ni accent-on-solid (par del botón primario)', () => {
      expect(declarations).not.toMatch(/--aegis-color-accent-solid/);
      expect(declarations).not.toMatch(/--aegis-color-accent-on-solid/);
    });

    it('cada state.* referenciado usa solo claves de {bg, text, border, point}', () => {
      const claves = [...declarations.matchAll(/--aegis-color-state-[a-z]+-([a-z-]+)/g)].map(
        (m) => m[1],
      );
      expect(claves.length).toBeGreaterThan(0); // anti-verde-falso: hay algo que comprobar
      for (const c of claves) {
        expect(['bg', 'text', 'border', 'point']).toContain(c);
      }
    });
  });

  describe('uso decorativo (aria-hidden lo aporta el consumidor)', () => {
    @Component({
      selector: 'host-hidden',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [AegisBadgeComponent],
      template: `<span>Plan Pro</span>
        <aegis-badge variant="accent" aria-hidden="true">Pro</aegis-badge>`,
    })
    class HiddenHost {}

    it('aria-hidden en el host funciona sin ayuda del componente y no deja nada enfocable oculto', async () => {
      const view = await render(HiddenHost);
      const root = view.fixture.nativeElement as HTMLElement;
      const badge = root.querySelector('aegis-badge') as HTMLElement;

      expect(badge.getAttribute('aria-hidden')).toBe('true');
      // El fallo clásico de aria-hidden es esconder algo enfocable. Aquí no hay
      // nada enfocable dentro, y por eso el patrón es seguro.
      expect(badge.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);

      const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations, JSON.stringify(results.violations)).toHaveLength(0);
    });

    // Se comprueba sobre la instancia RENDERIZADA: `new AegisBadgeComponent()` no
    // es válido (los inputs signal exigen contexto de inyección, NG0203).
    it('NO existe un input `decorative`: el consumidor usa el atributo estándar', async () => {
      const { view } = await setup();
      const instance = view.fixture.debugElement.children[0]
        .componentInstance as AegisBadgeComponent;
      expect('decorative' in instance).toBe(false);
      // La API pública son exactamente variant y size.
      expect(
        Object.keys(instance)
          .filter((k) => !k.startsWith('_'))
          .sort(),
      ).toEqual(['classes', 'size', 'variant']);
    });
  });

  describe('casos límite', () => {
    it('badge vacío: renderiza sin romper el layout', async () => {
      @Component({
        selector: 'host-empty',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [AegisBadgeComponent],
        template: `<aegis-badge />`,
      })
      class EmptyHost {}

      const view = await render(EmptyHost);
      const badge = (view.fixture.nativeElement as HTMLElement).querySelector('aegis-badge');
      expect(badge).toBeTruthy();
      expect(badge?.textContent?.trim()).toBe('');
    });

    it('texto largo: no se trunca ni se fuerza nowrap', async () => {
      const css = readFileSync(join(__dirname, 'badge.component.css'), 'utf8');
      const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(declarations).not.toMatch(/white-space:\s*nowrap/);
      expect(declarations).not.toMatch(/text-overflow:\s*ellipsis/);
      expect(declarations).not.toMatch(/overflow:\s*hidden/);
    });

    it('no trae margen propio (el espaciado lo aporta el contenedor)', async () => {
      const css = readFileSync(join(__dirname, 'badge.component.css'), 'utf8');
      const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(declarations).not.toMatch(/^\s*margin(-|:)/m);
    });
  });

  describe('accesibilidad (axe)', () => {
    it('0 violaciones en las 5 variantes x 2 tamaños', async () => {
      const { host, flush, root } = await setup();
      for (const v of VARIANTS) {
        for (const s of ['sm', 'md'] as const) {
          host.variant.set(v);
          host.size.set(s);
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
