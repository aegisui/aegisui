# Architecture Decision Records

Decisiones con su _porqué_, para que dentro de 6 meses nadie "simplifique" un raíl
por no entender para qué existe. Formato corto: Contexto / Decisión / Consecuencias.

- **ADR-001 … ADR-005** viven en [`../SPEC.md`](../SPEC.md) §2 (dos repos, brain/skin,
  distribución dual, CSS+Tailwind, Angular moderno).
- **ADR-006+** (decisiones de implementación, de la Fase 1 en adelante) viven aquí:

| ADR | Decisión |
|---|---|
| [006](ADR-006-angular-22-y-typescript-acotado.md) | Angular 22 de build; TypeScript lo acota Angular (no la última TS) |
| [007](ADR-007-peer-dependencies-y-gate-peer-floor.md) | `peerDependencies` `^20 \|\| ^21 \|\| ^22` y por qué existe el gate `peer-floor` |
| [008](ADR-008-versionado-fixed-vs-cli-independiente.md) | Versionado fixed (tokens/cdk/ui/icons) vs `cli` independiente |
| [009](ADR-009-fixtures-good-bad.md) | Fixtures good/bad como verificación de gates |
| [010](ADR-010-node-y-pnpm-pinneados.md) | Node 22 + pnpm pinneado vía corepack |
| [011](ADR-011-reglas-eslint-en-js.md) | Reglas ESLint propias en JS ESM (no TS) |
| [012](ADR-012-css-de-componente-con-eslint-css.md) | Estilos de componente en `.css` lint-eados por `@eslint/css` |
| [013](ADR-013-fixtures-como-objetivos-de-ci.md) | Los fixtures son objetivos de CI de primera clase (los 6 gates DOM corren contra ellos, dos direcciones) |
| [014](ADR-014-paleta-jade-graphite.md) | Paleta "Jade & Graphite"; separación jade/estado por hue (68°) y por rol, garantizada por ausencia de token |
| [015](ADR-015-accion-destructiva-solida.md) | Rol de acción destructiva sólida `color.destructive.*` |
| [016](ADR-016-capa-3-local-y-modelo-de-dos-rieles.md) | La capa 3 es local al componente; theming a dos rieles (color→capa 2, estructura→capa 1) |
| [017](ADR-017-storybook-vite-zoneless.md) | Storybook corre sobre `@storybook/angular-vite` (no la vía webpack, deprecada) |
| [018](ADR-018-borde-separator-vs-strong-y-gate-de-borde.md) | `border.separator` (decorativo) vs `border.strong` (funcional, ≥3:1); el gate `contrast` empieza a verificar bordes |
| [019](ADR-019-anuncio-de-estado-dinamico-describedby-estable-mas-alert-separado.md) | Anuncio de estado dinámico: `describedby` estable + `alert` separado + mutación in situ (nunca `@if`); corrige Input y Button; raíl automático |
