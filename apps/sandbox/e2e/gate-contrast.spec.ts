import { expect, test } from '@playwright/test';
import { contrastRatio } from './lib/contrast';
import { applyTheme, readCells } from './lib/gallery';
import { readInputCells } from './lib/input-gallery';
import { readSwitchCells } from './lib/switch-gallery';

/**
 * Gate `contrast` sobre el Button REAL (§9.2, WCAG 1.4.3), fuente de verdad =
 * Chromium: los colores salen de `getComputedStyle` (la cascada la resuelve el
 * navegador, no un parser). Cada par fg/bg renderizado cumple 4.5:1 en light Y
 * dark. El canario invertido (fixtures bad/) sigue vivo en el gate estático
 * `node scripts/gates/run.mjs contrast`.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`contrast · Button real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const cells = await readCells(page);
    expect(cells.length).toBeGreaterThan(0); // anti-verde-falso: hay objetivos que medir

    for (const c of cells) {
      const ratio = contrastRatio(c.color, c.bg);
      expect(
        ratio,
        `${c.cell} [${theme}] ${c.color} sobre ${c.bg} = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // El texto deshabilitado está exento de 1.4.3/1.4.11 (mismo criterio que el
  // Button); el borde (1.4.11, UI) se comprueba además del texto — es la
  // lección de ADR-018: un borde funcional no verificado es un borde que puede
  // fallar en silencio.
  test(`contrast · Input real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const cells = await readInputCells(page);
    expect(cells.length).toBeGreaterThan(0);

    for (const c of cells) {
      if (c.disabled) {
        continue;
      }
      const textRatio = contrastRatio(c.color, c.bg);
      expect(
        textRatio,
        `${c.cell} [${theme}] texto ${c.color} sobre ${c.bg} = ${textRatio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);

      const borderRatio = contrastRatio(c.borderColor, c.bg);
      expect(
        borderRatio,
        `${c.cell} [${theme}] borde ${c.borderColor} sobre ${c.bg} = ${borderRatio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  // El Switch es UI no textual: sus pares van a 3:1 (1.4.11), no a 4.5:1 — salvo
  // la etiqueta, que es texto. Se mide el PULGAR CONTRA SU PISTA en los dos
  // estados: es el par que falla (1.16:1) si alguien unifica el color del pulgar,
  // y el motivo de que sea bicolor. El deshabilitado está exento.
  test(`contrast · Switch real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const cells = await readSwitchCells(page);
    expect(cells.length).toBeGreaterThan(0);
    // Anti-verde-falso: sin celdas `off` no se estaría midiendo el par frágil.
    expect(cells.some((c) => !c.checked && !c.disabled)).toBe(true);

    for (const c of cells) {
      const label = contrastRatio(c.labelColor, c.labelBg);
      expect(
        label,
        `${c.cell} [${theme}] etiqueta ${c.labelColor} sobre ${c.labelBg} = ${label.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(c.disabled ? 0 : 4.5);

      if (c.disabled) {
        continue;
      }

      const thumb = contrastRatio(c.thumbBg, c.trackBg);
      expect(
        thumb,
        `${c.cell} [${theme}] pulgar ${c.thumbBg} sobre pista ${c.trackBg} = ${thumb.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(3);

      // La pista apagada se apoya en su BORDE como señal de límite (su relleno
      // da 1.16:1 contra el lienzo); la encendida se sostiene sola.
      const boundary = Math.max(
        contrastRatio(c.trackBorderColor, c.canvasBg),
        contrastRatio(c.trackBg, c.canvasBg),
      );
      expect(
        boundary,
        `${c.cell} [${theme}] límite de pista (borde ${c.trackBorderColor} / relleno ${c.trackBg}) sobre ${c.canvasBg} = ${boundary.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
}
