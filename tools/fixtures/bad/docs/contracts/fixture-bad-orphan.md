# Contrato: Fixture Bad Orphan

> **Fixture deliberadamente incorrecto. No es un componente real ni un ejemplo
> a seguir.** Existe para que el gate `contracts` demuestre que caza la
> **segunda** dirección de la reconciliación (ADR-020).

## Qué viola, exactamente

Este contrato **no tiene componente** (`aegis-fixture-bad-orphan` no existe en
`tools/fixtures/bad/src/`) y **no declara estado pendiente**.

Es decir: no es trabajo en curso legítimo, es un **contrato muerto** — o un
contrato cuya implementación se borró, o uno al que se le olvidó el marcador.
El gate `contracts` debe cazarlo.

**Para pasar, este contrato tendría que hacer una de dos cosas:**

1. Declarar `**Estado:** implementación pendiente` (si la implementación
   está de camino, el caso normal de SPEC §6), o
2. desaparecer (si el componente nunca va a existir).

Deliberadamente **no hace ninguna de las dos**. Compárese con
`tools/fixtures/good/docs/contracts/fixture-good-pending.md`, que es el mismo
huérfano **sí** declarado y que por eso pasa: ese par good/bad es lo que
prueba que la asimetría de ADR-020 está viva en las dos direcciones.

## Por qué no lleva el marcador aquí

Si alguien "arregla" este fixture añadiéndole el marcador, el gate deja de
tener cobertura de la dirección 2 — y `badViolations()` lo detecta
explícitamente y falla con "dirección 2 sin cobertura". El fixture roto **es**
el test (ADR-009, ADR-013).
