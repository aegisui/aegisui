import { Directive } from '@angular/core';

/**
 * Fixture "bad", primitivo de `cdk`: existe en el código pero **no tiene
 * contrato en ningún sitio** — ni en `bad/docs/contracts/cdk/` ni en
 * `bad/docs/contracts/`. Es código que se adelantó a su contrato, la deuda que
 * SPEC §6 prohíbe, aplicada al `cdk`.
 *
 * Es el objetivo rojo permanente de la dirección 1 de `reconcilePrimitives()`.
 * No se corrige: si alguien le escribe un contrato, el gate deja de probar que
 * caza esta violación (§13).
 */
@Directive({
  selector: '[aegisFixtureBadPrimitive]',
})
export class FixtureBadPrimitive {}
