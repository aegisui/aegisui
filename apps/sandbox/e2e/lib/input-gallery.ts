import type { Page } from '@playwright/test';

/** Datos de color/medida/borde de cada `<input>` real de la galería. */
export interface InputCell {
  cell: string;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  color: string;
  bg: string;
  borderColor: string;
  width: number;
  height: number;
}

export async function readInputCells(page: Page): Promise<InputCell[]> {
  return page.evaluate(() => {
    const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const opaque = (s: string) => {
      const n = rgb(s);
      return n.length < 4 || n[3] > 0;
    };
    const effBg = (el: Element): string => {
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
    const scope = document.querySelector('[aria-label="Galería del Input"]') ?? document;
    return [...scope.querySelectorAll('[data-cell]')].map((el) => {
      const field = (el.tagName === 'INPUT' ? el : el.querySelector('input')) as HTMLInputElement;
      const cs = getComputedStyle(field);
      const box = field.getBoundingClientRect();
      return {
        cell: el.getAttribute('data-cell') ?? '?',
        disabled: field.disabled,
        readonly: field.readOnly,
        invalid: field.getAttribute('aria-invalid') === 'true',
        color: cs.color,
        bg: effBg(field),
        borderColor: cs.borderTopColor,
        width: box.width,
        height: box.height,
      };
    });
  });
}
