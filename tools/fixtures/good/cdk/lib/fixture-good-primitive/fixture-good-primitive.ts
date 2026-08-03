import { Directive, input } from '@angular/core';

/**
 * Fixture "good", primitivo de `cdk` — CASO 1 de `reconcilePrimitives()`:
 * headless puro, sin componente `aegis-*` homónimo ni previsto. Su contrato
 * vive en `good/docs/contracts/cdk/fixture-good-primitive.md`.
 *
 * Es el caso real de `overlay` y `listbox`: los consumirán varias pieles y
 * nunca existirá un `<aegis-overlay>` que reconciliar. Sin esta regla, sus
 * contratos serían un punto ciego del gate.
 */
@Directive({
  selector: '[aegisFixtureGoodPrimitive]',
  exportAs: 'aegisFixtureGoodPrimitive',
})
export class FixtureGoodHeadlessPrimitive {
  readonly enabled = input(true);
}
