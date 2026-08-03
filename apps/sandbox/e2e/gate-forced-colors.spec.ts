import { expect, test, type Page } from '@playwright/test';
import { applyTheme } from './lib/gallery';

/**
 * Gate `forced-colors` sobre los componentes REALES (WCAG 1.4.1 / SPEC §8).
 *
 * QUÉ VERIFICA Y QUÉ NO — la distinción importa:
 *
 * Esto es un gate de REGRESIÓN: comprueba que el CSS RESPONDE a
 * `forced-colors: active` — que los colores de marca ceden a los del sistema, que
 * ningún texto queda invisible y que el anillo de foco sobrevive. Es barato y
 * corre en cada PR.
 *
 * NO es una validación de que el componente se VEA BIEN en Windows High Contrast
 * real. Chromium aplica un juego de colores por defecto bajo `emulateMedia`, no
 * los temas reales del sistema operativo (que el usuario puede personalizar, y
 * que en Windows incluyen varias combinaciones muy distintas). Esa comprobación
 * sigue siendo un PASE MANUAL pendiente en Windows de verdad:
 * ver `docs/pase-manual-set-minimo.md` §8.
 *
 * Los dos, no uno: el gate caza la regresión, el pase manual valida el resultado.
 */

interface Painted {
  sel: string;
  color: string;
  bg: string;
  borderColor: string;
}

/** Colores resueltos de cada componente aegis-* pintado en la galería. */
async function readPainted(page: Page): Promise<Painted[]> {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll<HTMLElement>(
      '[data-cell] , [data-cell] *, aegis-button, aegis-input input, aegis-switch button, aegis-badge, aegis-card',
    );
    const out: Painted[] = [];
    for (const el of nodes) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') {
        continue;
      }
      const cell = el.closest('[data-cell]')?.getAttribute('data-cell') ?? '?';
      out.push({
        sel: `${cell}/${el.tagName.toLowerCase()}`,
        color: s.color,
        bg: s.backgroundColor,
        borderColor: s.borderTopColor,
      });
    }
    return out;
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`forced-colors · el CSS responde · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);

    const normal = await readPainted(page);
    expect(normal.length, 'no se leyó ningún componente: el gate sería vacuo').toBeGreaterThan(0);

    await page.emulateMedia({ forcedColors: 'active' });
    await expect
      .poll(() => page.evaluate(() => matchMedia('(forced-colors: active)').matches))
      .toBe(true);

    const forced = await readPainted(page);
    expect(forced.length).toBe(normal.length);

    // Los colores de marca tienen que ceder a los del sistema. Si NADA cambia,
    // el componente está imponiendo su paleta sobre el tema forzado del usuario
    // (típicamente por un `forced-color-adjust: none` de más).
    const changed = forced.filter(
      (f, i) => f.color !== normal[i].color || f.bg !== normal[i].bg,
    ).length;
    expect(changed, 'ningún color cedió a los del sistema bajo forced-colors').toBeGreaterThan(0);
  });

  test(`forced-colors · ningún texto invisible · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    await page.emulateMedia({ forcedColors: 'active' });

    const painted = await readPainted(page);
    expect(painted.length).toBeGreaterThan(0);

    for (const p of painted) {
      // Fondo transparente = hereda el de detrás; no es un par que evaluar aquí.
      if (/rgba\(0, 0, 0, 0\)/.test(p.bg)) {
        continue;
      }
      expect(p.color, `${p.sel}: texto y fondo idénticos bajo forced-colors`).not.toBe(p.bg);
    }
  });

  test(`forced-colors · el anillo de foco sobrevive · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    await page.emulateMedia({ forcedColors: 'active' });

    // `:not([disabled])` tiene que ir en AMBOS selectores: un control
    // deshabilitado no puede recibir foco, así que exigirle anillo acusaría al
    // componente de un fallo que es del test. `readonly` sí entra: es focusable.
    const focusables = page.locator(
      '[data-cell] button:not([disabled]), [data-cell] input:not([disabled])',
    );
    const n = await focusables.count();
    expect(n, 'no hay focusables: el gate sería vacuo').toBeGreaterThan(0);

    for (let i = 0; i < n; i++) {
      const el = focusables.nth(i);
      // El anillo va en `:focus-visible`, que depende de la MODALIDAD de la
      // última interacción. `applyTheme` hace click para conmutar el tema, y tras
      // un click Chromium deja de considerar `:focus-visible` un `.focus()`
      // programático — el anillo no se pintaría y el test acusaría al componente
      // de un fallo suyo. Una pulsación de tecla devuelve la modalidad a teclado,
      // que es la que este criterio (2.4.7/2.4.11) describe.
      await page.keyboard.press('Tab');
      await el.focus();
      const ring = await el.evaluate((node) => {
        const s = getComputedStyle(node);
        return {
          width: parseFloat(s.outlineWidth),
          style: s.outlineStyle,
          cell: node.closest('[data-cell]')?.getAttribute('data-cell') ?? '?',
          tag: node.tagName.toLowerCase(),
          focusVisible: node.matches(':focus-visible'),
          isActive: document.activeElement === node,
        };
      });
      const ctx = `${ring.cell}/${ring.tag} fv=${ring.focusVisible} active=${ring.isActive}`;
      expect(ring.style, `focusable ${i} (${ctx}): sin outline bajo forced-colors`).not.toBe(
        'none',
      );
      expect(ring.width, `focusable ${i} (${ctx}): outline 0px bajo forced-colors`).toBeGreaterThan(
        0,
      );
    }
  });
}
