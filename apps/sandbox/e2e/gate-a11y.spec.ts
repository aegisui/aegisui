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

  test(`a11y · Switch real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .include('[aria-label="Galería del Switch"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test(`a11y · Card real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .include('[aria-label="Galería de la Card"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test(`a11y · Badge real · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .include('[aria-label="Galería del Badge"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  // BANCO DE COMPOSICIÓN: los cinco componentes juntos. Las galerías verifican
  // cada uno en aislamiento; esto verifica lo COMPUESTO, que es donde aparecen
  // los fallos que ninguna galería puede ver.
  test(`a11y · banco de composición · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .include('aegis-composicion-bench')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });
}

// Invariantes de COMPOSICIÓN del banco (independientes del tema). Son el
// objetivo automatizable del pase manual de cierre
// (docs/pase-manual-set-minimo.md): lo que un gate SÍ puede confirmar, para que
// el pase humano se concentre en lo que ninguno puede (los anuncios).
test('composición · orden de foco, roles y regiones live', async ({ page }) => {
  await applyTheme(page, 'light');
  const info = await page.evaluate(() => {
    const bench = document.querySelector('aegis-composicion-bench') as HTMLElement;
    const focusables = [...bench.querySelectorAll('input, button')].filter(
      (el) => !(el as HTMLInputElement).disabled,
    );
    const cards = [...bench.querySelectorAll('aegis-card')];
    return {
      orden: focusables.map((el) => {
        const e = el as HTMLElement;
        const id = e.getAttribute('id') ?? '';
        const label = bench.querySelector(`label[for="${id}"]`)?.textContent?.trim();
        return label || e.textContent?.trim() || e.tagName;
      }),
      switchesDeshabilitados: bench.querySelectorAll('button[role=switch][disabled]').length,
      cardsConRol: cards.filter((c) => c.hasAttribute('role')).length,
      cardsConOverflowOculto: cards.filter((c) => {
        const cs = getComputedStyle(c);
        return cs.overflowX === 'hidden' || cs.overflowY === 'hidden';
      }).length,
      // Los Buttons SÍ traen su aria-live (ADR-019 Regla 2: carga). Nadie más
      // puede tenerlo: ni Switch, ni Badge, ni Card, ni el propio banco.
      liveDeBotones: bench.querySelectorAll('aegis-button [aria-live]').length,
      liveFueraDeBotones: [
        ...bench.querySelectorAll('[aria-live], [role=status], [role=alert]'),
      ].filter((el) => !el.closest('aegis-button')).length,
      secciones: [...bench.querySelectorAll('section[aria-labelledby]')].map((s) =>
        document.getElementById(s.getAttribute('aria-labelledby') as string)?.textContent?.trim(),
      ),
    };
  });

  // El orden de tabulación es el visual, y coincide con el guion del pase manual.
  expect(info.orden).toEqual([
    'Correo de contacto',
    'Nombre visible',
    'Avisos por correo',
    'Resumen semanal',
    'Cancelar',
    'Guardar cambios',
    'Eliminar cuenta',
  ]);
  expect(info.switchesDeshabilitados, 'el switch deshabilitado se salta en la tabulación').toBe(1);
  // La Card no aporta semántica: ocho tarjetas no pueden ser ocho landmarks.
  expect(info.cardsConRol, 'ninguna Card expone rol').toBe(0);
  // 2.4.11: un overflow oculto recortaría el anillo de foco de los botones de la esquina.
  expect(info.cardsConOverflowOculto, 'ninguna Card recorta el anillo de foco').toBe(0);
  expect(info.liveDeBotones, 'cada Button trae su aria-live de carga').toBe(3);
  expect(
    info.liveFueraDeBotones,
    'ni Switch, ni Badge, ni Card, ni el banco introducen regiones live (ADR-019)',
  ).toBe(0);
  // La semántica de región la aporta el consumidor, no la Card.
  expect(info.secciones).toEqual(['Ajustes de la cuenta', 'Zona de peligro']);
});
