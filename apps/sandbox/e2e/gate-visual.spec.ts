import { expect, test } from '@playwright/test';
import { applyTheme } from './lib/gallery';

/**
 * Gate `visual` sobre el Button REAL (§9.2). En vez de un screenshot por píxel
 * (baseline frágil entre plataformas: darwin local ≠ ubuntu CI, por las fuentes),
 * capturamos el ESTILO COMPUTADO por el navegador de cada botón (color, fondo,
 * borde, radio, tipografía, medidas). Sigue siendo la verdad del navegador
 * (`getComputedStyle` resuelve la cascada real, incluido `light-dark()`), pero es
 * determinista: caza cualquier regresión de token/variante/estado, en light Y
 * dark, sin depender del render de fuentes. El baseline vive en `__snapshots__/`.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`visual · Button real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const styles = await page.evaluate(() => {
      const props = [
        'color',
        'background-color',
        'border-top-color',
        'border-top-width',
        'border-top-left-radius',
        'font-size',
        'font-weight',
        'min-block-size',
        'padding-inline-start',
        'padding-block-start',
      ] as const;
      const scope = document.querySelector('[aria-label="Galería del Button"]') ?? document;
      return [...scope.querySelectorAll('[data-cell]')]
        .map((el) => {
          const btn = (el.tagName === 'BUTTON' ? el : el.querySelector('button')) as HTMLElement;
          const cs = getComputedStyle(btn);
          const cell = el.getAttribute('data-cell') ?? '?';
          const line = props.map((p) => `${p}=${cs.getPropertyValue(p)}`).join(' · ');
          return `${cell}: ${line}`;
        })
        .sort()
        .join('\n');
    });
    expect(styles).toMatchSnapshot(`button-styles-${theme}.txt`);
  });

  test(`visual · Input real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const styles = await page.evaluate(() => {
      const props = [
        'color',
        'background-color',
        'border-top-color',
        'border-top-width',
        'border-top-left-radius',
        'font-size',
        'min-block-size',
        'padding-inline-start',
        'padding-block-start',
      ] as const;
      const scope = document.querySelector('[aria-label="Galería del Input"]') ?? document;
      return [...scope.querySelectorAll('[data-cell]')]
        .map((el) => {
          const field = (el.tagName === 'INPUT' ? el : el.querySelector('input')) as HTMLElement;
          const cs = getComputedStyle(field);
          const cell = el.getAttribute('data-cell') ?? '?';
          const line = props.map((p) => `${p}=${cs.getPropertyValue(p)}`).join(' · ');
          return `${cell}: ${line}`;
        })
        .sort()
        .join('\n');
    });
    expect(styles).toMatchSnapshot(`input-styles-${theme}.txt`);
  });
}
