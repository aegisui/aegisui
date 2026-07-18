import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error -- script .mjs sin tipos (los gates son JS ESM, como las reglas ESLint)
import { reconcile, violations } from '../../../scripts/check-contracts.mjs';

/**
 * Política del gate `contracts` (ADR-020): las dos direcciones de la
 * reconciliación NO son simétricas.
 *
 *   - componente sin contrato        -> SIEMPRE violación (deuda, SPEC §6)
 *   - contrato huérfano SIN declarar -> violación (contrato muerto)
 *   - contrato huérfano declarado    -> pasa (trabajo en curso, transitorio)
 *   - marcador obsoleto              -> SIEMPRE violación (la excepción caduca)
 *
 * El canario de fixtures (gates.spec.ts) cubre las tres primeras sobre good/ y
 * bad/. El CUARTO caso —marcador obsoleto— no se puede montar como fixture
 * permanente sin romper las otras direcciones de bad/, así que se cubre aquí
 * sobre un repo de mentira en tmp. Es el caso que impide que la excepción se
 * pudra, o sea, el que hace que esto NO sea un raíl en modo aviso: merece test
 * propio.
 */

const dirs: string[] = [];

function fakeRepo({ components = [], contracts = {} }: Record<string, never> | any) {
  const root = mkdtempSync(join(tmpdir(), 'aegis-contracts-'));
  dirs.push(root);
  const src = join(root, 'src');
  const docs = join(root, 'contracts');
  mkdirSync(src, { recursive: true });
  mkdirSync(docs, { recursive: true });

  for (const name of components as string[]) {
    writeFileSync(
      join(src, `${name}.component.ts`),
      `@Component({ selector: 'aegis-${name}', standalone: true }) export class C {}`,
    );
  }
  for (const [name, body] of Object.entries(contracts as Record<string, string>)) {
    writeFileSync(join(docs, `${name}.md`), body);
  }
  return violations(reconcile(src, docs));
}

const PENDING = '# Contrato\n\n**Estado:** implementación pendiente\n';
const IMPLEMENTED = '# Contrato\n\nUn contrato normal, sin marcador.\n';

afterEach(() => {
  for (const d of dirs.splice(0)) {
    rmSync(d, { recursive: true, force: true });
  }
});

describe('política del gate contracts (ADR-020)', () => {
  it('componente + su contrato: sin violaciones', () => {
    expect(fakeRepo({ components: ['button'], contracts: { button: IMPLEMENTED } })).toEqual([]);
  });

  it('componente SIN contrato: siempre violación (deuda, SPEC §6)', () => {
    const found = fakeRepo({ components: ['button'], contracts: {} });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('componente sin contrato: button');
  });

  it('contrato huérfano SIN declarar: violación (contrato muerto)', () => {
    const found = fakeRepo({ components: [], contracts: { switch: IMPLEMENTED } });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('contrato sin componente: switch');
  });

  it('contrato huérfano DECLARADO pendiente: pasa (trabajo en curso)', () => {
    expect(fakeRepo({ components: [], contracts: { switch: PENDING } })).toEqual([]);
  });

  it('el marcador CADUCA solo: pendiente + componente ya existente es violación', () => {
    const found = fakeRepo({ components: ['switch'], contracts: { switch: PENDING } });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('retira el marcador');
  });

  it('el marcador solo vale en su forma exacta (no se cuela por prosa parecida)', () => {
    const casi = '# Contrato\n\nLa implementación está pendiente, ya llegará.\n';
    const found = fakeRepo({ components: [], contracts: { switch: casi } });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('contrato sin componente: switch');
  });

  it('varias direcciones a la vez se reportan todas, no solo la primera', () => {
    const found = fakeRepo({
      components: ['button', 'input'],
      contracts: { input: IMPLEMENTED, card: IMPLEMENTED, badge: PENDING },
    });
    // button sin contrato + card huérfano sin declarar. badge (pendiente) pasa.
    expect(found).toHaveLength(2);
    expect(found.join('\n')).toContain('componente sin contrato: button');
    expect(found.join('\n')).toContain('contrato sin componente: card');
  });
});
