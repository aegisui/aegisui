import { describe, expect, it } from 'vitest';
import a11y from '../../../scripts/gates/a11y.mjs';
import contrast from '../../../scripts/gates/contrast.mjs';
import targetSize from '../../../scripts/gates/target-size.mjs';
import keyboard from '../../../scripts/gates/keyboard.mjs';
import visual from '../../../scripts/gates/visual.mjs';
import contracts from '../../../scripts/gates/contracts.mjs';

/**
 * Los 6 gates DOM de §9.2 (a11y, contrast, keyboard, target-size, visual,
 * contracts) ejercitados en las DOS direcciones sobre los fixtures (ADR-013):
 *
 *   - good/ -> el gate NO encuentra violaciones (sin falsos positivos)
 *   - bad/  -> el gate SÍ encuentra violaciones (sin falsos negativos)
 *
 * LOS DOS tests en verde. El de good/ prueba que el gate no da falsos positivos;
 * el de bad/ prueba que sigue cazando la violación deliberada. Si el de bad/ se
 * pone rojo, el raíl ha dejado de detectar y hay que enterarse en el acto.
 *
 * Es el mismo patrón de dos direcciones que las 11 reglas ESLint con RuleTester
 * (ver fixtures.spec.ts). El comando de CI de cada gate corre la misma lógica vía
 * scripts/gates/run.mjs; esto la cubre además en el job `test`.
 */

const gates = { a11y, contrast, 'target-size': targetSize, keyboard, visual, contracts };

describe('gates DOM de §9.2: dos direcciones sobre fixtures', () => {
  for (const [id, gate] of Object.entries(gates)) {
    describe(id, () => {
      it('good/: sin violaciones (no falsos positivos)', () => {
        expect(gate.good()).toEqual([]);
      });

      it('bad/: al menos una violación (no falsos negativos)', () => {
        expect(gate.bad().length).toBeGreaterThan(0);
      });
    });
  }
});
