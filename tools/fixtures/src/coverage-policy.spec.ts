import { describe, expect, it } from 'vitest';
// @ts-expect-error -- script .mjs sin tipos (los gates son JS ESM, como las reglas ESLint)
import {
  contractRenders,
  matrixViolations,
  parseMatrix,
} from '../../../scripts/gates/coverage.mjs';

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

/**
 * Exención de matriz visual para primitivos HEADLESS (ADR-023).
 *
 * La regla completa, y la razón de cada rama:
 *
 *   sin matriz y SIN declarar            -> violación (puede ser un olvido)
 *   declara headless y NO renderiza      -> exento (afirmación cierta)
 *   declara headless y SÍ renderiza      -> violación (PUERTA TRASERA)
 *   declara headless Y matriz a la vez   -> violación (incoherente)
 *
 * La tercera rama es la que impide que la exención sea una puerta trasera: sin
 * ella, cualquier componente con apariencia copiaría la línea y se saltaría el
 * gate entero. Y hace que la exención CADUQUE SOLA — el día que un primitivo
 * headless gane piel e historias, su marcador pasa a ser violación sin que
 * nadie tenga que acordarse.
 */
const SIN_MATRIZ = '# Contrato\n\nProsa, sin matriz.\n';
const headless = (name: string, existing: Set<string>, rows: unknown = null) =>
  matrixViolations(name, rows, existing, {
    headless: true,
    renders: contractRenders(name, existing),
  });

describe('exención headless del gate coverage (ADR-023)', () => {
  it('declara headless y no renderiza: exento, sin violaciones', () => {
    expect(headless('overlay', EXISTE)).toEqual([]);
  });

  it('PUERTA TRASERA: declara headless pero tiene historia propia -> violación', () => {
    const v = headless('x', EXISTE); // EXISTE tiene `componentes-x--a`
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('SÍ tiene render');
    expect(v[0]).toContain('no es una puerta trasera');
  });

  it('declara headless Y matriz a la vez: incoherente -> violación', () => {
    const rows = parseMatrix(contrato('`componentes-overlay--a`'));
    const v = headless('overlay', EXISTE, rows);
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('a la vez');
  });

  it('sin matriz y SIN declarar la exención: sigue siendo violación (el olvido no se perdona)', () => {
    const v = matrixViolations('overlay', parseMatrix(SIN_MATRIZ), EXISTE);
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('cobertura DESCONOCIDA');
    // El mensaje enseña la salida legítima, para que nadie invente la suya.
    expect(v[0]).toContain('primitivo headless, no renderiza');
  });

  it('contractRenders distingue por dueño del id, no por subcadena', () => {
    // `componentes-overlay-inner--a` NO pertenece a `overlay`: el separador de
    // historia es `--`. Sin esto, un nombre que sea prefijo de otro daría un
    // falso "sí renderiza" y bloquearía una exención legítima.
    expect(contractRenders('overlay', new Set(['componentes-overlay-inner--a']))).toBe(false);
    expect(contractRenders('overlay', new Set(['componentes-overlay--a']))).toBe(true);
  });
});
