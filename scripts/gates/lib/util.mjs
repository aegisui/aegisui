/**
 * Utilidades compartidas por los gates DOM de §9.2 (a11y, contrast,
 * target-size, keyboard, visual). Cero dependencias: solo Node. Los gates son,
 * como las 11 reglas ESLint, analizadores estáticos propios; en Fase 1 su
 * objetivo son los fixtures (ADR-013), en Fase 3 pasarán a analizar además los
 * componentes reales renderizados.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** Raíz del repo: scripts/gates/lib -> ../../.. */
export const REPO_ROOT = join(here, '..', '..', '..');
export const FIXTURES = join(REPO_ROOT, 'tools', 'fixtures');

export const read = (path) => readFileSync(path, 'utf8');

// --- Color / contraste (WCAG 2.1) ---------------------------------------

/** `#rrggbb` -> `[r, g, b]` (0–255). */
export function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) {
    throw new Error(`color no reconocido (se espera #rrggbb): ${hex}`);
  }
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa WCAG de un `#rrggbb`. */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos `#rrggbb` (1..21). */
export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// --- HTML renderizado de los fixtures -----------------------------------

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

/** Parsea el atributo `style="a: 1; b: 2"` a un objeto `{ a: '1', b: '2' }`. */
export function parseStyle(styleAttr) {
  const out = {};
  for (const decl of String(styleAttr || '').split(';')) {
    const i = decl.indexOf(':');
    if (i === -1) {
      continue;
    }
    out[decl.slice(0, i).trim().toLowerCase()] = decl.slice(i + 1).trim();
  }
  return out;
}

/**
 * Parser mínimo de los fixtures renderizados. NO es un parser HTML general: los
 * fixtures son marcado fijo y bien formado, así que basta con extraer las
 * etiquetas de apertura y sus atributos. Devuelve `{ elements, ids, text }`.
 */
export function parseHtml(html) {
  const clean = stripComments(html);
  const elements = [];
  const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*\/?>/g;
  for (const m of clean.matchAll(tagRe)) {
    const tag = m[1].toLowerCase();
    const attrs = {};
    for (const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? '';
    }
    elements.push({ tag, attrs, style: parseStyle(attrs.style) });
  }
  const ids = new Set();
  for (const m of clean.matchAll(/\sid="([^"]*)"/g)) {
    ids.add(m[1]);
  }
  const text = clean
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { elements, ids, text };
}

/** Elementos que exponen semántica/rol interactivo nativo. */
const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea']);

export function isInteractive(el) {
  return INTERACTIVE_TAGS.has(el.tag) || el.attrs.tabindex === '0';
}

/** Nombre accesible de un elemento a partir de aria-label/labelledby/texto. */
export function accessibleName(el, doc) {
  if (el.attrs['aria-label'] && el.attrs['aria-label'].trim()) {
    return el.attrs['aria-label'].trim();
  }
  const labelledby = el.attrs['aria-labelledby'];
  if (labelledby) {
    // Solo cuenta si TODOS los ids referenciados existen en el documento.
    const refs = labelledby.trim().split(/\s+/);
    if (refs.every((id) => doc.ids.has(id))) {
      return refs.join(' ');
    }
    return '';
  }
  return doc.text;
}

/**
 * Forma canónica de un HTML para comparación visual determinista: sin
 * comentarios, sin espacios entre etiquetas y con espacios colapsados. Captura
 * marcado + estilos resueltos + texto, que es lo que distingue un render de otro.
 */
export function canonicalize(html) {
  return stripComments(html).replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}
