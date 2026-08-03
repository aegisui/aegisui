# Contrato: `FixtureGoodHeadlessPrimitive` (primitivo de fixture)

**Sin matriz visual:** primitivo headless, no renderiza

Exención de ADR-023, **declarada y legítima**: no existe historia ni componente
`fixture-good-primitive` en `packages/ui`, así que `contractRenders()` lo
confirma. Es la dirección verde del canario de la exención.

Contrato de un primitivo headless de `cdk` que **sí** existe
(`good/cdk/lib/fixture-good-primitive/`). Reconcilia por el CASO 1 de
`reconcilePrimitives()`: contrato en `docs/contracts/cdk/` ↔ primitivo en
`packages/cdk/src/lib/`, sin componente `aegis-*` de por medio.

No es un contrato de producto: es el objetivo permanente del gate `contracts`
para la dirección "primitivo con su contrato" (ADR-013).

## Teclado

Ninguna tecla gestionada.
