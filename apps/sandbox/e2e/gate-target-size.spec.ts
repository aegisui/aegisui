import { expect, test } from '@playwright/test';
import { applyTheme, readCells } from './lib/gallery';

/**
 * Gate `target-size` sobre el Button REAL (§9.2, WCAG 2.5.8): todo objetivo
 * interactivo mide ≥ 24×24 px, medido con el bounding box REAL del navegador
 * (incluye el tamaño `sm` y el botón solo-icono). El canario invertido (fixtures
 * bad/ 16×16) sigue vivo en `node scripts/gates/run.mjs target-size`.
 */
const MIN = 24;

for (const theme of ['light', 'dark'] as const) {
  test(`target-size · Button real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const cells = await readCells(page);
    expect(cells.length).toBeGreaterThan(0);

    for (const c of cells) {
      expect(c.width, `${c.cell} ancho`).toBeGreaterThanOrEqual(MIN);
      expect(c.height, `${c.cell} alto`).toBeGreaterThanOrEqual(MIN);
    }
  });
}
