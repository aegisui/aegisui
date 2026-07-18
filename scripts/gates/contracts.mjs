/**
 * Gate `contracts` (§9.2) sobre fixtures. Reconcilia componente <-> contrato en
 * las dos direcciones (ADR-013), reutilizando la misma `reconcile()` que corre
 * sobre `packages/ui` en Fase 3:
 *
 *  - good(): el componente `aegis-fixture-good` tiene su contrato y el contrato
 *    declara todos los tokens que el CSS consume. Consistente -> 0 violaciones.
 *  - bad(): el componente `aegis-fixture-bad` existe pero NO tiene contrato.
 *    Correspondencia rota -> violación. Si dejara de devolverla, el gate ya no
 *    exige contrato-antes-que-código.
 */
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { read, FIXTURES } from './lib/util.mjs';
import { reconcile, violations } from '../check-contracts.mjs';

const goodContractsDir = join(FIXTURES, 'good/docs/contracts');
const goodCss = join(FIXTURES, 'good/src/lib/fixture-good/fixture-good.component.css');

const tokensIn = (text) => new Set(text.match(/--aegis-[a-z0-9-]+/gi) ?? []);

function goodViolations() {
  const result = reconcile(join(FIXTURES, 'good/src'), goodContractsDir);
  const found = violations(result);

  // Salvaguarda anti-verde-falso: good/ incluye a propósito un contrato huérfano
  // que SÍ declara "**Estado:** implementación pendiente" (el estado normal de
  // SPEC §6 entre el PR del contrato y el de la implementación). Si esa
  // excepción dejara de reconocerse, o si el fixture perdiera ese contrato, el
  // canario ya no cubriría la asimetría de ADR-020.
  if (!result.pendingContracts.has('fixture-good-pending')) {
    found.push(
      'el fixture good/ ha perdido su contrato pendiente (fixture-good-pending): ' +
        'la excepción de ADR-020 se quedaría sin cobertura',
    );
  }

  // Cobertura de tokens: todo --aegis-* del CSS debe estar en el contrato.
  const declared = tokensIn(read(join(goodContractsDir, 'fixture-good.md')));
  for (const token of tokensIn(read(goodCss))) {
    if (!declared.has(token)) {
      found.push(`token ${token} usado por el componente pero no declarado en su contrato`);
    }
  }
  return found;
}

function badViolations() {
  // bad/ rompe la reconciliación en las DOS direcciones (ADR-020):
  //  - `aegis-fixture-bad` es un componente sin contrato (deuda).
  //  - `fixture-bad-orphan.md` es un contrato sin componente que NO declara
  //    estado pendiente (contrato muerto / marcador olvidado).
  const result = reconcile(join(FIXTURES, 'bad/src'), join(FIXTURES, 'bad/docs/contracts'));
  const found = violations(result);

  // Salvaguarda anti-verde-falso: las dos direcciones tienen que seguir cazadas.
  // Si alguien "arregla" el fixture, el gate deja de probar lo que dice probar.
  if (result.componentNames.size === 0) {
    found.push('no se encontró el componente de bad/: fixture mal montado');
  }
  if (result.missingContract.length === 0) {
    found.push('bad/ ya no tiene ningún componente sin contrato: dirección 1 sin cobertura');
  }
  if (result.orphanUndeclared.length === 0) {
    found.push('bad/ ya no tiene ningún contrato huérfano sin declarar: dirección 2 sin cobertura');
  }
  return found;
}

// Comprobación real "además de" los fixtures: cuando existan componentes en
// packages/ui (Fase 3) se reconcilian también, sin tocar el `name:` del job.
export function realPackagesViolations() {
  if (!existsSync('packages/ui/src')) {
    return [];
  }
  const result = reconcile('packages/ui/src', 'docs/contracts');
  if (result.componentNames.size === 0 && result.contractNames.size === 0) {
    return []; // aún no hay objetivos reales: los fixtures son el objetivo.
  }
  return violations({ ...result, prefix: '[packages/ui]' });
}

export default {
  id: 'contracts',
  phase: 3,
  badExpectation: 'componente sin contrato Y contrato huérfano sin declarar (ambas direcciones)',
  good: goodViolations,
  bad: badViolations,
  // La línea que faltaba: sin esto, `run.mjs` nunca reconciliaba packages/ui y el
  // gate pasaba en verde sin mirar los componentes reales (verde falso, SPEC §13).
  realPackagesViolations,
};
