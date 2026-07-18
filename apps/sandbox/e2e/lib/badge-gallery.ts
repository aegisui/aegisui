import type { Page } from '@playwright/test';

/**
 * Datos de cada `<aegis-badge>` real de la galería.
 *
 * El par que importa es TEXTO SOBRE SU PROPIO TINTE, con umbral de **texto**
 * (4.5:1), no de UI (3:1): `font-size-xs`/`sm` están por debajo del umbral de
 * "texto grande", así que 3:1 sería el error fácil aquí.
 *
 * El BORDE se expone para el snapshot de `visual` pero **no** se verifica contra
 * 3:1: es decorativo (ADR-018). El Badge no es un control; su señal es el tinte
 * y su contenido es el texto.
 */
export interface BadgeCell {
  cell: string;
  variant: string;
  color: string;
  bg: string;
  borderColor: string;
  fontSize: string;
  paddingInline: string;
  /** Texto renderizado: lo usa la guarda de "el color no comunica solo". */
  text: string;
}

export async function readBadgeCells(page: Page): Promise<BadgeCell[]> {
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

    const scope = document.querySelector('[aria-label="Galería del Badge"]') ?? document;
    return [...scope.querySelectorAll('[data-cell]')].map((el) => {
      const cs = getComputedStyle(el);
      const cell = el.getAttribute('data-cell') ?? '?';
      return {
        cell,
        variant: cell.split('-')[0],
        color: cs.color,
        // El fondo del propio badge (su tinte), no el de la página.
        bg: effBg(el),
        borderColor: cs.borderTopColor,
        fontSize: cs.fontSize,
        paddingInline: cs.paddingInlineStart,
        text: (el.textContent ?? '').trim(),
      };
    });
  });
}
