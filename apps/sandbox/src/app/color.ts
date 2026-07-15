/**
 * Utilidades de color para la demo de theming. La conversión HSL permite rotar el
 * TONO de la rampa jade conservando saturación y luminosidad de cada peldaño; el
 * contraste WCAG (misma fórmula que el gate `contrast`) alimenta el medidor en
 * vivo que avisa cuando un tono elegido rompería 4.5:1.
 */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = ((gn - bn) / d) % 6;
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) {
    rgb = [c, x, 0];
  } else if (hp < 2) {
    rgb = [x, c, 0];
  } else if (hp < 3) {
    rgb = [0, c, x];
  } else if (hp < 4) {
    rgb = [0, x, c];
  } else if (hp < 5) {
    rgb = [x, 0, c];
  } else {
    rgb = [c, 0, x];
  }
  const [r, g, b] = rgb;
  const m = l - c / 2;
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: string, bg: string): number {
  const hi = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const lo = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (hi + 0.05) / (lo + 0.05);
}
