import type { Page } from '@playwright/test';

/**
 * Aplica el tema en la app (conmuta `[data-theme]` en :root) y espera a que
 * asiente. Emula `prefers-reduced-motion: reduce`: el sandbox anima los colores
 * 240ms tras `no-preference`, así que sin esto `getComputedStyle` leería colores
 * A MITAD DE TRANSICIÓN (contraste falso). Con reduce, el cambio es instantáneo
 * (y los screenshots, deterministas).
 */
export async function applyTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: theme === 'dark' ? 'Oscuro' : 'Claro' }).click();
  await page.locator(`html[data-theme="${theme}"]`).waitFor();
}

/** Datos de color/medida de cada `<button>` real de la galería, leídos del navegador. */
export interface Cell {
  cell: string;
  disabled: boolean;
  loading: boolean;
  color: string;
  bg: string;
  width: number;
  height: number;
}

export async function readCells(page: Page): Promise<Cell[]> {
  return page.evaluate(() => {
    const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const opaque = (s: string) => {
      const n = rgb(s);
      return n.length < 4 || n[3] > 0;
    };
    // Fondo efectivo: primer ancestro con color de fondo opaco (resuelve `transparent`).
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
    return [...document.querySelectorAll('[data-cell]')].map((el) => {
      const btn = (el.tagName === 'BUTTON' ? el : el.querySelector('button')) as HTMLButtonElement;
      const cs = getComputedStyle(btn);
      const box = btn.getBoundingClientRect();
      return {
        cell: el.getAttribute('data-cell') ?? '?',
        disabled: btn.disabled,
        loading: btn.getAttribute('aria-busy') === 'true',
        color: cs.color,
        bg: effBg(btn),
        width: box.width,
        height: box.height,
      };
    });
  });
}
