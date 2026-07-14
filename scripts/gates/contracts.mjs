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
import { reconcile } from '../check-contracts.mjs';

const goodContractsDir = join(FIXTURES, 'good/docs/contracts');
const goodCss = join(FIXTURES, 'good/src/lib/fixture-good/fixture-good.component.css');

const tokensIn = (text) => new Set(text.match(/--aegis-[a-z0-9-]+/gi) ?? []);

function goodViolations() {
  const violations = [];
  const { missingContract, orphanContract } = reconcile(
    join(FIXTURES, 'good/src'),
    goodContractsDir,
  );
  for (const n of missingContract) {
    violations.push(`componente sin contrato: ${n}`);
  }
  for (const n of orphanContract) {
    violations.push(`contrato sin componente: ${n}`);
  }
  // Cobertura de tokens: todo --aegis-* del CSS debe estar en el contrato.
  const declared = tokensIn(read(join(goodContractsDir, 'fixture-good.md')));
  for (const token of tokensIn(read(goodCss))) {
    if (!declared.has(token)) {
      violations.push(`token ${token} usado por el componente pero no declarado en su contrato`);
    }
  }
  return violations;
}

function badViolations() {
  // bad/ tiene componente (@Component aegis-fixture-bad) pero ningún contrato.
  const { componentNames, missingContract, orphanContract } = reconcile(
    join(FIXTURES, 'bad/src'),
    join(FIXTURES, 'bad/docs/contracts'),
  );
  const violations = [];
  for (const n of missingContract) {
    violations.push(`componente sin contrato: ${n}`);
  }
  for (const n of orphanContract) {
    violations.push(`contrato sin componente: ${n}`);
  }
  // Salvaguarda anti-verde-falso: si no encontró el componente, no hay nada que
  // reconciliar y el fixture estaría mal montado.
  if (componentNames.size === 0) {
    violations.push('no se encontró el componente de bad/: fixture mal montado');
  }
  return violations;
}

// Comprobación real "además de" los fixtures: cuando existan componentes en
// packages/ui (Fase 3) se reconcilian también, sin tocar el `name:` del job.
export function realPackagesViolations() {
  if (!existsSync('packages/ui/src')) {
    return [];
  }
  const { componentNames, missingContract, orphanContract } = reconcile(
    'packages/ui/src',
    'docs/contracts',
  );
  if (componentNames.size === 0) {
    return []; // aún no hay componentes reales: los fixtures son el objetivo.
  }
  return [
    ...missingContract.map((n) => `[packages/ui] componente sin contrato: ${n}`),
    ...orphanContract.map((n) => `[packages/ui] contrato sin componente: ${n}`),
  ];
}

export default {
  id: 'contracts',
  phase: 3,
  badExpectation: 'componente sin su contrato (correspondencia rota)',
  good: goodViolations,
  bad: badViolations,
};
