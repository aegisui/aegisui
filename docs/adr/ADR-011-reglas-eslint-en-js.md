# ADR-011: Reglas ESLint propias en JS ESM (no TS)

## Contexto

Las 11 reglas de §7 son el producto y viven en `tools/eslint-rules/`. El SPEC fija el
nombre del config del repo como `eslint.config.js`, que ESLint importa **al arrancar**
para poder lintar. Si las reglas fueran TypeScript, `eslint.config.js` tendría que
importar `.ts`, lo que exige un loader/transpilación **antes** de poder lintar
(problema huevo-gallina: para lintar necesitas haber compilado las reglas).

## Decisión

- Las reglas se escriben en **JavaScript ESM** con tipos vía JSDoc
  (`@type {import('eslint').Rule.RuleModule}`). `eslint.config.js` las importa por
  **ruta relativa** (`./tools/eslint-rules/src/index.js`), sin build previo.
- Sus **tests sí son TypeScript** (`*.spec.ts`), ejecutados con Vitest, usando el
  `RuleTester` de ESLint conectado a Vitest (`createTsRuleTester` /
  `createCssRuleTester`).

## Consecuencias

- `pnpm lint` funciona sin un paso de build de las reglas. Cero orden de arranque.
- Menos seguridad de tipos en el cuerpo de las reglas (mitigado con JSDoc + tests
  exhaustivos good/bad).
- Si algún día se quiere TS-first en las reglas, habría que introducir `jiti` y migrar
  el config a `eslint.config.ts` — lo cual contradiría el nombre que fija el SPEC.
