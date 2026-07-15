/**
 * Gate `contrast` (§9.2, WCAG 2.2 AA 1.4.3 / 1.4.11). Dos objetivos, sin tocar el
 * `name:` del job:
 *
 * 1. FIXTURES (canario, ADR-013) — `good()`/`bad()` sobre el DOM renderizado:
 *    `good/` cumple en ambos temas (~17:1); `bad/` no llega (~2.5:1). Si `bad()`
 *    dejara de devolver violaciones, el cálculo de contraste se habría roto. Esta
 *    dirección invertida NO se toca al ampliar el gate: sigue siendo el test de
 *    regresión del propio gate.
 *
 * 2. CAPA SEMÁNTICA REAL (Fase 2) — `realPackagesViolations()`: resuelve todos los
 *    pares fg/bg con significado de `packages/tokens` y exige 4.5:1 (texto) y
 *    3:1 (UI) en light Y dark. Un token que no pasa deja el job en rojo. Es el
 *    entregable #4 de la Fase 2: la paleta no se mergea si no pasa contraste.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { read, parseHtml, contrastRatio, REPO_ROOT } from './lib/util.mjs';
import { rendered } from './lib/fixtures.mjs';

const AA_TEXT = 4.5;
const AA_UI = 3;

// --- 1. Fixtures renderizados (canario, dos direcciones) -----------------
function inspectTheme(htmlPath, theme) {
  const { elements } = parseHtml(read(htmlPath));
  const violations = [];
  for (const el of elements) {
    const fg = el.style.color;
    const bg = el.style.background || el.style['background-color'];
    if (!fg || !bg) {
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio < AA_TEXT) {
      violations.push(
        `[${theme}] <${el.tag}> ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 (< ${AA_TEXT}:1). Ajusta los tokens de color.`,
      );
    }
  }
  return violations;
}

function inspect(variant) {
  return [
    ...inspectTheme(rendered[variant].light, 'light'),
    ...inspectTheme(rendered[variant].dark, 'dark'),
  ];
}

// --- 2. Capa semántica real de packages/tokens ---------------------------
const TOKENS_SRC = join(REPO_ROOT, 'packages', 'tokens', 'src');

const readJson = (name) => JSON.parse(readFileSync(join(TOKENS_SRC, name), 'utf8'));

const at = (obj, path) => path.split('.').reduce((acc, k) => acc?.[k], obj);

/** `{color.jade.600}` -> hex primitivo. */
function resolveRef(primitives, ref) {
  const m = /^\{([^}]+)\}$/.exec(ref);
  const value = m && at(primitives, m[1]);
  if (typeof value !== 'string') {
    throw new Error(`referencia semántica sin destino: ${ref}`);
  }
  return value;
}

/** Hex de un token semántico `color.<path>` en un tema. */
function semanticHex(primitives, semantic, path, theme) {
  const token = at(semantic, `color.${path}`);
  const ref = token && token[theme];
  if (typeof ref !== 'string') {
    throw new Error(`token semántico color.${path}.${theme} inexistente`);
  }
  return resolveRef(primitives, ref);
}

/**
 * Pares fg/bg con SIGNIFICADO de la capa semántica. No es "todo contra todo":
 * cada regla es un emparejamiento que el sistema realmente produce (texto sobre
 * superficie, on-solid sobre el sólido del acento, texto/punto de estado sobre su
 * tinte y sobre el canvas). Refleja el mismo contrato que docs/adr/ADR-014.
 */
function semanticPairs() {
  const pairs = [];
  for (const surface of ['surface.canvas', 'surface.raised', 'surface.sunken']) {
    pairs.push(['text.strong', surface, AA_TEXT]);
    pairs.push(['text.muted', surface, AA_TEXT]);
  }
  pairs.push(['accent.on-solid', 'accent.solid', AA_TEXT]);
  pairs.push(['accent.text', 'surface.canvas', AA_TEXT]);
  pairs.push(['accent.text', 'surface.raised', AA_TEXT]);
  pairs.push(['accent.border', 'surface.canvas', AA_UI]);
  pairs.push(['accent.ring', 'surface.canvas', AA_UI]);
  for (const state of ['success', 'warning', 'danger', 'info']) {
    pairs.push([`state.${state}.text`, `state.${state}.bg`, AA_TEXT]);
    pairs.push([`state.${state}.text`, 'surface.canvas', AA_TEXT]);
    pairs.push([`state.${state}.point`, 'surface.canvas', AA_UI]);
    pairs.push([`state.${state}.point`, `state.${state}.bg`, AA_UI]);
  }
  return pairs;
}

export function realPackagesViolations() {
  const primitives = readJson('primitives.json');
  const semantic = readJson('semantic.json');
  const pairs = semanticPairs();

  // Anti-verde-falso: si no hay objetivos que analizar, fallar ruidosamente.
  if (pairs.length === 0) {
    return ['la capa semántica no expone ningún par fg/bg: nada que validar'];
  }

  const violations = [];
  for (const theme of ['light', 'dark']) {
    for (const [fg, bg, min] of pairs) {
      const ratio = contrastRatio(
        semanticHex(primitives, semantic, fg, theme),
        semanticHex(primitives, semantic, bg, theme),
      );
      if (ratio < min) {
        violations.push(
          `[${theme}] color.${fg} sobre color.${bg} = ${ratio.toFixed(2)}:1 (< ${min}:1). ` +
            `Un token de la capa semántica no pasa contraste: no se mergea (ADR-014).`,
        );
      }
    }
  }
  return violations;
}

export default {
  id: 'contrast',
  phase: 2,
  badExpectation: 'par fg/bg de texto por debajo de 4.5:1',
  good: () => inspect('good'),
  bad: () => inspect('bad'),
  realPackagesViolations,
};
