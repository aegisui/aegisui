/**
 * Gate `target-size` (§9.2, WCAG 2.2 AA 2.5.8). Todo elemento interactivo debe
 * medir al menos 24x24 px. Se lee del DOM renderizado la medida efectiva
 * (width/height o su min-*).
 *
 * Dos direcciones (ADR-013): `good/` mide 32x32; `bad/` mide 16x16. Si `bad()`
 * dejara de devolver violaciones, el gate ya no protege el tamaño mínimo.
 */
import { read, parseHtml, isInteractive } from './lib/util.mjs';
import { rendered } from './lib/fixtures.mjs';

const MIN_PX = 24;

/** px de una dimensión efectiva (`width`/`min-width`), o null si no se declara. */
function px(style, prop) {
  const raw = style[prop] ?? style[`min-${prop}`];
  if (!raw) {
    return null;
  }
  const m = /^(\d+(?:\.\d+)?)px$/.exec(raw.trim());
  return m ? Number(m[1]) : null;
}

function inspect(htmlPath) {
  const { elements } = parseHtml(read(htmlPath));
  const violations = [];
  for (const el of elements) {
    if (!isInteractive(el)) {
      continue;
    }
    const w = px(el.style, 'width');
    const h = px(el.style, 'height');
    if ((w !== null && w < MIN_PX) || (h !== null && h < MIN_PX)) {
      violations.push(
        `<${el.tag}> mide ${w ?? '?'}x${h ?? '?'} px (< ${MIN_PX}x${MIN_PX}). Agranda el objetivo interactivo.`,
      );
    }
  }
  return violations;
}

export default {
  id: 'target-size',
  phase: 3,
  badExpectation: 'elemento interactivo menor de 24x24 px',
  good: () => inspect(rendered.good.light),
  bad: () => inspect(rendered.bad.light),
};
