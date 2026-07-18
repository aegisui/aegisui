import type { Page } from '@playwright/test';

/**
 * Datos de cada `<aegis-card>` real de la galería.
 *
 * La Card no es un control, así que lo que se mide es distinto que en Button,
 * Input y Switch:
 *
 *   - texto sobre la superficie de la Card -> 4.5:1 (1.4.3). Importa porque la
 *     Card CAMBIA el fondo del contenido (canvas -> raised).
 *   - el BORDE **no** se mide contra 3:1: es decorativo (border-separator,
 *     ADR-018). Se expone igualmente para el snapshot de `visual`.
 *   - `overflow`: la comprobación de 2.4.11 — un `overflow: hidden` recortaría
 *     el anillo de foco de un control proyectado en la esquina.
 */
export interface CardCell {
  cell: string;
  color: string;
  bg: string;
  borderColor: string;
  overflowX: string;
  overflowY: string;
  /** Padding real aplicado. Lo usa la guarda de "las variantes se distinguen". */
  paddingTop: string;
  /** Sombra real aplicada. Idem, para `flat` vs `raised`. */
  boxShadow: string;
}

export async function readCardCells(page: Page): Promise<CardCell[]> {
  return page.evaluate(() => {
    const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const opaque = (s: string) => {
      const n = rgb(s);
      return n.length < 4 || n[3] > 0;
    };
    const effBg = (el: Element | null): string => {
      let node: Element | null = el;
      while (node) {
        const c = getComputedStyle(node).backgroundColor;
        if (c && c !== 'transparent' && opaque(c)) {
          return c;
        }
        node = node.parentElement;
      }
      return 'rgb(255, 255, 255)';
    };

    const scope = document.querySelector('[aria-label="Galería de la Card"]') ?? document;
    return [...scope.querySelectorAll('[data-cell]')].map((el) => {
      const cs = getComputedStyle(el);
      // El texto real proyectado: se mide su color contra el fondo de la Card.
      const text = (el.querySelector('p') ?? el) as HTMLElement;
      return {
        cell: el.getAttribute('data-cell') ?? '?',
        color: getComputedStyle(text).color,
        bg: effBg(el),
        borderColor: cs.borderTopColor,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
        paddingTop: cs.paddingTop,
        boxShadow: cs.boxShadow,
      };
    });
  });
}

/**
 * Mide si el anillo de foco de un control proyectado EN LA ESQUINA de una Card
 * queda dentro de la caja de la Card (2.4.11). Devuelve el desbordamiento del
 * outline respecto al borde de la Card: si la Card recortara (overflow hidden),
 * el anillo sería invisible.
 */
export async function probeFocusRingClipping(page: Page): Promise<{
  overflow: string;
  ringVisible: boolean;
}> {
  return page.evaluate(() => {
    const probe = document.querySelector('[data-focus-probe]') as HTMLElement;
    const button = (
      probe.tagName === 'BUTTON' ? probe : probe.querySelector('button')
    ) as HTMLButtonElement;
    const card = probe.closest('aegis-card') as HTMLElement;
    button.focus();
    const cs = getComputedStyle(button);
    const cardCs = getComputedStyle(card);
    // El anillo se pinta con `outline`; si la Card recorta, no se vería.
    const width = parseFloat(cs.outlineWidth) || 0;
    const clipped = cardCs.overflowX === 'hidden' || cardCs.overflowY === 'hidden';
    return {
      overflow: `${cardCs.overflowX}/${cardCs.overflowY}`,
      ringVisible: width > 0 && !clipped,
    };
  });
}
