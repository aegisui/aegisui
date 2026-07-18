import type { Page } from '@playwright/test';

/**
 * Datos de cada `<aegis-switch>` real de la galería.
 *
 * A diferencia del Button y del Input (donde lo que se mide es texto sobre
 * fondo), aquí lo que hay que medir son TRES pares de UI no textual (1.4.11):
 *
 *   - pulgar vs pista            -> el par que falla si alguien unifica el color
 *                                   del pulgar (1.16:1 con un pulgar blanco en off)
 *   - borde de pista vs lienzo   -> la señal de límite de la pista apagada
 *   - etiqueta vs lienzo         -> texto normal (4.5:1)
 *
 * El objetivo táctil se mide sobre el `<button>`, NO sobre la pista pintada: en
 * `sm` la pista es menor de 24px y el objetivo lo garantiza el min-*-size del
 * botón. Es el criterio correcto de 2.5.8 (objetivo, no ornamento).
 */
export interface SwitchCell {
  cell: string;
  checked: boolean;
  disabled: boolean;
  /** Color del pulgar. */
  thumbBg: string;
  /** Fondo de la pista (el "adyacente" del pulgar). */
  trackBg: string;
  /** Borde de la pista. */
  trackBorderColor: string;
  /** Fondo efectivo tras la pista (el lienzo donde vive el control). */
  canvasBg: string;
  /** Color y fondo del texto de la etiqueta. */
  labelColor: string;
  labelBg: string;
  /** Bounding box del <button> (objetivo de 2.5.8), no de la pista. */
  width: number;
  height: number;
}

export async function readSwitchCells(page: Page): Promise<SwitchCell[]> {
  return page.evaluate(() => {
    const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const opaque = (s: string) => {
      const n = rgb(s);
      return n.length < 4 || n[3] > 0;
    };
    /** Primer ancestro (incluido) con fondo opaco: el fondo REAL compuesto. */
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

    const scope = document.querySelector('[aria-label="Galería del Switch"]') ?? document;
    return [...scope.querySelectorAll('[data-cell]')].map((el) => {
      const button = (
        el.tagName === 'BUTTON' ? el : el.querySelector('button')
      ) as HTMLButtonElement;
      const track = el.querySelector('.aegis-switch__track') as HTMLElement;
      const thumb = el.querySelector('.aegis-switch__thumb') as HTMLElement;
      const label = el.querySelector('label') as HTMLLabelElement;
      const box = button.getBoundingClientRect();
      return {
        cell: el.getAttribute('data-cell') ?? '?',
        checked: button.getAttribute('aria-checked') === 'true',
        disabled: button.disabled,
        thumbBg: getComputedStyle(thumb).backgroundColor,
        trackBg: getComputedStyle(track).backgroundColor,
        trackBorderColor: getComputedStyle(track).borderTopColor,
        // El lienzo del control es el fondo efectivo del ancestro de la pista.
        canvasBg: effBg(track.parentElement),
        labelColor: getComputedStyle(label).color,
        labelBg: effBg(label),
        width: box.width,
        height: box.height,
      };
    });
  });
}
