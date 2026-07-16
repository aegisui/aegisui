import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { applyTheme } from './lib/gallery';

/**
 * Gate `a11y` sobre el Button REAL (§9.2, WCAG 2.2 AA): axe-core sobre el DOM
 * renderizado en Chromium, en light Y dark, 0 violaciones. Al correr en un
 * navegador real, axe evalúa TAMBIÉN el color-contrast compuesto (no como en
 * jsdom). El canario invertido (fixtures bad/) sigue vivo en el gate estático.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`a11y · Button real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .include('[aria-label="Galería del Button"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test(`a11y · Input real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .include('[aria-label="Galería del Input"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });
}
