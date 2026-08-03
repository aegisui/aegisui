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
 * Reconcilia los PRIMITIVOS headless de `@aegisui/cdk` con sus contratos.
 *
 * Existe porque `reconcile()` no sirve para este caso: busca `@Component` con
 * selector `aegis-*`, y un primitivo de `cdk` es headless — es una `@Directive`
 * (`button[aegisSwitch]`) o un servicio, y NUNCA tendrá un `aegis-*` que
 * reconciliar. Sin esta función, `docs/contracts/cdk/` sería un directorio que
 * ningún raíl mira: un punto ciego. La respuesta correcta no es sacar esos
 * contratos de donde el gate llega, sino darle al gate la REGLA de ese caso.
 *
 * La clave de la regla, y lo que la hace no trivial: un primitivo puede estar
 * cubierto por DOS sitios distintos, y ambos son legítimos.
 *
 *  1. `docs/contracts/cdk/<name>.md` — primitivo headless puro, sin piel propia
 *     (p. ej. `overlay`: lo consumirán Select, Combobox, Popover y Tooltip; no
 *     existe ni existirá `<aegis-overlay>`).
 *  2. `docs/contracts/<name>.md` — primitivo que es el BRAIN de un componente
 *     homónimo, cuyo contrato único documenta brain y skin a la vez. Es el caso
 *     de `button`, `input` y `switch` hoy: su cerebro vive en `cdk` y su
 *     contrato, arriba. Exigirles un contrato en `cdk/` sería inventar deuda que
 *     no existe y duplicar documentación que ya está escrita en el sitio bueno.
 *
 * Las direcciones son ASIMÉTRICAS por el mismo motivo que en ADR-020, y el
 * marcado pendiente caduca igual:
 *
 *  - **primitivo sin contrato** (en ninguno de los dos sitios) -> SIEMPRE
 *    violación. Es el invariante de SPEC §6 aplicado al `cdk`.
 *  - **contrato en `cdk/` sin primitivo** -> violación SALVO que declare
 *    `**Estado:** implementación pendiente` (trabajo en curso, ADR-020).
 *  - **marcador obsoleto** (pendiente cuyo primitivo YA existe) -> SIEMPRE
 *    violación: implementar obliga a retirarlo.
 *
 * El nombre del primitivo es el del DIRECTORIO bajo `packages/cdk/src/lib/`
 * (`lib/overlay/overlay.ts` -> `overlay`), que es la convención real del
 * paquete y el único identificador estable: el selector de una directiva
 * (`button[aegisSwitch]`) no da un nombre de fichero utilizable.
 */
export function reconcilePrimitives(cdkLibDir, cdkContractsDir, uiContractsDir) {
  const primitiveNames = new Set();
  if (existsSync(cdkLibDir)) {
    for (const entry of readdirSync(cdkLibDir)) {
      const dir = join(cdkLibDir, entry);
      if (statSync(dir).isDirectory() && existsSync(join(dir, `${entry}.ts`))) {
        primitiveNames.add(entry);
      }
    }
  }

  const contractNames = new Set();
  const pendingContracts = new Set();
  if (existsSync(cdkContractsDir)) {
    for (const entry of readdirSync(cdkContractsDir)) {
      if (entry.endsWith('.md')) {
        const name = entry.replace(/\.md$/, '');
        contractNames.add(name);
        if (PENDING_MARKER.test(readFileSync(join(cdkContractsDir, entry), 'utf8'))) {
          pendingContracts.add(name);
        }
      }
    }
  }

  // Caso 2: el contrato del componente homónimo cubre también su brain.
  const uiContractNames = new Set();
  if (uiContractsDir && existsSync(uiContractsDir)) {
    for (const entry of readdirSync(uiContractsDir)) {
      if (entry.endsWith('.md')) {
        uiContractNames.add(entry.replace(/\.md$/, ''));
      }
    }
  }

  const covered = (n) => contractNames.has(n) || uiContractNames.has(n);
  const missingContract = [...primitiveNames].filter((n) => !covered(n)).sort();
  const orphanContract = [...contractNames].filter((n) => !primitiveNames.has(n)).sort();
  const orphanUndeclared = orphanContract.filter((n) => !pendingContracts.has(n));
  const stalePending = [...pendingContracts].filter((n) => primitiveNames.has(n)).sort();

  return {
    primitiveNames,
    contractNames,
    uiContractNames,
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
export function violations({ prefix = '', subject = 'componente', ...r }) {
  const p = prefix ? `${prefix} ` : '';
  return [
    ...r.missingContract.map((n) => `${p}${subject} sin contrato: ${n}`),
    ...r.orphanUndeclared.map(
      (n) =>
        `${p}contrato sin ${subject}: ${n} (si la implementación está pendiente, ` +
        `declara "**Estado:** implementación pendiente" en el contrato; si el ` +
        `${subject} ya no existe, borra el contrato)`,
    ),
    ...r.stalePending.map(
      (n) =>
        `${p}contrato ${n} sigue declarando "**Estado:** implementación pendiente" ` +
        `pero su ${subject} YA existe: retira el marcador`,
    ),
  ];
}

function main() {
  const result = reconcile('packages/ui/src', 'docs/contracts');
  const { componentNames, contractNames, pendingContracts } = result;

  // Los primitivos headless de `cdk` tienen su propia reconciliación, con la
  // regla de `reconcilePrimitives()`. Sin esto, `docs/contracts/cdk/` sería un
  // directorio que ningún raíl mira.
  const prim = reconcilePrimitives('packages/cdk/src/lib', 'docs/contracts/cdk', 'docs/contracts');

  if (
    componentNames.size === 0 &&
    contractNames.size === 0 &&
    prim.primitiveNames.size === 0 &&
    prim.contractNames.size === 0
  ) {
    console.error(
      '❌ contracts: no hay componentes de ui, primitivos de cdk ni contratos que reconciliar (no targets found).',
    );
    console.error(
      '   El gate se vuelve real cuando existan componentes (Fase 3). Falla a propósito (§13).',
    );
    process.exit(1);
  }

  const found = [
    ...violations(result),
    ...violations({ ...prim, subject: 'primitivo', prefix: '[cdk]' }),
  ];
  if (found.length > 0) {
    console.error('❌ contracts: reconciliación contrato<->componente rota:');
    for (const v of found) {
      console.error(`   - ${v}`);
    }
    process.exit(1);
  }

  const pending = pendingContracts.size > 0 ? ` (${pendingContracts.size} pendiente(s))` : '';
  const primPending =
    prim.pendingContracts.size > 0 ? ` (${prim.pendingContracts.size} pendiente(s))` : '';
  console.log(
    `✅ contracts: ${componentNames.size} componentes <-> ${contractNames.size} contratos, consistentes${pending}.`,
  );
  console.log(
    `✅ contracts [cdk]: ${prim.primitiveNames.size} primitivos <-> ${prim.contractNames.size} contratos en docs/contracts/cdk/, consistentes${primPending}.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
