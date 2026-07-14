# ADR-009: Fixtures good/bad como verificación de gates

## Contexto

Un gate que no tiene nada que testear pasa en verde, y ese verde no significa nada:
es la trampa clásica de CI. En la Fase 1 no hay componentes reales todavía, así que
los gates (11 reglas ESLint, `peer-floor`) no tendrían objetivos que analizar.

## Decisión

- `tools/fixtures/good/` es un componente mínimo **deliberadamente correcto**;
  `tools/fixtures/bad/` es el mismo componente **deliberadamente roto**, violando una
  a una las reglas de §7. `bad-tokens/` cubre en solitario el caso "contrato existe
  pero incompleto" de `tokens-declared-in-contract`. Para `peer-floor`,
  `peer-floor/{good,bad}.fesm.mjs` reproducen el FESM del spike (`minVersion` 17.1.0
  vs 22.0.0).
- Cada gate debe demostrar **las dos direcciones**: pasa sobre `good/`, falla con
  mensaje accionable sobre `bad/`. Un gate que solo demuestra que pasa no está
  terminado.
- `tools/fixtures/src/*.spec.ts` ejercita esto en CI vía RuleTester. Los fixtures se
  excluyen de `pnpm lint` (si no, `bad/` rompería el gate general a propósito) y se
  verifican con su propio harness. `tools/fixtures/eslint.fixtures.config.js` permite
  correr las reglas con el motor real de ESLint contra los fixtures y ver el rojo/verde.
- **Regla anti-verde-falso:** cualquier gate que no encuentre objetivos que analizar
  debe **fallar ruidosamente** ("no targets found"), nunca pasar en silencio
  (`peer-floor` lo hace; Vitest, con `passWithNoTests: false`).

## Consecuencias

- Los fixtures **no se publican y se quedan para siempre**: son el test de regresión
  de los raíles. El día que alguien afloje una regla, se ponen rojos.
- Verificar un raíl no requiere un componente real: el fixture es el objetivo.
- No cubren `contrast`/`a11y`/`target-size`/visual: esos gates necesitan tokens y
  componentes reales, y llegan en Fase 2/3.
