# ADR-012: Estilos de componente en `.css` lint-eados por `@eslint/css`

## Contexto

Cinco de las reglas de §7 operan sobre "el CSS de un componente"
(`no-literal-design-values`, `no-dark-in-component-css`, `no-outline-none`,
`no-fixed-text-height`, `require-reduced-motion`). ESLint no parsea CSS por defecto;
además, el CSS podría vivir inline en `@Component({ styles })` o en ficheros `.css`.

## Decisión

- Los estilos de componente viven en **ficheros `.css`** (vía `styleUrl`), no inline.
- Se lintan con el lenguaje **`@eslint/css`** (AST de css-tree). Las reglas CSS
  propias recorren ese AST (`tools/eslint-rules/src/utils/css.js`).
- En `eslint.config.js`, el recomendado de TS/JS se acota por extensión
  (`**/*.{ts,tsx,mts,cts,js,mjs,cjs}`) para **no** aplicar el parser de TypeScript a
  los `.css`; el bloque `.css` usa `language: 'css/css'`.

## Consecuencias

- Las reglas CSS son tratables y testeables (RuleTester con `createCssRuleTester`).
- Un componente con estilos **inline** escaparía a estas reglas: la convención
  `styleUrl` + `.css` es parte del contrato de cómo se escribe un componente.
- Los breakpoints de `@media` no se confunden con valores de diseño de componente:
  las reglas visitan `Declaration`, no las preludes de `@media`.
