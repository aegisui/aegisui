/**
 * Gate `coverage` (meta-check contrato -> objetivo).
 *
 * Qué agujero cierra. Los componentes reales SÍ se verifican: `apps/sandbox/e2e/`
 * corre axe, contraste, target-size y snapshots de estilos computados sobre los 5
 * componentes en ambos temas. Lo que NO existía es nada que comprobara que las
 * variantes DECLARADAS en un contrato tengan objetivo: el contrato del Input
 * declaraba 16 snapshots representativos y solo 7 tenían historia, y ningún gate
 * lo echó de menos porque ninguno sabía qué debía existir.
 *
 * La política es ASIMÉTRICA, igual que la del gate `contracts` (ADR-020) y por el
 * mismo motivo de proceso: bajo "contrato antes que código", toda variante nace
 * declarada y sin implementar. Sin la asimetría, `coverage` estaría rojo durante
 * el flujo NORMAL — y un rojo normalizado es un raíl muerto.
 *
 *   fila sin historia nombrada           -> SIEMPRE violación
 *   fila con historia que existe         -> pasa
 *   fila con historia que NO existe      -> violación (variante prometida, sin cubrir)
 *   fila `(pendiente)`, historia ausente -> pasa (deuda declarada, transitoria)
 *   fila `(pendiente)`, historia EXISTE  -> SIEMPRE violación (marcador obsoleto)
 *
 * El último caso es el que hace que esto NO sea un aviso disfrazado: el marcador
 * CADUCA SOLO. En cuanto la historia existe, dejarlo puesto es violación, así que
 * implementar OBLIGA a retirarlo. Nadie puede silenciar cobertura para siempre.
 *
 * No necesita navegador ni Storybook: los ids de historia se derivan
 * estáticamente de los `*.stories.ts` con la misma regla que usa Storybook.
 * Verificado contra el `index.json` publicado: 31 de 31, sin diferencias.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { read, REPO_ROOT, FIXTURES } from './lib/util.mjs';

const CONTRACTS_DIR = join(REPO_ROOT, 'docs', 'contracts');
const UI_LIB = join(REPO_ROOT, 'packages', 'ui', 'src', 'lib');
const MATRIX_HEADING = /^##\s+Matriz visual representativa/;

/**
 * Id de historia entre backticks, con el marcador de deuda OPCIONAL pegado a él:
 *
 *     `componentes-input--floating-inset`
 *     `componentes-input--floating-inset` (pendiente)
 *
 * El marcador va ligado al id, no suelto en la fila: así una fila que MENCIONE
 * la palabra "pendiente" en su prosa no se cuela como deuda declarada. Mismo
 * criterio que ADR-020 con `**Estado:** implementación pendiente`: la excepción
 * se pide en una forma exacta, o no se concede.
 */
const STORY_ID = /`([a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*)`(\s*\(pendiente\))?/;

// --- Ids de historia derivados del fuente (sin navegador) ----------------

/** Misma normalización que `@storybook/csf`. */
const sanitize = (s) =>
  s
    .toLowerCase()
    .replace(/[ ’'"]/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const kebab = (s) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2');

/** Ids de todas las historias declaradas en `packages/ui/**\/*.stories.ts`. */
export function declaredStoryIds() {
  const ids = new Set();
  if (!existsSync(UI_LIB)) {
    return ids;
  }
  for (const dir of readdirSync(UI_LIB, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const file = join(UI_LIB, dir.name, `${dir.name}.stories.ts`);
    if (!existsSync(file)) {
      continue;
    }
    const src = readFileSync(file, 'utf8');
    const title = /title:\s*'([^']+)'/.exec(src)?.[1];
    if (!title) {
      continue;
    }
    for (const m of src.matchAll(/^export const (\w+)\s*:\s*Story/gm)) {
      ids.add(`${sanitize(title)}--${sanitize(kebab(m[1]))}`);
    }
  }
  return ids;
}

// --- Parseo de la matriz -------------------------------------------------

/**
 * Filas de la matriz de un contrato. `null` si el contrato no declara matriz.
 *
 * Cada fila DEBE nombrar la historia que la cubre. Comparar solo el NÚMERO de
 * filas contra el número de historias sería un verde-falso esperando a ocurrir:
 * 16 filas y 16 historias daría verde aunque las 16 historias cubrieran otras
 * variantes. La única comprobación que no se puede engañar es nombrar el
 * objetivo concreto.
 */
export function parseMatrix(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => MATRIX_HEADING.test(l));
  if (start === -1) {
    return null;
  }
  const rows = [];
  let inTable = false;
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) {
      break; // siguiente sección
    }
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      continue;
    }
    if (/^\|[\s|:-]+\|$/.test(trimmed)) {
      inTable = true; // separador de cabecera
      continue;
    }
    if (!inTable) {
      continue; // fila de cabecera
    }
    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    if (cells.length >= 2 && /^\d+$/.test(cells[0])) {
      const found = STORY_ID.exec(trimmed);
      rows.push({
        id: cells[0],
        storyId: found ? found[1] : null,
        pending: Boolean(found?.[2]),
      });
    }
  }
  return rows;
}

// --- LA política, en una sola función ------------------------------------

/**
 * Violaciones de un contrato. Es el ÚNICO sitio donde vive la política: la usan
 * el gate sobre `docs/contracts` y el canario de fixtures. ADR-020 aprendió por
 * las malas que dos caminos que pueden divergir, divergen.
 *
 * @param {string} name nombre del contrato (para los mensajes)
 * @param {ReturnType<parseMatrix>} rows filas, o `null` si no declara matriz
 * @param {Set<string>} existing ids de historia que existen de verdad
 */
export function matrixViolations(name, rows, existing) {
  if (rows === null) {
    return [
      `${name}.md no declara "## Matriz visual representativa": no se puede ` +
        `verificar que sus variantes tengan objetivo. Un contrato sin matriz declarada ` +
        `no es cobertura cero, es cobertura DESCONOCIDA.`,
    ];
  }
  if (rows.length === 0) {
    return [`${name}.md declara la matriz pero sin filas: nada que cubrir.`];
  }

  const violations = [];
  for (const row of rows) {
    if (!row.storyId) {
      violations.push(
        `${name}.md fila ${row.id} no nombra la historia que la cubre. ` +
          `Añade el id entre backticks (p. ej. \`componentes-${name}--x\`): ` +
          `contar filas contra historias no demuestra que se cubra ESTA variante.`,
      );
      continue;
    }

    const exists = existing.has(row.storyId);

    // El marcador CADUCA SOLO: con la historia ya existente, dejarlo puesto es
    // violación. Implementar OBLIGA a retirarlo. Sin esta rama, `(pendiente)`
    // sería un `'warn'` disfrazado y podría silenciar cobertura para siempre.
    if (row.pending && exists) {
      violations.push(
        `${name}.md fila ${row.id}: marcador \`(pendiente)\` OBSOLETO — la historia ` +
          `\`${row.storyId}\` ya existe. Retíralo: la excepción sobrevivió a su motivo.`,
      );
      continue;
    }

    // Deuda DECLARADA: estado normal y transitorio entre el PR del contrato y el
    // de su implementación (SPEC §6, mismo motivo de proceso que ADR-020).
    if (row.pending) {
      continue;
    }

    if (!exists) {
      violations.push(
        `${name}.md fila ${row.id} declara la historia \`${row.storyId}\`, que no ` +
          `existe: la variante no tiene objetivo que analizar. Si la implementación ` +
          `está de camino, decláralo con \`${row.storyId}\` (pendiente).`,
      );
    }
  }
  return violations;
}

// --- Objetivos reales ----------------------------------------------------

function realContracts() {
  if (!existsSync(CONTRACTS_DIR)) {
    return [];
  }
  return readdirSync(CONTRACTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ name: f.replace(/\.md$/, ''), path: join(CONTRACTS_DIR, f) }));
}

export function realPackagesViolations() {
  const contracts = realContracts();
  if (contracts.length === 0) {
    return ['no hay contratos en docs/contracts: nada que verificar (anti-verde-falso).'];
  }
  const existing = declaredStoryIds();
  if (existing.size === 0) {
    return ['no se derivó ninguna historia de packages/ui: sin objetivos que emparejar.'];
  }
  return contracts.flatMap((c) => matrixViolations(c.name, parseMatrix(read(c.path)), existing));
}

// --- Canario propio (dos direcciones, ADR-013) ---------------------------
// `good/` declara matriz con las dos formas que deben PASAR: filas cubiertas y
// una fila de deuda declarada. `bad/` no declara matriz. El caso del marcador
// OBSOLETO no cabe aquí sin romper las otras direcciones de bad/, así que va en
// `tools/fixtures/src/coverage-policy.spec.ts` sobre un repo temporal — mismo
// reparto que ADR-020 hizo con su `stalePending`.
const goodFixtureContract = join(FIXTURES, 'good/docs/contracts/fixture-good.md');
const badFixtureContract = join(FIXTURES, 'bad/docs/contracts/fixture-bad-orphan.md');

/** Historias que el canario finge que existen (el fixture no está en Storybook). */
const FIXTURE_STORIES = new Set(['componentes-fixture-good--default']);

export default {
  id: 'coverage',
  phase: 3,
  badExpectation: 'contrato que no declara matriz visual',
  good: () =>
    matrixViolations('fixture-good', parseMatrix(read(goodFixtureContract)), FIXTURE_STORIES),
  bad: () =>
    existsSync(badFixtureContract)
      ? matrixViolations(
          'fixture-bad-orphan',
          parseMatrix(read(badFixtureContract)),
          FIXTURE_STORIES,
        )
      : [],
  realPackagesViolations,
};
