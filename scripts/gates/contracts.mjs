/**
 * Gate `contracts` (§9.2) sobre fixtures. Reconcilia en las dos direcciones
 * (ADR-013) y con DOS reglas distintas, reutilizando las mismas funciones que
 * corren sobre los paquetes reales:
 *
 *  1. `reconcile()` — componentes de `ui`: `@Component` con selector `aegis-*`
 *     <-> `docs/contracts/*.md`. Política asimétrica de ADR-020.
 *  2. `reconcilePrimitives()` — primitivos headless de `cdk`:
 *     `packages/cdk/src/lib/<name>/` <-> `docs/contracts/cdk/<name>.md`, o bien
 *     el contrato del componente homónimo de arriba cuando el primitivo es su
 *     brain (button/input/switch). Sin esta segunda regla, `docs/contracts/cdk/`
 *     sería un directorio que ningún raíl mira (ADR-023).
 *
 *  - good(): todo reconcilia y el contrato declara los tokens que el CSS usa.
 *  - bad(): las CUATRO direcciones rotas (componente sin contrato, contrato
 *    huérfano sin declarar, y las dos equivalentes en el cdk).
 *  - fixtureCoverage(): que los fixtures SIGAN conteniendo esos objetivos. Canal
 *    aparte y siempre bloqueante — ver su docstring: dentro de `bad()` estas
 *    comprobaciones eran inoperantes.
 */
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { read, FIXTURES } from './lib/util.mjs';
import { reconcile, reconcilePrimitives, violations } from '../check-contracts.mjs';

const goodContractsDir = join(FIXTURES, 'good/docs/contracts');
const goodCss = join(FIXTURES, 'good/src/lib/fixture-good/fixture-good.component.css');

const tokensIn = (text) => new Set(text.match(/--aegis-[a-z0-9-]+/gi) ?? []);

const goodPrimitives = () =>
  reconcilePrimitives(
    join(FIXTURES, 'good/cdk/lib'),
    join(goodContractsDir, 'cdk'),
    goodContractsDir,
  );

const badPrimitives = () =>
  reconcilePrimitives(
    join(FIXTURES, 'bad/cdk/lib'),
    join(FIXTURES, 'bad/docs/contracts/cdk'),
    join(FIXTURES, 'bad/docs/contracts'),
  );

function goodViolations() {
  const found = violations(reconcile(join(FIXTURES, 'good/src'), goodContractsDir));

  // Cobertura de tokens: todo --aegis-* del CSS debe estar en el contrato.
  const declared = tokensIn(read(join(goodContractsDir, 'fixture-good.md')));
  for (const token of tokensIn(read(goodCss))) {
    if (!declared.has(token)) {
      found.push(`token ${token} usado por el componente pero no declarado en su contrato`);
    }
  }

  // Primitivos headless de `cdk`: misma dirección "good", regla distinta
  // (`reconcilePrimitives`). Cubre los DOS casos legítimos de cobertura.
  found.push(...violations({ ...goodPrimitives(), subject: 'primitivo', prefix: '[cdk]' }));
  return found;
}

function badViolations() {
  // bad/ rompe la reconciliación en las DOS direcciones (ADR-020):
  //  - `aegis-fixture-bad` es un componente sin contrato (deuda).
  //  - `fixture-bad-orphan.md` es un contrato sin componente que NO declara
  //    estado pendiente (contrato muerto / marcador olvidado).
  // Y en el cdk, otras dos:
  //  - `fixture-bad-primitive` existe en código y no tiene contrato en NINGÚN
  //    sitio (ni en cdk/, ni arriba): deuda de SPEC §6 en el cdk.
  //  - `fixture-bad-primitive-orphan.md` es un contrato sin primitivo que NO
  //    declara estado pendiente.
  return [
    ...violations(reconcile(join(FIXTURES, 'bad/src'), join(FIXTURES, 'bad/docs/contracts'))),
    ...violations({ ...badPrimitives(), subject: 'primitivo', prefix: '[cdk]' }),
  ];
}

/**
 * Salud de los fixtures: ¿siguen conteniendo los objetivos que este gate dice
 * analizar? Va por el canal `fixtureCoverage()` de `run.mjs`, que SIEMPRE bloquea.
 *
 * Antes vivían dentro de `bad()`, y ahí eran INOPERANTES: `run.mjs` solo exige
 * que `bad()` devuelva algo no vacío, así que una salvaguarda empujada ahí se
 * contaba como "violación detectada" y el gate salía VERDE precisamente cuando
 * avisaba de haber perdido cobertura. Se descubrió saboteando un fixture a
 * propósito y comprobando que el gate no se inmutaba.
 */
export function fixtureCoverage() {
  const gaps = [];
  const good = reconcile(join(FIXTURES, 'good/src'), goodContractsDir);
  const goodPrim = goodPrimitives();
  const bad = reconcile(join(FIXTURES, 'bad/src'), join(FIXTURES, 'bad/docs/contracts'));
  const badPrim = badPrimitives();

  // good/ incluye a propósito un contrato huérfano que SÍ declara estado
  // pendiente (el estado normal de SPEC §6). Si se perdiera, la asimetría de
  // ADR-020 se quedaría sin canario.
  if (!good.pendingContracts.has('fixture-good-pending')) {
    gaps.push(
      'good/ ha perdido su contrato pendiente (fixture-good-pending): ' +
        'la excepción de ADR-020 se queda sin cobertura',
    );
  }
  if (!goodPrim.primitiveNames.has('fixture-good-primitive')) {
    gaps.push('good/ ha perdido su primitivo headless: el CASO 1 del cdk se queda sin cobertura');
  }
  if (!goodPrim.primitiveNames.has('fixture-good')) {
    gaps.push(
      'good/ ha perdido el primitivo homónimo del componente: el CASO 2 del cdk ' +
        '(contrato de arriba que cubre brain+skin, como button/input/switch) se queda sin cobertura',
    );
  }
  if (!goodPrim.pendingContracts.has('fixture-good-primitive-pending')) {
    gaps.push(
      'good/ ha perdido su contrato de primitivo pendiente: la excepción de ' +
        'ADR-020 aplicada al cdk se queda sin cobertura',
    );
  }

  // bad/ tiene que seguir rompiendo las cuatro direcciones. Si alguien
  // "arregla" el fixture, el gate deja de probar lo que dice probar.
  if (bad.componentNames.size === 0) {
    gaps.push('no se encontró el componente de bad/: fixture mal montado');
  }
  if (bad.missingContract.length === 0) {
    gaps.push('bad/ ya no tiene ningún componente sin contrato: dirección 1 sin cobertura');
  }
  if (bad.orphanUndeclared.length === 0) {
    gaps.push('bad/ ya no tiene ningún contrato huérfano sin declarar: dirección 2 sin cobertura');
  }
  if (badPrim.primitiveNames.size === 0) {
    gaps.push('no se encontró el primitivo de bad/cdk: fixture mal montado');
  }
  if (badPrim.missingContract.length === 0) {
    gaps.push('bad/ ya no tiene ningún primitivo sin contrato: dirección 1 del cdk sin cobertura');
  }
  if (badPrim.orphanUndeclared.length === 0) {
    gaps.push(
      'bad/ ya no tiene ningún contrato de primitivo huérfano sin declarar: ' +
        'dirección 2 del cdk sin cobertura',
    );
  }
  return gaps;
}

// Comprobación real "además de" los fixtures: cuando existan componentes en
// packages/ui (Fase 3) se reconcilian también, sin tocar el `name:` del job.
export function realPackagesViolations() {
  const found = [];

  if (existsSync('packages/ui/src')) {
    const result = reconcile('packages/ui/src', 'docs/contracts');
    // aún no hay objetivos reales: los fixtures son el objetivo.
    if (result.componentNames.size > 0 || result.contractNames.size > 0) {
      found.push(...violations({ ...result, prefix: '[packages/ui]' }));
    }
  }

  // Primitivos headless de `cdk` <-> `docs/contracts/cdk/`. Sin esto, ese
  // directorio no lo miraría ningún raíl: exactamente el punto ciego que
  // `reconcilePrimitives()` viene a tapar.
  if (existsSync('packages/cdk/src/lib')) {
    const prim = reconcilePrimitives(
      'packages/cdk/src/lib',
      'docs/contracts/cdk',
      'docs/contracts',
    );
    if (prim.primitiveNames.size > 0 || prim.contractNames.size > 0) {
      found.push(...violations({ ...prim, subject: 'primitivo', prefix: '[packages/cdk]' }));
    }
  }

  return found;
}

export default {
  id: 'contracts',
  phase: 3,
  badExpectation:
    'componente sin contrato Y contrato huérfano sin declarar, en ui Y en cdk (cuatro direcciones)',
  good: goodViolations,
  bad: badViolations,
  fixtureCoverage,
  // La línea que faltaba: sin esto, `run.mjs` nunca reconciliaba packages/ui y el
  // gate pasaba en verde sin mirar los componentes reales (verde falso, SPEC §13).
  realPackagesViolations,
};
