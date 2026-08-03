import { Directive, input } from '@angular/core';

/**
 * Fixture "good", primitivo de `cdk` — CASO 2 de `reconcilePrimitives()`: es el
 * brain del componente homónimo `aegis-fixture-good`, y su contrato es el de
 * arriba (`good/docs/contracts/fixture-good.md`), que documenta brain y skin a
 * la vez. NO necesita contrato propio en `docs/contracts/cdk/`.
 *
 * Es el caso real de `button`, `input` y `switch`. Si el gate dejara de
 * aceptarlo, inventaría deuda inexistente y exigiría duplicar documentación.
 */
@Directive({
  selector: '[aegisFixtureGood]',
  exportAs: 'aegisFixtureGood',
})
export class FixtureGoodPrimitive {
  readonly label = input('fixture');
}
