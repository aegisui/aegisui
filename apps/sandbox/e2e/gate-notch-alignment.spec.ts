import { expect, test, type Page } from '@playwright/test';
import { applyTheme } from './lib/gallery';

/**
 * Gate de alineación de la costura del chip `notched` (Input, floating label).
 *
 * QUÉ PROTEGE. La etiqueta flotada en `notched` CABALGA el borde del campo: la
 * mitad de su alto queda sobre el fondo de la página (`surface-canvas`) y la
 * otra mitad sobre el relleno del campo (`surface-raised`). Por eso su fondo no
 * es un color, es un degradado de DOS paradas al 50% — un color plano no puede
 * ser invisible sobre dos superficies distintas (ver docs/contracts/input.md).
 *
 * Ese 50% tiene que caer EXACTAMENTE en la arista exterior del borde. Si no
 * coincide, queda una franja de color equivocado: medio píxel de `canvas` sobre
 * el borde, o un filo de `raised` sobre la página. Es un defecto que hoy solo se
 * ve mirando de cerca, y que un cambio en el posicionamiento del chip
 * reintroduce en silencio.
 *
 * La alineación es ESTRUCTURAL, no un número mágico: el 50% del chip es el
 * centro de su caja, y `translateY(-50%)` sitúa ese centro en la arista del
 * wrapper, que es donde empieza el `<input>` por ser su primer hijo sin margen.
 * Pero "estructural" no es "verificado": basta un `margin-block-start` en el
 * input, o cambiar el `transform` de la etiqueta, para romperlo. Este gate lo
 * convierte en regresión detectable.
 *
 * DOS DIRECCIONES (ADR-013). No basta con que el componente real mida 0: hay que
 * demostrar que la medición SABE CAZAR el desvío. El segundo test rompe la
 * alineación a propósito sobre el DOM y exige que la medida deje de ser 0. Sin
 * él, una función que devolviera 0 siempre pasaría en verde para siempre.
 */

/** Desvío entre la parada del 50% del degradado y la arista exterior del borde. */
async function desvio(page: Page, cell: string): Promise<number> {
  return page.evaluate((sel) => {
    const host = document.querySelector(`[data-cell="${sel}"]`);
    if (!host) {
      throw new Error(`no existe la celda ${sel}`);
    }
    const input = host.querySelector<HTMLElement>('input.aegis-input');
    const label = host.querySelector<HTMLElement>('.aegis-input__label--float');
    if (!input || !label) {
      throw new Error(`la celda ${sel} no tiene input+etiqueta flotante`);
    }
    const l = label.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    // El degradado parte la caja del chip por la mitad; el borde empieza en i.top.
    return l.top + l.height / 2 - i.top;
  }, cell);
}

const CELDAS = ['sm-float-notched', 'md-float-notched', 'lg-float-notched'];

for (const theme of ['light', 'dark'] as const) {
  test(`notch · la costura cae en el borde · ${theme}`, async ({ page }) => {
    await applyTheme(page, theme);

    for (const cell of CELDAS) {
      const d = await desvio(page, cell);
      // Tolerancia sub-píxel: el layout puede dar fracciones, pero un desvío
      // real (medio borde, un margen) es >= 0.5px.
      expect(Math.abs(d), `${cell} [${theme}]: costura desviada ${d.toFixed(3)}px`).toBeLessThan(
        0.5,
      );
    }
  });

  // Las dos celdas cubren los DOS caminos del contrato: el default (que asume
  // `surface-canvas` detrás) y el override (obligatorio cuando la superficie
  // padre es otra). Si el segundo fallara, querría decir que el token de la
  // mitad exterior dejó de ser configurable — y `notched` solo serviría sobre
  // el lienzo.
  for (const [cell, camino] of [
    ['md-float-notched', 'default sobre surface-canvas'],
    ['md-float-notched-raised', 'override sobre surface-raised'],
  ] as const) {
    test(`notch · sin costura · ${camino} · ${theme}`, async ({ page }) => {
      await applyTheme(page, theme);

      const r = await page.evaluate((sel) => {
        const host = document.querySelector(`[data-cell="${sel}"]`)!;
        const label = host.querySelector<HTMLElement>('.aegis-input__label--float')!;
        const input = host.querySelector<HTMLElement>('input.aegis-input')!;
        const colores = getComputedStyle(label).backgroundImage.match(/rgba?\([^)]+\)/g) ?? [];
        // Primer ancestro OPACO: la superficie que el chip tiene detrás.
        let nodo: HTMLElement | null = host.parentElement;
        let padre = 'rgb(255, 255, 255)';
        while (nodo) {
          const c = getComputedStyle(nodo).backgroundColor;
          const m = /^rgba?\(([^)]+)\)$/.exec(c);
          if (m && (m[1].split(',').map(Number)[3] ?? 1) > 0) {
            padre = c;
            break;
          }
          nodo = nodo.parentElement;
        }
        return { colores, padre, campo: getComputedStyle(input).backgroundColor };
      }, cell);

      expect(r.colores, 'el chip debe declarar dos paradas de color').toHaveLength(2);
      // Cada mitad tiene que coincidir con lo que tiene detrás, o se ve la pegatina.
      expect(r.colores[0], `mitad exterior != superficie padre (${camino})`).toBe(r.padre);
      expect(r.colores[1], `mitad interior != relleno del campo (${camino})`).toBe(r.campo);
    });
  }
}

/**
 * Dirección inversa (anti-verde-falso): con la alineación rota a propósito, la
 * medición TIENE que dejar de dar 0. Si este test empezara a fallar, querría
 * decir que `desvio()` devuelve 0 pase lo que pase — y el gate de arriba estaría
 * pasando sin comprobar nada.
 */
test('notch · la medición caza el desvío cuando se rompe a propósito', async ({ page }) => {
  await applyTheme(page, 'light');

  const antes = await desvio(page, 'md-float-notched');
  expect(Math.abs(antes), 'el componente real parte alineado').toBeLessThan(0.5);

  // Rompe la alineación como lo haría un cambio descuidado: un margen sobre el
  // input desplaza su arista sin mover el chip.
  await page.evaluate(() => {
    const input = document
      .querySelector('[data-cell="md-float-notched"]')!
      .querySelector<HTMLElement>('input.aegis-input')!;
    input.style.marginBlockStart = '4px';
  });

  const despues = await desvio(page, 'md-float-notched');
  expect(
    Math.abs(despues),
    'la medición NO detectó una desalineación de 4px: el gate de arriba no está comprobando nada',
  ).toBeGreaterThan(0.5);
});
