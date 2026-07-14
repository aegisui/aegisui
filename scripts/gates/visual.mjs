/**
 * Gate `visual` (§9.2). Regresión visual determinista de los fixtures en light y
 * dark. En Fase 1 no hay navegador ni app real, así que el "render" es la forma
 * canónica del DOM renderizado (marcado + estilos resueltos + texto); el
 * baseline vive en `__snapshots__/`. En Fase 3 el objetivo pasa a ser el
 * screenshot del componente real contra el sandbox, sin tocar el `name:` del job
 * y conservando estos fixtures como regresión (ADR-013).
 *
 * Dos direcciones:
 *  - good(): el render de `good/` coincide con su baseline en ambos temas
 *    (sin regresión) y light != dark (el tema se aplica). Devuelve 0.
 *  - bad(): el diferenciador DETECTA que `bad/` difiere del baseline de `good/`
 *    en ambos temas. Devuelve las diferencias encontradas (> 0). Si dejara de
 *    devolverlas, el diferenciador se habría quedado "siempre igual" y ya no
 *    cazaría ninguna regresión.
 */
import { existsSync } from 'node:fs';
import { read, canonicalize } from './lib/util.mjs';
import { rendered, snapshots } from './lib/fixtures.mjs';

const THEMES = ['light', 'dark'];

function goodViolations() {
  const violations = [];
  for (const theme of THEMES) {
    const current = canonicalize(read(rendered.good[theme]));
    if (!existsSync(snapshots[theme])) {
      violations.push(
        `[${theme}] falta el baseline (${snapshots[theme]}). Genera el snapshot y revísalo antes de commitear.`,
      );
      continue;
    }
    if (current !== read(snapshots[theme]).trim()) {
      violations.push(
        `[${theme}] regresión visual: el render de good/ ya no coincide con su baseline.`,
      );
    }
  }
  if (canonicalize(read(rendered.good.light)) === canonicalize(read(rendered.good.dark))) {
    violations.push('light y dark son idénticos: el tema no se está aplicando al render.');
  }
  return violations;
}

function badDiffs() {
  const diffs = [];
  for (const theme of THEMES) {
    const baseline = existsSync(snapshots[theme]) ? read(snapshots[theme]).trim() : null;
    const current = canonicalize(read(rendered.bad[theme]));
    if (baseline !== null && current !== baseline) {
      diffs.push(`[${theme}] diff detectado: bad/ difiere del baseline de good/ (correcto).`);
    }
  }
  return diffs;
}

export default {
  id: 'visual',
  phase: 3,
  badExpectation: 'render que difiere del baseline (el diferenciador lo detecta)',
  good: goodViolations,
  bad: badDiffs,
};
