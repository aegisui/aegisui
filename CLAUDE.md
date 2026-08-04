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
| Tamaño: coste de consumidor de `cdk` + agregado informativo | `pnpm size` (requiere build antes) |
| Tamaño: coste **fijo** + **marginal** por componente | `pnpm size:marginal` (requiere build antes) |
| e2e / Playwright (vs sandbox) | `pnpm nx run sandbox:e2e` |
| Storybook (dev) | `pnpm nx run tokens:build && pnpm storybook` |
| Storybook (build estático) | `pnpm nx run tokens:build && pnpm storybook:build` |
| Changeset | `pnpm changeset` |
| Demostrar que los raíles bloquean | `pnpm exec eslint --config tools/fixtures/eslint.fixtures.config.js 'tools/fixtures/bad/**/*.{ts,css}' 'tools/fixtures/bad-tokens/**/*.css'` |
| Correr un gate DOM de §9.2 (dos direcciones vs fixtures) | `node scripts/gates/run.mjs <gate>` (`a11y`, `contrast`, `keyboard`, `target-size`, `visual`, `contracts`, `coverage`) |

**CI** (`.github/workflows/ci.yml`): un job por gate de §9.2, con `name:` estable (es lo que se fija como *required* en la protección de rama; **no renombrar**). Los 7 gates DOM —`a11y`, `contrast`, `keyboard`, `target-size`, `visual`, `contracts`, `coverage`— corren contra los fixtures `good`/`bad` **en las dos direcciones** vía `scripts/gates/run.mjs <gate>` (ADR-013): pasan sobre `good/`, fallan sobre `bad/`. **Anti-verde-falso sigue vivo:** si un gate deja de cazar la violación de `bad/`, su job se pone rojo.

Los componentes REALES se verifican **además**, en el mismo job y sin renombrarlo, con los specs de `apps/sandbox/e2e/gate-*.spec.ts` (axe, contraste, target-size y snapshots de estilos computados sobre los 5 componentes en Chromium, ambos temas). Cada job de `a11y`/`contrast`/`target-size`/`visual` corre las dos mitades: el canario de fixtures y el componente real.

`coverage` es el meta-check y no tiene mitad e2e: comprueba que cada variante declarada en la `## Matriz visual representativa` de un contrato nombre una historia que exista. Un contrato sin matriz no es cobertura cero, es cobertura **DESCONOCIDA**, y por eso falla. Los contratos de primitivos **headless** de `cdk` se eximen **declarándolo** (`**Sin matriz visual:** primitivo headless, no renderiza`, ADR-023), nunca por omisión: si el sujeto renderiza de verdad, la exención es violación. **Está verde y debe seguir verde** — si lo ves rojo, hay cobertura que falta, no una excepción tolerada.

`size-marginal` es el **segundo meta-check**, y mide lo que un consumidor paga de verdad, no el agregado que nadie paga: el **coste fijo** (el peaje de usar la librería, aunque solo uses un componente) y el **coste marginal** de cada componente por encima de ese peaje. Mide con una **app Angular real** construida contra `dist/`, nunca con esbuild sobre el FESM: los *partial declarations* de ng-packagr solo los resuelve el linker de Angular, y sin él parece —**falsamente**— que la librería no se tree-shakea. Todo componente de `packages/ui` **declara su presupuesto marginal en su contrato** (`**Presupuesto marginal:** X.XX kB`); sin declaración el gate falla, igual que `coverage` con la matriz visual: un componente sin presupuesto no es presupuesto cero, es presupuesto **DESCONOCIDO**. El agregado sigue reportándose, pero **informativo y sin `limit`** — un salto suyo sin que se mueva ningún marginal significa que creció el tronco común.

`forced-colors` es solo e2e y solo de **regresión**: comprueba que el CSS responde a `forced-colors: active`. **No** valida que se vea bien en Windows High Contrast real —Chromium emula un juego de colores por defecto, no los temas del SO— y eso sigue siendo pase manual (`docs/pase-manual-set-minimo.md` §8). Los dos, no uno.

## Reglas innegociables (todas verificadas en CI)

- **Angular 22, standalone** — prohibido `@NgModule` — y **zoneless** (nada de `zone.js`). `ChangeDetectionStrategy.OnPush` siempre.
- **API signals-only**: `input()`, `output()`, `model()`, `computed()`, `linkedSignal()`, `resource()`. Prohibidos `@Input()` / `@Output()`.
- **Cero literales de diseño** en el CSS de un componente: solo `var(--aegis-*)` de **capa 3**. Nunca capa 1/2 ni valores crudos.
- **La palabra `dark` no aparece en el CSS de un componente**: el dark mode vive en los tokens (capa 2).
- **Lógica de foco / teclado / posicionamiento va en `@aegisui/cdk`**, nunca en `@aegisui/ui` (brain/skin).
- **Contrato antes que código**: `docs/contracts/<name>.md` aprobado en PR aparte antes de implementar. Todo token del CSS debe estar listado en el contrato.
- **Versiones exactas** (sin `^`/`~`). La versión de TypeScript **la acota Angular** (no uses la última TS). `peerDependencies` de los paquetes: `^20 || ^21 || ^22`; subir ese suelo es un **MAJOR** con justificación (ADR-007).
- **Cero dependencias runtime con acoplamiento de framework** (ADR-023). Pertenecer a `@angular/*` **no** da acceso: `@angular/cdk` está rechazada con datos. Aprobadas hoy: `@floating-ui/dom` (en `dependencies` de `cdk`, para posicionar overlays). Toda candidata pasa los **8 criterios** de ADR-023 §Criterio general y trae ADR propio.
- **Accesibilidad WCAG 2.2 AA** no es opcional ni se retrofitea (SPEC §8).

## Dónde vive cada cosa

- `packages/{tokens,cdk,ui,icons}` → publicables, versionados en **lockstep**; `packages/cli` (`aegisui`) → publicable, versionado **independiente**.
- `apps/sandbox` → app Angular real de pruebas (zoneless).
- `.storybook/` → runtime de Storybook (`@storybook/angular-vite`, ADR-017): documentación viva de los componentes de `packages/ui` (stories junto al componente, `*.stories.ts`).
- `tools/eslint-rules` → las **11 reglas propias** (JS ESM) + sus tests RuleTester. **Son el producto** (SPEC §7, §15).
- `tools/fixtures/{good,bad,bad-tokens}` → **test de regresión permanente de los raíles**: demuestran que cada gate pasa sobre `good/` y falla sobre `bad/` (ADR-009, ADR-013). Incluye los `fixture-*.rendered.{light,dark}.html` (objetivo de los gates DOM) y el `## Teclado` del contrato (objetivo de `keyboard`).
- `scripts/gates/` → los 7 gates DOM de §9.2 (analizadores propios, cero deps) + `run.mjs` (las dos direcciones; es el comando de cada job de CI). ADR-013.
- `apps/sandbox/e2e/gate-*.spec.ts` → la mitad de cada gate que mira el **componente real** en Chromium. Vive aquí, no en `scripts/gates/`: necesita navegador y las galerías del sandbox.
- `scripts/check-peer-floor.mjs` → gate `peer-floor`.
- `scripts/check-contracts.mjs` → reconciliación contrato↔componente (la usa el gate `contracts` sobre fixtures y sobre `packages/ui` en Fase 3).
- `docs/{SPEC,CONTRIBUTING}.md`, `docs/adr/`, `docs/contracts/` (uno por componente de `ui`) y `docs/contracts/cdk/` (uno por primitivo headless de `cdk`). **Los dos directorios los miran `contracts` Y `coverage`, con reglas distintas** (ADR-023): `reconcile()` para `ui` (selector `aegis-*`), `reconcilePrimitives()` para `cdk` (directorio en `packages/cdk/src/lib/`, sin exigir `aegis-*`; un primitivo que es el brain de un componente homónimo queda cubierto por el contrato de arriba, como `button`/`input`/`switch`). Un contrato de primitivo headless se exime de matriz visual **declarándolo** (`**Sin matriz visual:** primitivo headless, no renderiza`), nunca por omisión: si el sujeto renderiza de verdad, la exención es violación.
- `.github/workflows/ci.yml` → gates de §9.2. `.changeset/` → versionado.
- `eslint.config.js` (raíz) → flat config; las reglas propias scopean a `packages/**`.

## Qué NO hacer nunca

- Añadir una dependencia **runtime** sin pasar los 8 criterios de ADR-023 y sin ADR propio. **`@angular/cdk` está prohibida explícitamente** — también para "solo virtualizar el Select" (ADR-023 §4).
- Virtualizar listas en v1: el Select/Combobox **capa a ~100 resultados** y pide afinar la búsqueda. No es un olvido, es ADR-023 §4; el virtual scroll llega con la tabla de datos Pro.
- Reimplementar en `ui` algo que debería vivir en `cdk`.
- Escribir código de un componente **antes de que su contrato esté aprobado**.
- Añadir un componente a `packages/ui` **sin declarar su presupuesto marginal** en el contrato (`**Presupuesto marginal:** X.XX kB`). El gate `size-marginal` lo bloquea: ningún componente nace sin un número que lo vigile, y el Combobox no es la excepción por ser el más pesado — es justo el que más lo necesita.
- Usar la última versión de TypeScript: **la acota Angular** (ADR-006).
- Tocar el suelo de `peerDependencies` sin ADR y bump MAJOR (ADR-007).
- Poner una regla en `'warn'`: **los raíles bloquean, no avisan**.
- Añadir un gate que pase en verde **sin objetivos que analizar**: si no hay nada que comprobar, **falla ruidosamente** (anti-verde-falso, SPEC §13).
- Marcar un test como `skip`, o actualizar snapshots visuales sin mirarlos, para pasar CI.
- Editar los `.fesm.mjs` de `tools/fixtures/peer-floor/` con el formateador (imitan la salida literal del compilador; están excluidos de Prettier a propósito).
