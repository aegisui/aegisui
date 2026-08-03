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

## Teclado

Interacciones de teclado que el componente DEBE implementar. Es la fuente de
verdad del gate `keyboard`: cada tecla listada aquí tiene que estar manejada en
el DOM renderizado (`data-handles`). `good/` las maneja todas; `bad/` deja
`Space` sin implementar y por eso el gate lo caza.

- `Enter` → emite `activated`
- `Space` → emite `activated`

## Matriz visual representativa

Variantes que DEBEN tener objetivo. Es la fuente de verdad del gate `coverage`:
cada fila numerada es una variante declarada, y cada fila **nombra la historia
concreta** que la cubre. Contar filas contra historias no valdría — 2 filas y 2
historias daría verde aunque las historias cubrieran otras variantes.

Aquí cumple el papel de canario del parser: `good/` **sí** declara matriz y
`tools/fixtures/bad/docs/contracts/fixture-bad-orphan.md` **no**. Ese par es lo
que demuestra las dos direcciones del gate (ADR-013).

| # | Variante | Historia | Tema | Información distinta que aporta |
|---|---|---|---|---|
| 1 | default | `componentes-fixture-good--default` | light | Baseline: botón con nombre accesible y 32x32 |
| 2 | default | `componentes-fixture-good--default` | dark | El tema se aplica: el par fg/bg cambia |

## Fuera de alcance

Todo. No es un componente de producto: no tiene estados, casos límite ni
criterios de aceptación reales.
