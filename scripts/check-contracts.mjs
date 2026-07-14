/**
 * Gate `contracts` (§9.2): todo componente de `ui` tiene contrato y todo contrato
 * tiene componente. Reconciliación bidireccional docs/contracts/ <-> packages/ui.
 *
 * Anti-verde-falso (SPEC §13): si no hay ni componentes ni contratos, no hay nada
 * que reconciliar -> falla. El gate se vuelve real cuando existan componentes
 * (Fase 3).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, test) {
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

const componentNames = new Set();
for (const file of walk('packages/ui/src', (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts'))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(
    /@Component\s*\(\s*\{[\s\S]*?selector:\s*['"]aegis-([a-z0-9-]+)['"]/g,
  )) {
    componentNames.add(m[1]);
  }
}

const contractNames = new Set();
if (existsSync('docs/contracts')) {
  for (const entry of readdirSync('docs/contracts')) {
    if (entry.endsWith('.md')) {
      contractNames.add(entry.replace(/\.md$/, ''));
    }
  }
}

if (componentNames.size === 0 && contractNames.size === 0) {
  console.error(
    '❌ contracts: no hay componentes de ui ni contratos que reconciliar (no targets found).',
  );
  console.error(
    '   El gate se vuelve real cuando existan componentes (Fase 3). Falla a propósito (§13).',
  );
  process.exit(1);
}

const missingContract = [...componentNames].filter((n) => !contractNames.has(n)).sort();
const orphanContract = [...contractNames].filter((n) => !componentNames.has(n)).sort();

if (missingContract.length > 0 || orphanContract.length > 0) {
  if (missingContract.length > 0) {
    console.error(
      `❌ contracts: componentes sin contrato (docs/contracts/<name>.md): ${missingContract.join(', ')}`,
    );
  }
  if (orphanContract.length > 0) {
    console.error(`❌ contracts: contratos sin componente: ${orphanContract.join(', ')}`);
  }
  process.exit(1);
}

console.log(
  `✅ contracts: ${componentNames.size} componentes <-> ${contractNames.size} contratos, consistentes.`,
);
