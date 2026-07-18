# CLAUDE.md — Aegis UI

Librería de componentes UI para **Angular 22**, signals-native, zoneless, standalone, con theming 100% por tokens y dark mode de primera clase. Core MIT con **código fuente siempre incluido**; distribución dual (npm + CLI copia-fuente estilo shadcn).

**Documento maestro:** `docs/SPEC.md` (léelo entero antes de tocar nada). El *cómo* está en `docs/CONTRIBUTING.md`. Las decisiones de la Fase 1 están en `docs/adr/`.

## Puesta en marcha

Node ≥ 22.22.3 (ver `.nvmrc`) y pnpm vía corepack (versión pineada en `packageManager`). Una vez: `corepack enable`. Luego `pnpm install`.

## Comandos

| Qué | Comando |
|---|---|
| Build (ng-packagr/tsc) | `pnpm nx run-many -t build` |
| Test (Vitest; cobertura ≥90% en `ui` y `cdk`) | `pnpm nx run-many -t test` |
| Test de un proyecto | `pnpm nx run <proj>:test` (p. ej. `eslint-rules`, `fixtures`) |
| Lint (ESLint + las 11 reglas propias) | `pnpm lint` |
| Formato | `pnpm format:check` (o `pnpm format` para escribir) |
| Typecheck (`tsc --noEmit`, strict) | `pnpm typecheck` |
| peer-floor (minVersion del artefacto ≤ 20) | `pnpm peer-floor` (requiere build antes) |
| Tamaño (size-limit) | `pnpm size` (requiere build antes) |
| Ensamblar el artefacto publicable | `pnpm assemble-dist` (requiere build antes) |
| Smoke de publicación (consumidor EXTERNO) | `pnpm publish-smoke` (requiere build antes; ADR-022) |
| e2e / Playwright (vs sandbox) | `pnpm nx run sandbox:e2e` |
| Storybook (dev) | `pnpm nx run tokens:build && pnpm storybook` |
| Storybook (build estático) | `pnpm nx run tokens:build && pnpm storybook:build` |
| Changeset | `pnpm changeset` |
| Demostrar que los raíles bloquean | `pnpm exec eslint --config tools/fixtures/eslint.fixtures.config.js 'tools/fixtures/bad/**/*.{ts,css}' 'tools/fixtures/bad-tokens/**/*.css'` |
| Correr un gate DOM de §9.2 (dos direcciones vs fixtures) | `node scripts/gates/run.mjs <gate>` (`a11y`, `contrast`, `keyboard`, `target-size`, `visual`, `contracts`) |

**CI** (`.github/workflows/ci.yml`): un job por gate de §9.2, con `name:` estable (es lo que se fija como *required* en la protección de rama; **no renombrar**). Los 6 gates DOM —`a11y`, `contrast`, `keyboard`, `target-size`, `visual`, `contracts`— corren contra los fixtures `good`/`bad` **en las dos direcciones** vía `scripts/gates/run.mjs <gate>` (ADR-013): pasan sobre `good/`, fallan sobre `bad/`. Cuando lleguen componentes reales, los analizarán **además** de los fixtures, sin tocar el `name:` del job. Los 13 checks van en verde. **Anti-verde-falso sigue vivo:** si un gate deja de cazar la violación de `bad/`, su job se pone rojo.

## Reglas innegociables (todas verificadas en CI)

- **Angular 22, standalone** — prohibido `@NgModule` — y **zoneless** (nada de `zone.js`). `ChangeDetectionStrategy.OnPush` siempre.
- **API signals-only**: `input()`, `output()`, `model()`, `computed()`, `linkedSignal()`, `resource()`. Prohibidos `@Input()` / `@Output()`.
- **Cero literales de diseño** en el CSS de un componente: solo `var(--aegis-*)` de **capa 3**. Nunca capa 1/2 ni valores crudos.
- **La palabra `dark` no aparece en el CSS de un componente**: el dark mode vive en los tokens (capa 2).
- **Lógica de foco / teclado / posicionamiento va en `@aegisui/cdk`**, nunca en `@aegisui/ui` (brain/skin).
- **Contrato antes que código**: `docs/contracts/<name>.md` aprobado en PR aparte antes de implementar. Todo token del CSS debe estar listado en el contrato.
- **Versiones exactas** (sin `^`/`~`). La versión de TypeScript **la acota Angular** (no uses la última TS). `peerDependencies` de los paquetes: `^20 || ^21 || ^22`; subir ese suelo es un **MAJOR** con justificación (ADR-007).
- **Accesibilidad WCAG 2.2 AA** no es opcional ni se retrofitea (SPEC §8).

## Dónde vive cada cosa

- `packages/{tokens,cdk,ui,icons}` → publicables, versionados en **lockstep**; `packages/cli` (`aegisui`) → publicable, versionado **independiente**.
- `apps/sandbox` → app Angular real de pruebas (zoneless).
- `.storybook/` → runtime de Storybook (`@storybook/angular-vite`, ADR-017): documentación viva de los componentes de `packages/ui` (stories junto al componente, `*.stories.ts`).
- `tools/eslint-rules` → las **11 reglas propias** (JS ESM) + sus tests RuleTester. **Son el producto** (SPEC §7, §15).
- `tools/fixtures/{good,bad,bad-tokens}` → **test de regresión permanente de los raíles**: demuestran que cada gate pasa sobre `good/` y falla sobre `bad/` (ADR-009, ADR-013). Incluye los `fixture-*.rendered.{light,dark}.html` (objetivo de los gates DOM) y el `## Teclado` del contrato (objetivo de `keyboard`).
- `scripts/gates/` → los 6 gates DOM de §9.2 (analizadores propios, cero deps) + `run.mjs` (las dos direcciones; es el comando de cada job de CI). ADR-013.
- `scripts/check-peer-floor.mjs` → gate `peer-floor`.
- `scripts/assemble-dist.mjs` → ensambla el artefacto publicable (fuente incluida por ADR-001, manifiestos de `cli`/`icons`, `workspace:` resuelto a rango real). `scripts/publish-smoke.mjs` → lo verifica desde un proyecto **fuera del monorepo** con npm (ADR-022): dentro del repo el fallback del CLI hace verde un ADR-003 roto.
- `scripts/check-contracts.mjs` → reconciliación contrato↔componente (la usa el gate `contracts` sobre fixtures y sobre `packages/ui` en Fase 3).
- `docs/{SPEC,CONTRIBUTING}.md`, `docs/adr/`, `docs/contracts/` (uno por componente).
- `.github/workflows/ci.yml` → gates de §9.2. `.changeset/` → versionado.
- `eslint.config.js` (raíz) → flat config; las reglas propias scopean a `packages/**`.

## Qué NO hacer nunca

- Añadir una dependencia **runtime** que no sea `@angular/*` (abre un issue primero).
- Reimplementar en `ui` algo que debería vivir en `cdk`.
- Escribir código de un componente **antes de que su contrato esté aprobado**.
- Usar la última versión de TypeScript: **la acota Angular** (ADR-006).
- Tocar el suelo de `peerDependencies` sin ADR y bump MAJOR (ADR-007).
- Poner una regla en `'warn'`: **los raíles bloquean, no avisan**.
- Añadir un gate que pase en verde **sin objetivos que analizar**: si no hay nada que comprobar, **falla ruidosamente** (anti-verde-falso, SPEC §13).
- Marcar un test como `skip`, o actualizar snapshots visuales sin mirarlos, para pasar CI.
- Editar los `.fesm.mjs` de `tools/fixtures/peer-floor/` con el formateador (imitan la salida literal del compilador; están excluidos de Prettier a propósito).
