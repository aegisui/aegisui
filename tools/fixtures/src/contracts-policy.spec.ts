import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error -- script .mjs sin tipos (los gates son JS ESM, como las reglas ESLint)
import { reconcile, reconcilePrimitives, violations } from '../../../scripts/check-contracts.mjs';

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

/**
 * Regla de los PRIMITIVOS headless de `cdk` (ADR-023). `reconcile()` no sirve
 * aquí: busca `@Component` con selector `aegis-*`, y un primitivo de `cdk` es
 * una `@Directive` que nunca tendrá uno. Sin `reconcilePrimitives()`,
 * `docs/contracts/cdk/` sería un directorio que ningún raíl mira.
 *
 * Lo no trivial de la regla: un primitivo está cubierto por DOS sitios
 * legítimos —su contrato en `cdk/`, o el contrato del componente homónimo de
 * arriba (brain+skin en un solo documento, el caso de button/input/switch)—.
 */
function fakePrimitiveRepo({
  primitives = [],
  cdkContracts = {},
  uiContracts = [],
}: {
  primitives?: string[];
  cdkContracts?: Record<string, string>;
  uiContracts?: string[];
}) {
  const root = mkdtempSync(join(tmpdir(), 'aegis-primitives-'));
  dirs.push(root);
  const lib = join(root, 'lib');
  const cdkDocs = join(root, 'contracts', 'cdk');
  const uiDocs = join(root, 'contracts');
  mkdirSync(lib, { recursive: true });
  mkdirSync(cdkDocs, { recursive: true });

  for (const name of primitives) {
    mkdirSync(join(lib, name), { recursive: true });
    writeFileSync(
      join(lib, name, `${name}.ts`),
      `@Directive({ selector: '[aegis${name}]' }) export class P {}`,
    );
  }
  for (const [name, body] of Object.entries(cdkContracts)) {
    writeFileSync(join(cdkDocs, `${name}.md`), body);
  }
  for (const name of uiContracts) {
    writeFileSync(join(uiDocs, `${name}.md`), IMPLEMENTED);
  }
  return violations({
    ...reconcilePrimitives(lib, cdkDocs, uiDocs),
    subject: 'primitivo',
  });
}

describe('regla de primitivos headless del cdk (ADR-023)', () => {
  it('CASO 1: primitivo headless con su contrato en cdk/: sin violaciones', () => {
    expect(
      fakePrimitiveRepo({ primitives: ['overlay'], cdkContracts: { overlay: IMPLEMENTED } }),
    ).toEqual([]);
  });

  it('CASO 2: primitivo cubierto por el contrato del componente homónimo de arriba', () => {
    // Es button/input/switch: el brain vive en cdk y su contrato, arriba,
    // documentando brain y skin. Exigirle un contrato propio en cdk/ sería
    // inventar deuda y duplicar documentación.
    expect(fakePrimitiveRepo({ primitives: ['switch'], uiContracts: ['switch'] })).toEqual([]);
  });

  it('primitivo sin contrato en NINGÚN sitio: siempre violación (deuda, SPEC §6)', () => {
    const found = fakePrimitiveRepo({ primitives: ['overlay'] });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('primitivo sin contrato: overlay');
  });

  it('contrato en cdk/ sin primitivo y SIN declarar: violación', () => {
    const found = fakePrimitiveRepo({ cdkContracts: { overlay: IMPLEMENTED } });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('contrato sin primitivo: overlay');
  });

  it('contrato en cdk/ DECLARADO pendiente: pasa (trabajo en curso, ADR-020)', () => {
    expect(fakePrimitiveRepo({ cdkContracts: { overlay: PENDING } })).toEqual([]);
  });

  it('el marcador CADUCA solo también en el cdk', () => {
    const found = fakePrimitiveRepo({
      primitives: ['overlay'],
      cdkContracts: { overlay: PENDING },
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('retira el marcador');
  });

  it('un contrato de ui NO rescata a un contrato huérfano de cdk con otro nombre', () => {
    // La cobertura por contrato de arriba vale para el PRIMITIVO, no convierte
    // en válido un contrato de cdk/ que no tiene primitivo detrás.
    const found = fakePrimitiveRepo({
      cdkContracts: { listbox: IMPLEMENTED },
      uiContracts: ['listbox'],
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('contrato sin primitivo: listbox');
  });

  it('un directorio sin su <name>.ts no cuenta como primitivo', () => {
    // Evita que una carpeta de utilidades o un directorio a medias se cuele
    // como primitivo y exija contrato.
    const root = mkdtempSync(join(tmpdir(), 'aegis-primitives-'));
    dirs.push(root);
    mkdirSync(join(root, 'lib', 'utils'), { recursive: true });
    writeFileSync(join(root, 'lib', 'utils', 'helper.ts'), 'export const x = 1;');
    const r = reconcilePrimitives(join(root, 'lib'), join(root, 'nope'), join(root, 'nope'));
    expect([...r.primitiveNames]).toEqual([]);
  });
});
