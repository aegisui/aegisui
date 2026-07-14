# Contrato: Fixture Good

## Propósito

Fixture de regresión de los raíles de la Fase 1 (§13). No es un componente real
del catálogo: existe para demostrar, en las dos direcciones, que los gates
aceptan un componente correcto y rechazan uno roto (ver `tools/fixtures/bad/`).

## Selector

`<aegis-fixture-good>`

## Tokens que consume

- `--aegis-fixture-fg`
- `--aegis-fixture-bg`
- `--aegis-fixture-radius`
- `--aegis-fixture-focus-width`
- `--aegis-fixture-focus`

## Fuera de alcance

Todo. No es un componente de producto: no tiene estados, casos límite ni
criterios de aceptación reales.
