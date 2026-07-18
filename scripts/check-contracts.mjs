/**
 * Gate `contracts` (§9.2): todo componente de `ui` tiene contrato y todo contrato
 * tiene componente. Reconciliación bidireccional docs/contracts/ <-> packages/ui.
 *
 * La lógica se exporta (`reconcile`) para que el gate de fixtures la ejercite en
 * las dos direcciones (scripts/gates/contracts.mjs, ADR-013) y para que, cuando
 * lleguen componentes reales (Fase 3), se reconcilien A ELLOS ADEMÁS DE a los
 * fixtures.
 *
 * Anti-verde-falso (SPEC §13): si no hay ni componentes ni contratos, no hay nada
 * que reconciliar -> falla. El gate se vuelve real cuando existan componentes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function walk(dir, test) {
  const out = [];
  if (!existsSync(dir)) {
    return out;
  }
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, test));
    } else if (test(full)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Marca que un contrato aprobado declara, de forma legible por máquina, que su
 * implementación aún no existe. Es el estado NORMAL entre el PR del contrato y
 * el PR de la implementación (SPEC §6: el contrato se aprueba ANTES de escribir
 * código, así que todo contrato nace huérfano).
 *
 * No es un "warn" encubierto: declararlo es obligatorio para que el huérfano
 * pase, y el propio marcador se vuelve una violación en cuanto el componente
 * existe (`stalePending`). No puede pudrirse en el repo.
 */
export const PENDING_MARKER = /^\s*>?\s*\*\*Estado:\*\*\s*implementación pendiente\s*$/im;

/**
 * Reconcilia los componentes `aegis-*` de `uiSrc` con los contratos `.md` de
 * `contractsDir`. Devuelve los nombres y los desajustes en las dos direcciones,
 * más la clasificación de los huérfanos según declaren o no estado pendiente.
 * No decide política: eso lo hace `violations()`.
 */
export function reconcile(uiSrc, contractsDir) {
  const componentNames = new Set();
  for (const file of walk(uiSrc, (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(
      /@Component\s*\(\s*\{[\s\S]*?selector:\s*['"]aegis-([a-z0-9-]+)['"]/g,
    )) {
      componentNames.add(m[1]);
    }
  }

  const contractNames = new Set();
  const pendingContracts = new Set();
  if (existsSync(contractsDir)) {
    for (const entry of readdirSync(contractsDir)) {
      if (entry.endsWith('.md')) {
        const name = entry.replace(/\.md$/, '');
        contractNames.add(name);
        if (PENDING_MARKER.test(readFileSync(join(contractsDir, entry), 'utf8'))) {
          pendingContracts.add(name);
        }
      }
    }
  }

  const missingContract = [...componentNames].filter((n) => !contractNames.has(n)).sort();
  const orphanContract = [...contractNames].filter((n) => !componentNames.has(n)).sort();
  // Huérfano SIN declarar estado pendiente: contrato muerto o marcador olvidado.
  const orphanUndeclared = orphanContract.filter((n) => !pendingContracts.has(n));
  // El marcador sobrevivió a su propia implementación: hay que retirarlo.
  const stalePending = [...pendingContracts].filter((n) => componentNames.has(n)).sort();

  return {
    componentNames,
    contractNames,
    pendingContracts,
    missingContract,
    orphanContract,
    orphanUndeclared,
    stalePending,
  };
}

/**
 * POLÍTICA ÚNICA del gate `contracts`, compartida por sus tres llamantes
 * (`check-contracts.mjs` como CLI, el gate sobre `packages/ui`, y el canario de
 * fixtures good/bad). Una sola función para que no puedan divergir.
 *
 * Las dos direcciones NO son simétricas, y esa asimetría es la decisión de
 * ADR-020:
 *
 *  - **componente sin contrato** -> SIEMPRE violación. Es lo que protege el
 *    invariante de SPEC §6 ("ningún componente se implementa sin contrato
 *    aprobado"): código que se adelantó a su contrato. Es DEUDA.
 *  - **contrato sin componente** -> violación SALVO que el contrato declare
 *    `**Estado:** implementación pendiente`. Es TRABAJO EN CURSO: el estado
 *    normal y transitorio entre el PR del contrato y el de la implementación.
 *  - **marcador obsoleto** (contrato pendiente cuyo componente YA existe) ->
 *    SIEMPRE violación. Es lo que impide que la excepción se pudra: implementar
 *    obliga a retirar el marcador, así que ningún contrato puede quedarse
 *    "pendiente" para siempre y silenciar el raíl.
 *
 * Sigue siendo un raíl que BLOQUEA, no un aviso (CLAUDE.md): declarar el estado
 * es obligatorio y verificado, y la declaración caduca sola.
 */
export function violations({ prefix = '', ...r }) {
  const p = prefix ? `${prefix} ` : '';
  return [
    ...r.missingContract.map((n) => `${p}componente sin contrato: ${n}`),
    ...r.orphanUndeclared.map(
      (n) =>
        `${p}contrato sin componente: ${n} (si la implementación está pendiente, ` +
        `declara "**Estado:** implementación pendiente" en el contrato; si el ` +
        `componente ya no existe, borra el contrato)`,
    ),
    ...r.stalePending.map(
      (n) =>
        `${p}contrato ${n} sigue declarando "**Estado:** implementación pendiente" ` +
        `pero su componente YA existe: retira el marcador`,
    ),
  ];
}

function main() {
  const result = reconcile('packages/ui/src', 'docs/contracts');
  const { componentNames, contractNames, pendingContracts } = result;

  if (componentNames.size === 0 && contractNames.size === 0) {
    console.error(
      '❌ contracts: no hay componentes de ui ni contratos que reconciliar (no targets found).',
    );
    console.error(
      '   El gate se vuelve real cuando existan componentes (Fase 3). Falla a propósito (§13).',
    );
    process.exit(1);
  }

  const found = violations(result);
  if (found.length > 0) {
    console.error('❌ contracts: reconciliación contrato<->componente rota:');
    for (const v of found) {
      console.error(`   - ${v}`);
    }
    process.exit(1);
  }

  const pending = pendingContracts.size > 0 ? ` (${pendingContracts.size} pendiente(s))` : '';
  console.log(
    `✅ contracts: ${componentNames.size} componentes <-> ${contractNames.size} contratos, consistentes${pending}.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
