/**
 * Gate `coverage` (meta-check contrato -> objetivo).
 *
 * Qué agujero cierra. Los componentes reales SÍ se verifican: `apps/sandbox/e2e/`
 * corre axe, contraste, target-size y snapshots de estilos computados sobre los 5
 * componentes en ambos temas, y esos specs están cableados en los mismos jobs de
 * CI que los gates de fixtures. Lo que NO existe es nada que compruebe que las
 * variantes DECLARADAS en un contrato tengan objetivo: el contrato del Input
 * declaraba 16 snapshots representativos y solo 7 tenían historia, y ningún gate
 * lo echó de menos porque ninguno sabía qué debía existir.
 *
 * Fuente de verdad: la sección `## Matriz visual representativa` del contrato,
 * una tabla markdown donde cada fila es una variante que DEBE tener objetivo, y
 * cada fila nombra la historia concreta que la cubre.
 *
 * No necesita navegador ni Storybook levantado: los ids de historia se derivan
 * estáticamente de los `*.stories.ts` con la misma regla que usa Storybook
 * (`sanitize(title) + '--' + sanitize(kebab(export))`). La derivación está
 * verificada contra el `index.json` publicado: 31 de 31, sin diferencias.
 *
 * Estricto a propósito (SPEC §13): un contrato sin matriz es una VIOLACIÓN, no
 * un pase. Si pasara en verde, este gate sería el mismo verde-falso que viene a
 * combatir — dentro de la herramienta que lo combate.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { read, REPO_ROOT, FIXTURES } from './lib/util.mjs';

const CONTRACTS_DIR = join(REPO_ROOT, 'docs', 'contracts');
const UI_LIB = join(REPO_ROOT, 'packages', 'ui', 'src', 'lib');
const MATRIX_HEADING = /^##\s+Matriz visual representativa/;

/** Id de historia de Storybook entre backticks: `componentes-input--floating-inset`. */
const STORY_ID = /`([a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*)`/;

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
      rows.push({ id: cells[0], storyId: found ? found[1] : null });
    }
  }
  return rows;
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
  const violations = [];

  for (const contract of contracts) {
    const rows = parseMatrix(read(contract.path));

    if (rows === null) {
      violations.push(
        `${contract.name}.md no declara "## Matriz visual representativa": no se puede ` +
          `verificar que sus variantes tengan objetivo. Un contrato sin matriz declarada ` +
          `no es cobertura cero, es cobertura DESCONOCIDA.`,
      );
      continue;
    }
    if (rows.length === 0) {
      violations.push(`${contract.name}.md declara la matriz pero sin filas: nada que cubrir.`);
      continue;
    }

    for (const row of rows) {
      if (!row.storyId) {
        violations.push(
          `${contract.name}.md fila ${row.id} no nombra la historia que la cubre. ` +
            `Añade el id entre backticks (p. ej. \`componentes-${contract.name}--x\`): ` +
            `contar filas contra historias no demuestra que se cubra ESTA variante.`,
        );
      } else if (!existing.has(row.storyId)) {
        violations.push(
          `${contract.name}.md fila ${row.id} declara la historia \`${row.storyId}\`, ` +
            `que no existe: la variante no tiene objetivo que analizar.`,
        );
      }
    }
  }
  return violations;
}

// --- Canario propio (dos direcciones, ADR-013) ---------------------------
// `good/` declara matriz y `bad/` no. Sin este par el gate no tendría prueba de
// que su parser distingue "declarada" de "ausente".
const goodFixtureContract = join(FIXTURES, 'good/docs/contracts/fixture-good.md');
const badFixtureContract = join(FIXTURES, 'bad/docs/contracts/fixture-bad-orphan.md');

export default {
  id: 'coverage',
  phase: 3,
  badExpectation: 'contrato que no declara matriz visual',
  good: () =>
    parseMatrix(read(goodFixtureContract)) === null
      ? ['el contrato de good/ no declara matriz: el canario del gate está roto']
      : [],
  bad: () =>
    existsSync(badFixtureContract) && parseMatrix(read(badFixtureContract)) === null
      ? ['contrato sin matriz visual declarada']
      : [],
  realPackagesViolations,
};
