/**
 * Rutas a los objetivos de los gates DOM. Los fixtures son objetivos de CI de
 * primera clase (ADR-013): no son solo entrada de tests unitarios, son lo que
 * cada gate de §9.2 analiza para demostrar sus dos direcciones.
 */
import { join } from 'node:path';
import { FIXTURES } from './util.mjs';

const goodDir = join(FIXTURES, 'good/src/lib/fixture-good');
const badDir = join(FIXTURES, 'bad/src/lib/fixture-bad');

export const rendered = {
  good: {
    light: join(goodDir, 'fixture-good.rendered.light.html'),
    dark: join(goodDir, 'fixture-good.rendered.dark.html'),
  },
  bad: {
    light: join(badDir, 'fixture-bad.rendered.light.html'),
    dark: join(badDir, 'fixture-bad.rendered.dark.html'),
  },
};

export const snapshots = {
  light: join(goodDir, '__snapshots__/visual.good.light.snap'),
  dark: join(goodDir, '__snapshots__/visual.good.dark.snap'),
};

/** Contrato de `good/`: fuente de verdad del teclado declarado. */
export const goodContract = join(FIXTURES, 'good/docs/contracts/fixture-good.md');
