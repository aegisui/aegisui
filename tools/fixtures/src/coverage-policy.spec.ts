import { describe, expect, it } from 'vitest';
// @ts-expect-error -- script .mjs sin tipos (los gates son JS ESM, como las reglas ESLint)
import { matrixViolations, parseMatrix } from '../../../scripts/gates/coverage.mjs';

/**
 * Política del gate `coverage`: las direcciones NO son simétricas, por el mismo
 * motivo de proceso que ADR-020.
 *
 *   fila sin historia nombrada           -> SIEMPRE violación
 *   fila con historia que existe         -> pasa
 *   fila con historia que NO existe      -> violación (variante prometida, sin cubrir)
 *   fila `(pendiente)`, historia ausente -> pasa (deuda declarada, transitoria)
 *   fila `(pendiente)`, historia EXISTE  -> SIEMPRE violación (marcador obsoleto)
 *
 * El canario de fixtures cubre "declara matriz" vs "no la declara" y la deuda
 * declarada. El caso del MARCADOR OBSOLETO no cabe como fixture permanente sin
 * romper las otras direcciones de `bad/`, así que se cubre aquí — igual que
 * ADR-020 hizo con su `stalePending`. Es el caso que impide que la excepción se
 * pudra: sin él, `(pendiente)` sería un `'warn'` disfrazado.
 */

const EXISTE = new Set(['componentes-x--a']);

/** Contrato de mentira con una matriz de una sola fila. */
const contrato = (celdaHistoria: string) => `# Contrato

## Matriz visual representativa

| # | Variante | Historia | Tema | Aporta |
|---|---|---|---|---|
| 1 | default | ${celdaHistoria} | light | lo que sea |

## Fuera de alcance
`;

const check = (celdaHistoria: string, existing: Set<string> = EXISTE) =>
  matrixViolations('x', parseMatrix(contrato(celdaHistoria)), existing);

describe('política del gate coverage (deuda declarada que caduca sola)', () => {
  it('fila con historia que existe: sin violaciones', () => {
    expect(check('`componentes-x--a`')).toEqual([]);
  });

  it('fila con historia que NO existe: violación (variante prometida y no cubierta)', () => {
    const v = check('`componentes-x--z`');
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/no existe/);
  });

  it('fila sin historia nombrada: siempre violación', () => {
    const v = check('default md');
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/no nombra la historia/);
  });

  it('deuda DECLARADA con la historia ausente: pasa (trabajo en curso)', () => {
    expect(check('`componentes-x--z` (pendiente)')).toEqual([]);
  });

  it('el marcador CADUCA solo: pendiente + historia ya existente es violación', () => {
    const v = check('`componentes-x--a` (pendiente)');
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/OBSOLETO/);
  });

  it('el marcador solo vale pegado al id, no suelto en la prosa de la fila', () => {
    // La fila MENCIONA "pendiente", pero no como marcador del id: no se concede.
    const v = check('`componentes-x--z` | queda pendiente de revisar');
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/no existe/);
  });

  it('un contrato sin matriz es cobertura DESCONOCIDA, no cobertura cero', () => {
    const v = matrixViolations('x', parseMatrix('# Contrato\n\nSin matriz.\n'), EXISTE);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/no declara/);
  });

  it('una matriz declarada pero vacía no pasa en silencio', () => {
    const vacia = '# Contrato\n\n## Matriz visual representativa\n\n| # | H |\n|---|---|\n';
    const v = matrixViolations('x', parseMatrix(vacia), EXISTE);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/sin filas/);
  });

  it('varias filas rotas se reportan todas, no solo la primera', () => {
    const md = `# Contrato

## Matriz visual representativa

| # | Variante | Historia | Tema | Aporta |
|---|---|---|---|---|
| 1 | a | \`componentes-x--z\` | light | x |
| 2 | b | sin historia | light | x |
| 3 | c | \`componentes-x--a\` (pendiente) | light | x |
`;
    expect(matrixViolations('x', parseMatrix(md), EXISTE)).toHaveLength(3);
  });
});
