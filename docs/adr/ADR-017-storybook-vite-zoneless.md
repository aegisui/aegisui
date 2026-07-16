# ADR-017: Storybook corre sobre `@storybook/angular-vite` (no `@storybook/angular` webpack); `storybook-build` es informativo, no required

## Contexto

Fase de Storybook: montar el runtime (Storybook 10 + builder Angular + zoneless)
que sirve la story del Button ya escrita en Fase 3. Dos tensiones de versión
aparecieron al fijar el paquete, y se decidieron con evidencia empírica, no a
ciegas (mismo criterio que [ADR-006](ADR-006-angular-22-y-typescript-acotado.md)).

**Tensión 1 — TypeScript.** `@storybook/angular@10.5.0` (la vía webpack clásica)
declara `peerDependencies.typescript: "^4.9.0 || ^5.0.0"`. El repo pinea TS
`6.0.3` (acotado por Angular 22, ADR-006). No hay build de esa vía, ni siquiera
`next`, que declare soporte TS 6.

**Tensión 2 — builder.** Esa misma vía webpack solo compila los componentes
Angular a través de internals de `@angular-devkit/build-angular`
(`src/utils/webpack-browser-config`, `src/tools/webpack/configs`). Ese paquete
está **deprecado explícitamente por Angular** ("Use the esbuild and Vite-based
`@angular/build` package instead") — el mismo builder que ya usa
`apps/sandbox/angular.json` (`@angular/build:application`). Traer Storybook por
esta vía habría significado sumar como devDependency un builder que Angular
mismo dice no usar, solo para esta pieza de tooling.

Investigando la alternativa: `@storybook/angular-vite@10.5.1` (paquete
oficial, no experimental — la propia guía de Storybook recomienda esta vía
para Angular 21+, y la webpack solo para Angular 18-20 o tooling webpack que no
se pueda migrar) resuelve las dos tensiones de una vez:

- Peer `typescript: ">= 5.9.x"` **sin cota superior** → TS 6.0.3 entra limpio,
  sin warning.
- Compila vía `@analogjs/vite-plugin-angular` (ya presente en el repo,
  `2.6.3`, con soporte `@angular/build: ^18-22` confirmado) sobre
  `@angular/build`, no sobre el builder deprecado.
- Peer `@angular/core: >=21.0.0 <23.0.0` → Angular 22 cubierto.
- Zoneless por defecto (`angularBuilderOptions?.zoneless ?? true`), sin
  configuración adicional.

## Decisión

- Runtime: `storybook@10.5.1` + `@storybook/angular-vite@10.5.1` +
  `@storybook/addon-docs@10.5.1` (autodocs de la story, `tags: ['autodocs']`).
- `@angular/animations@22.0.6` como devDependency **solo para Storybook**: el
  plugin de Vite precarga incondicionalmente `@angular/platform-browser/animations`
  en `optimizeDeps.include`, y sin el paquete ese pre-bundling puede romper.
  Angular tiene `@angular/animations` deprecado también (usar
  `animate.enter/leave`) pero aquí es solo una dependencia de arranque de
  Vite, no algo que el Button use.
- `.storybook/main.ts`: framework `@storybook/angular-vite`, `compodoc: false`
  (las stories ya declaran `argTypes` a mano; compodoc no aporta nada y evita
  sumar esa dependencia), `viteFinal` con `resolve.tsconfigPaths: true` (Vite 8
  lee paths de tsconfig de forma nativa; resuelve `@aegisui/cdk`).
- `.storybook/preview.ts` importa `dist/packages/tokens/tokens.css` por ruta
  relativa — igual mecanismo que `apps/sandbox/angular.json` (`styles`).
  Requiere `pnpm nx run tokens:build` antes de levantar Storybook.
- Toggle de tema en la toolbar (`globalTypes.theme`) conmuta `[data-theme]` en
  `:root`, igual que `apps/sandbox/src/app/app.component.ts` (§5.2). El dark
  vive en los tokens; Storybook no sabe nada de "dark".
- Verificado empíricamente el 2026-07-16: `pnpm storybook:build` completa sin
  error, `tsc --noEmit -p .storybook/tsconfig.json` pasa limpio, la story
  `Matriz` renderiza las 4 variantes × 3 tamaños, y el toggle de tema (toolbar
  y `?globals=theme:dark` en la URL) cambia correctamente los tokens
  aplicados sobre el Button y el lienzo.

### ¿Gate de CI o fuera de los 13 checks?

**Fuera de los 13 required.** El job `storybook-build (non-blocking)` en
`.github/workflows/ci.yml` solo hace `pnpm storybook:build` (nada de gates,
nada de fixtures) y lleva `continue-on-error: true`. Es la única excepción
deliberada a "todo job de `ci.yml` es required" (ver el comentario de cabecera
de ese archivo). Razón:

- Los 13 checks existentes son raíles (SPEC §13, anti-verde-falso): un rojo
  suyo significa **siempre** una violación real, porque solo cazan lo que los
  fixtures `good`/`bad` demuestran que cazan. Storybook no verifica ningún eje
  de corrección que esos gates no verifiquen ya contra los fixtures reales —
  es documentación de desarrollo, no un verificador.
- Es, por diseño, la pieza con más fricción de versiones del stack (de ahí
  las dos tensiones resueltas arriba). Ponerla en el conjunto required
  significaría que un futuro breaking change de Storybook/Vite bloquea todos
  los PRs aunque el componente esté perfecto — y enseñaría a la gente a leer
  un rojo como "puede que no sea nada", que es exactamente lo que el
  anti-verde-falso existe para evitar.
- **El nombre del job (`storybook-build (non-blocking)`) y `continue-on-error`
  son a propósito**, no un descuido: si dentro de 6 meses alguien lo mete al
  ruleset de protección de rama como required, que sea una decisión consciente
  que reabra este ADR, no un "total, ya está verde casi siempre".
- El ruleset de required checks vive en la configuración de GitHub (branch
  protection), no en este repo; este ADR es la única fuente de verdad de que
  `storybook-build` no debe entrar ahí.
- El preview desplegado (SPEC menciona "CI + preview de Storybook desplegado")
  queda para una fase posterior; este job no publica nada, solo construye.

## Consecuencias

- Cero dependencia del builder webpack deprecado de Angular; Storybook queda
  alineado con el resto del repo (`@angular/build`, esbuild/Vite).
- El peer warning de TS 6 desaparece con esta vía (a diferencia de la webpack).
  Sigue habiendo un warning de peer transitivo de `typescript` vía `tsconfck`
  (usado por tooling de Vite internamente, `^5.0.0`) — no bloquea el install,
  no afectó ningún build/typecheck/test realizado, se acepta igual que el de
  ADR-006.
- Revisar esta decisión si `@storybook/angular-vite` cambia su rango de peers
  de forma incompatible con una futura subida de Angular, o si aparece una vía
  con menos superficie (p. ej. sin necesitar `@angular/animations`).
