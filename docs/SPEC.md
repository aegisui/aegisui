# Aegis UI — Especificación del proyecto

> **Identidad del proyecto (cerrada):**
> - Nombre: **Aegis UI**
> - Scope npm: `@aegisui` (`@aegisui/cdk`, `@aegisui/ui`, `@aegisui/tokens`…)
> - Repo público: `aegisui` · Repo privado: `aegisui-pro`
> - Prefijo de selectores: `aegis-` (`<aegis-button>`)
> - Prefijo de tokens CSS: `--aegis-` (`--aegis-btn-bg`)
>
> **De dónde viene el nombre:** la *égida* es el escudo de Zeus. Es la propuesta de
> valor entera en una palabra: componentes que no te pueden quitar. MIT de verdad,
> sin límites de asientos, fuente incluida siempre, accesibilidad blindada.
> Úsalo en el copy: *"Aegis UI — the components they can't take away from you."*

---

## 0. Cómo usar este documento

Este es el documento maestro para el agente de desarrollo (Claude Code).

**Reglas para el agente:**

1. Lee este documento entero antes de escribir código.
2. Ejecuta las fases **en orden**. No adelantes trabajo de fases posteriores.
3. Al terminar cada fase, para y reporta. No continúes sin validación humana.
4. Si una decisión no está en este documento, **pregunta**. No improvises arquitectura.
5. Todo lo que se declare aquí como regla debe acabar siendo **verificable en CI**.
   Si una regla no se puede automatizar, se discute antes de implementarla.

---

## 1. Contexto y objetivo

### 1.1 Qué construimos

Una librería de componentes UI para Angular, nativa de signals, con theming
100% configurable y dark mode de primera clase.

### 1.2 Por qué ahora (la oportunidad)

En junio de 2026 PrimeTek archivó el repositorio de PrimeNG y movió las futuras
versiones mayores a licencia comercial (PrimeUI). PrimeNG era la librería de
componentes por defecto del ecosistema Angular. Miles de equipos se han quedado
sin ruta de actualización gratuita, y su licencia Community tiene límites
estrictos (máx. 4 asientos de desarrollador, exclusión del sector público).

El dolor principal reportado por esos equipos **no es el precio: es perder el
acceso al código fuente** (no poder depurar, depender de tickets de soporte).

### 1.3 Nuestra posición

- **Código fuente incluido en todos los tiers.** Siempre. Es el diferenciador.
- **Core MIT de verdad**, sin límites de asientos ni criterios de elegibilidad.
- **Ruta de migración asistida desde PrimeNG** (codemod).
- Premium solo en componentes genuinamente caros de construir.

### 1.4 Lo que NO somos

- No competimos en gráficas (ECharts / AG Charts ya ganan ahí).
- No perseguimos "80 componentes". Perseguimos pocos, excelentes.
- No ofuscamos código ni ponemos license keys que rompan en runtime.

---

## 2. Decisiones de arquitectura (ADR)

### ADR-001: Dos repositorios

| Repo | Licencia | Contenido |
|---|---|---|
| `aegisui` (público) | MIT | tokens, cdk, ui, icons, cli, codemod, docs |
| `aegisui-pro` (privado) | Comercial | grid, scheduler, gantt, editor, dashboard |

El repo Pro consume el público **vía npm**, como cualquier cliente externo.
Nunca como path local. Esto garantiza que la API pública es realmente usable.

**Razón:** un monorepo único filtraría el código Pro en el historial de git.

### ADR-002: Arquitectura brain / skin (headless + estilado)

- `@aegisui/cdk` → primitivas **sin ningún estilo**. Lógica, a11y, posicionamiento.
- `@aegisui/ui` → componentes estilados **construidos sobre el CDK**.

Ningún componente de `ui` puede reimplementar lógica que debería vivir en `cdk`.
Si un componente de `ui` necesita comportamiento nuevo, se añade primero al `cdk`.

**Razón:** es lo que hace real el "100% configurable". Quien quiera control total
usa el CDK; quien quiera velocidad usa `ui`.

### ADR-003: Distribución dual (npm + CLI copia-fuente)

Los componentes free se distribuyen de **dos formas simultáneas**:

1. **Paquete npm**: `npm i @aegisui/ui` — uso clásico.
2. **CLI**: `npx aegisui add button` — copia el fuente al proyecto del usuario
   (modelo shadcn/ui). El usuario es dueño del código.

Ambas salen del **mismo código fuente**. El CLI no mantiene una copia paralela:
lee de `packages/ui/src/lib/<component>/` y lo transforma.

### ADR-004: Estilos — CSS puro Y Tailwind

Los componentes **NO llevan clases de Tailwind escritas dentro**. Llevan clases
semánticas propias (`aegis-btn`, `aegis-btn--primary`) cuyo estilo se resuelve
íntegramente con **CSS custom properties**.

Se publican dos capas de pintura sobre el mismo componente:

- `@aegisui/ui/styles.css` → CSS puro, cero dependencias.
- `@aegisui/ui/tailwind-preset` → mapea los tokens a la config de Tailwind.

**Esto solo funciona si los tokens son la única fuente de color/espaciado/radio.**
Se garantiza con la regla ESLint `no-literal-design-values` (ver §7).

### ADR-005: Angular moderno, sin concesiones

- Angular **22**, standalone (**prohibido `NgModule`**), **zoneless**.
- API **exclusivamente signals**: `input()`, `output()`, `model()`, `computed()`,
  `linkedSignal()`, `resource()`.
- **Prohibidos** los decoradores `@Input()` / `@Output()`.
- `ChangeDetectionStrategy.OnPush` siempre.
- Sin dependencias de `zone.js`.

**Razón:** compatibilidad hacia atrás con Angular viejo nos convertiría en PrimeNG.
Nuestra ventaja es no arrastrar deuda.

---

## 3. Stack técnico

| Área | Elección |
|---|---|
| Monorepo | Nx |
| Build de librerías | ng-packagr |
| Framework | Angular 22 |
| Tests unitarios | Vitest + Angular Testing Library |
| Tests E2E / visuales | Playwright |
| Accesibilidad | axe-core (`@axe-core/playwright`) |
| Documentación | Storybook + sitio de docs (Analog o Astro) |
| Versionado / release | Changesets |
| Tamaño de bundle | size-limit |
| Lint | ESLint (flat config) + reglas propias |
| Formato | Prettier |
| Package manager | pnpm |
| CI | GitHub Actions |

> **Nota sobre versiones:** el toolchain se fija por **coherencia interna**, no por
> "la última de cada pieza". La versión de TypeScript la **acota Angular** (Angular 22
> exige TS 6.0.x; por eso no usamos TS 7). Todas las versiones se pinean **exactas**
> (sin `^` ni `~`) para builds reproducibles.

### 3.1 Compatibilidad de versiones (`peerDependencies`)

**Compilamos con Angular 22; soportamos desde Angular 20.**

`peerDependencies` de los paquetes con runtime Angular (`cdk`, `ui`, `icons`):

```
"@angular/core":   "^20.0.0 || ^21.0.0 || ^22.0.0"
"@angular/common": "^20.0.0 || ^21.0.0 || ^22.0.0"
```

**Por qué el suelo está en 20, y no más abajo ni cerrado en `^22`:**

- Una librería construida con ng-packagr no emite código final, sino *partial
  declarations*; la app consumidora las finaliza con **su propio** Angular linker.
  Cada declaración lleva un `minVersion` embebido = la versión mínima de Angular cuyo
  linker soporta las **features usadas** (no la versión de build). Toda la API del
  spec (`input()`, `output()`, `model()`, `computed()`, `linkedSignal()`,
  `resource()`) existe en Angular ≤19, así que el suelo real hoy es muy inferior a 22:
  una app en Angular 20 consume nuestros componentes sin problema. **Verificado
  empíricamente** (lib trivial Angular 22 → linkers 20 y 21: OK).
- Bajar a 17/18 no daría ninguna feature extra y nos obligaría a soportar versiones
  fuera de mantenimiento — mala señal para una librería que vende "sin deuda heredada".
- Cerrar en `^22` estrecharía el mercado sin ganar nada.

**El número no se declara y ya:** ng-packagr **copia literal** el `peerDependencies`
del `package.json` fuente, no lo calcula. Un peer amplio sin verificación es una
esperanza, no una política. Por eso se blinda con el gate `peer-floor` (§9.2), que
lee el `minVersion` del **artefacto construido** y falla si supera `20.0.0`.

**Subir el suelo (p. ej. a `^21`) es un cambio MAJOR** y exige justificación explícita
en el PR. Nunca por comodidad de poder usar una feature nueva.

---

## 4. Estructura del repositorio público

```
aegisui/
├── apps/
│   ├── docs/                  # sitio de documentación público
│   └── sandbox/               # app Angular real para probar componentes
├── packages/
│   ├── tokens/                # design tokens (fuente de verdad del theming)
│   ├── cdk/                   # primitivas headless
│   ├── ui/                    # componentes estilados (tier FREE)
│   ├── icons/                 # set de iconos
│   ├── cli/                   # `npx aegisui add <component>`
│   └── migrate-primeng/       # el codemod (FASE 5)
├── tools/
│   ├── generators/            # schematics Nx internos
│   └── eslint-rules/          # reglas ESLint propias
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── agent-pipeline.yml # FASE 6
├── docs/
│   ├── SPEC.md                # este documento
│   ├── CONTRIBUTING.md
│   └── contracts/             # un contrato por componente
├── .changeset/
├── eslint.config.js
├── nx.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 5. Sistema de tokens (theming)

### 5.1 Tres capas, obligatorias

```
Capa 1: PRIMITIVOS      --aegis-blue-500: #3b82f6;
        (valores crudos, sin semántica, nunca usados por componentes)
                              ↓
Capa 2: SEMÁNTICOS      --aegis-color-primary: var(--aegis-blue-500);
        (intención; aquí es donde vive light/dark)
                              ↓
Capa 3: DE COMPONENTE   --aegis-btn-bg: var(--aegis-color-primary);
        (lo único que los componentes pueden consumir)
```

**Regla dura:** un componente **solo** puede referenciar tokens de capa 3.
Nunca capa 1, nunca capa 2, nunca un valor literal.

### 5.2 Dark mode

- Implementado en la **capa 2**, no en los componentes.
- Doble mecanismo: `prefers-color-scheme` (automático) **y** atributo
  `[data-theme="dark"]` (control manual). Ambos deben funcionar.
- Usar `light-dark()` de CSS nativo donde el soporte lo permita.
- **Ningún componente debe contener la palabra `dark` en su CSS.** Si la contiene,
  el theming está mal diseñado.

### 5.3 Formato de la fuente

Los tokens se definen en **JSON** (`packages/tokens/src/*.json`) y se compilan a:

- CSS custom properties (`tokens.css`, `tokens.dark.css`)
- Preset de Tailwind (`tailwind-preset.js`)
- Tipos TypeScript (autocompletado de nombres de token)

Un solo comando: `nx build tokens`.

---

## 6. Contrato de componente

**Ningún componente se implementa sin un contrato aprobado previamente.**
El contrato vive en `docs/contracts/<component>.md` y es la fuente de la que se
derivan: implementación, tests, story y documentación.

### Plantilla

```markdown
# Contrato: Button

## Propósito
Una frase. Qué problema resuelve y cuándo NO usarlo.

## Selector
`<aegis-button>`

## Inputs (signals)
| Nombre | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'danger' | 'primary' | no | ... |
| size | 'sm' \| 'md' \| 'lg' | 'md' | no | ... |
| disabled | boolean | false | no | ... |
| loading | boolean | false | no | ... |

## Outputs
| Nombre | Payload | Cuándo se emite |
|---|---|---|

## Model (two-way)
| Nombre | Tipo | Descripción |
|---|---|---|

## Content projection
Slots disponibles y qué se espera en cada uno.

## Tokens que consume
- `--aegis-btn-bg`
- `--aegis-btn-fg`
- `--aegis-btn-radius`
- (lista exhaustiva; si falta uno, el componente no pasa CI)

## Estados
default · hover · focus-visible · active · disabled · loading

## Accesibilidad (obligatorio, WCAG 2.2 AA — ver §8)
- Rol ARIA y atributos:
- Navegación por teclado (tabla tecla → comportamiento, exhaustiva):
- Gestión y orden de foco:
- Anuncios a lector de pantalla (qué se anuncia y en qué región `aria-live`):
- Target size: ¿todos los objetivos táctiles ≥ 24×24 px? (2.5.8)
- Dragging: si hay arrastre, ¿cuál es la alternativa sin arrastre? (2.5.7)
- Focus obscured: ¿puede el foco quedar tapado por este componente? (2.4.11)
- Contraste: pares token fg/bg usados, verificados en light Y dark
- Reduced motion: qué animaciones se desactivan
- Criterios WCAG concretos que aplican a este componente:

## Casos límite
Qué pasa con texto muy largo, sin contenido, RTL, contenido asíncrono...

## Criterios de aceptación (se convierten en tests 1:1)
- [ ] ...
- [ ] ...

## Fuera de alcance
Lo que este componente explícitamente NO hace.
```

---

## 7. Reglas ESLint propias (a implementar en `tools/eslint-rules/`)

Estas reglas **son el producto**. Sin ellas el pipeline autónomo no es fiable.

| Regla | Qué prohíbe |
|---|---|
| `no-literal-design-values` | Valores literales de color, espaciado, radio o sombra en el CSS de un componente. Solo `var(--aegis-*)` de capa 3. |
| `no-ngmodule` | Cualquier `@NgModule`. |
| `no-decorator-io` | `@Input()` / `@Output()`. Solo `input()` / `output()`. |
| `require-onpush` | Todo componente debe declarar `OnPush`. |
| `no-dark-in-component-css` | La cadena `dark` en el CSS de un componente. |
| `cdk-before-ui` | Un componente de `ui` no puede implementar lógica de posicionamiento, foco o teclado directamente: debe venir del `cdk`. |
| `contract-exists` | Todo componente de `ui` debe tener su `docs/contracts/<name>.md`. |
| `tokens-declared-in-contract` | Todo token usado en el CSS debe estar listado en el contrato. |
| `no-outline-none` | `outline: none` sin un sustituto de `:focus-visible` en la misma regla. |
| `no-fixed-text-height` | Alturas fijas en px en contenedores de texto (rompe WCAG 1.4.12). |
| `require-reduced-motion` | Toda `animation`/`transition` debe tener su bloque `prefers-reduced-motion`. |

---

## 8. Accesibilidad — WCAG 2.1 AA y 2.2 AA (requisito duro)

### 8.1 Nivel objetivo

**Todo componente cumple WCAG 2.2 nivel AA.** WCAG 2.2 es un superconjunto de 2.1
(salvo un criterio retirado: 4.1.1 Parsing), así que cumplir 2.2 AA cubre 2.1 AA.

Esto **no es un extra de calidad, es un requisito de mercado**: el European
Accessibility Act obliga desde junio de 2025 a que productos digitales vendidos en
la UE sean accesibles, y la Section 508 (EE.UU.) hace lo propio en el sector
público. Un componente inaccesible es un componente que nuestros clientes no
pueden usar en un contrato público. Es literalmente un bloqueador de venta.

### 8.2 Criterios de WCAG 2.2 que más nos afectan (los nuevos)

Estos son los que más se olvidan y los que más nos van a diferenciar:

| Criterio | Nivel | Qué implica en nuestros componentes |
|---|---|---|
| **2.4.11 Focus Not Obscured (Minimum)** | AA | Un elemento con foco no puede quedar tapado por overlays, sticky headers o toasts. **Crítico para dialog, drawer, toast, dropdown.** |
| **2.4.13 Focus Appearance** | AAA | Indicador de foco con área y contraste mínimos. Lo adoptamos igualmente: es barato y visible. |
| **2.5.7 Dragging Movements** | AA | Todo lo que se arrastra debe tener alternativa sin arrastre. **Crítico para slider, file-upload, y todo el Pro (gantt, task-board, dashboard).** |
| **2.5.8 Target Size (Minimum)** | AA | Objetivos táctiles de al menos 24×24 CSS px. Afecta a botones `sm`, chips, celdas de datepicker, iconos de cierre. |
| **3.2.6 Consistent Help** | A | Aplica al sitio de docs, no a los componentes. |
| **3.3.7 Redundant Entry** | A | No pedir dos veces el mismo dato. Aplica a stepper y formularios multi-paso. |
| **3.3.8 Accessible Authentication** | AA | No exigir puzzles cognitivos. Aplica si hacemos componentes de login/OTP. |

### 8.3 Requisitos base de WCAG 2.1 AA (no negociables)

- **1.4.3 Contraste (mínimo):** 4.5:1 texto normal, 3:1 texto grande.
  **Debe cumplirse en el tema light Y en el dark.**
- **1.4.11 Contraste de elementos no textuales:** 3:1 para bordes de inputs,
  iconos significativos e indicadores de foco.
- **1.4.10 Reflow:** usable a 320px de ancho sin scroll horizontal.
- **1.4.12 Espaciado de texto:** no se rompe si el usuario fuerza interlineado y
  espaciado. **Prohibido usar alturas fijas en px en contenedores de texto.**
- **1.4.13 Contenido al hover/focus:** tooltips y popovers deben ser
  descartables (Esc), pasables con el ratón y persistentes.
- **2.1.1 / 2.1.2 Teclado y sin trampas de foco:** todo operable con teclado;
  ningún foco atrapado salvo en modales (donde es intencionado y con Esc).
- **2.4.7 Foco visible:** usar `:focus-visible`. **Prohibido `outline: none`
  sin sustituto.**
- **4.1.2 Nombre, rol, valor** y **4.1.3 Mensajes de estado:** toasts, validaciones
  y estados de carga se anuncian con `aria-live` en la región adecuada.
- **prefers-reduced-motion:** toda animación debe respetarlo.

### 8.4 Cómo se verifica

**Automático (en CI, bloqueante):**
- `axe-core` sobre cada componente, cada variante, en **light y dark**. 0 violaciones.
- Test de contraste de tokens: script que valida cada par
  foreground/background de la capa semántica contra 4.5:1 (texto) y 3:1 (UI),
  en ambos temas. **Un token que no pasa contraste no se mergea.**
- Test de target size: los snapshots de Playwright verifican ≥24×24 px en
  elementos interactivos.
- Tests de teclado explícitos por cada interacción declarada en el contrato.

**Manual (checklist antes de cada release, no de cada PR):**
- Recorrido completo solo con teclado.
- Prueba con lector de pantalla: **NVDA + Firefox** y **VoiceOver + Safari** como
  mínimo.
- Zoom al 200% y 400%.
- Modo de alto contraste de Windows (forced-colors).

### 8.5 La advertencia honesta

**Las herramientas automáticas como axe detectan aproximadamente un tercio de los
problemas reales de accesibilidad.** Pasar axe en verde no significa que un
componente sea accesible: significa que no tiene errores obvios.

Por eso el contrato de cada componente debe declarar explícitamente el
comportamiento de teclado, el orden de foco y los anuncios a lector de pantalla,
**y esos se testean uno a uno**. La verificación manual con lector de pantalla es
obligatoria antes de cada release y no puede delegarse en el agente.

---

## 9. Estrategia de tests y gates de CI

### 9.1 Niveles

1. **Unitarios (Vitest + Testing Library).** Un test por criterio de aceptación
   del contrato. Se testea comportamiento observable, no implementación.
2. **Accesibilidad (axe).** Cada componente, en cada variante, en light y dark.
   Cero violaciones. No negociable.
3. **Regresión visual (Playwright).** Snapshot de cada variante × light/dark.
4. **Teclado.** Cada interacción declarada en el contrato tiene su test.

### 9.2 Gates de CI (`ci.yml`) — todos bloqueantes

```
lint          → ESLint + reglas propias + Prettier
typecheck     → tsc --noEmit, strict
test          → Vitest, cobertura mínima 90% en packages/ui y packages/cdk
a11y          → axe (WCAG 2.2 AA), cada variante × light/dark, 0 violaciones
contrast      → todos los pares fg/bg de la capa semántica ≥ 4.5:1 (texto)
                y ≥ 3:1 (UI), en light Y dark
keyboard      → un test por cada interacción declarada en el contrato
target-size   → todo elemento interactivo ≥ 24×24 px (WCAG 2.5.8)
visual        → Playwright, 0 diffs no aprobados
size          → size-limit, presupuesto por paquete
build         → todos los paquetes compilan con ng-packagr
peer-floor    → el minVersion embebido en cada FESM CONSTRUIDO ≤ 20.0.0, para
                garantizar el peerDependencies "^20 || ^21 || ^22" (ver §3.1).
                Lee el artefacto, no el package.json fuente. Dos direcciones:
                pasa con APIs ≤20, falla si se fuerza minVersion > 20
contracts     → todo componente tiene contrato y todo contrato tiene componente
changeset     → todo PR que toca packages/** debe incluir un changeset
```

### 9.3 Presupuestos de tamaño (orientativos, ajustar tras el primer build)

- `@aegisui/cdk`: < 15 kB gzip
- `@aegisui/ui` (import individual, tree-shakeable): < 3 kB gzip por componente
- Cero dependencias en runtime salvo `@angular/*`

---

## 10. Tiers de producto

### FREE (MIT, sin límite de asientos, fuente incluida)

**Formularios:** input, textarea, select, autocomplete, combobox, checkbox,
radio, switch, slider, datepicker, timepicker, file-upload, máscaras
(número, moneda, teléfono), form-field

**Overlays:** dialog, drawer, popover, tooltip, dropdown-menu, context-menu,
toast, confirm

**Navegación:** tabs, accordion, breadcrumb, menubar, sidebar, pagination, stepper

**Datos (básico):** table (sort/filter/paginación en cliente), tree, list,
virtual-scroll, card, badge, avatar, skeleton, chip

**Base:** sistema de tokens, dark mode, CDK completo

### PRO (repo privado, fuente incluida, licencia por desarrollador)

data-grid avanzado · scheduler/calendar · gantt · task-board ·
query/filter-builder · dashboard componible · rich-text-editor ·
theme-designer + white-label · soporte con SLA

**Criterio de corte:** si un componente se puede construir en un fin de semana,
va en FREE. El Pro son semanas de trabajo o no es Pro.

---

## 11. El codemod (`@aegisui/migrate-primeng`) — FASE 5

No es un buscar-y-reemplazar. Usa **schematics de Angular** y AST
(TypeScript + parser de plantillas de Angular).

```bash
ng add @aegisui/migrate-primeng
```

**Qué hace:**
- Reescribe imports de PrimeNG a los equivalentes de Aegis UI
- Renombra selectores en plantillas (`<p-table>` → `<aegis-table>`)
- Mapea inputs/outputs equivalentes
- Convierte propiedades a `input()` signals
- Traduce tokens de tema y variables CSS
- **Inserta `// TODO(aegisui):` con explicación donde NO puede mapear**

**Alcance realista:** los 10–15 componentes más usados (table, dialog, dropdown,
calendar, toast, button, inputs). **Ser explícito sobre lo que no cubre.**
Un codemod que promete el 100% y falla a medias destruye la confianza justo en
el momento de evaluación.

**Telemetría opcional (opt-in, anónima):** qué componentes de PrimeNG encuentra.
Esto ordena el roadmap mejor que cualquier encuesta.

---

## 12. Pipeline de desarrollo automatizado — FASE 6

```
Petición (portal o GitHub Issue Form)
   ↓
[AGENTE] Triaje: clasifica, busca duplicados, valida "Definition of Ready"
   ↓
🚦 GATE HUMANO 1 → label `approved`
   ↓
[AGENTE] Planificación: genera docs/contracts/<x>.md → PR de contrato
   ↓
🚦 GATE HUMANO 2 → merge del contrato
   ↓
[AGENTE] Implementación: schematic + código + tests + story + changeset
   ↓
[CI] Todos los gates de §9.2 + preview de Storybook desplegado
   ↓
🚦 GATE HUMANO 3 → revisión con preview → merge
   ↓
[AUTO] Changesets → publicación npm + docs
```

**Para bugs:** el agente **primero escribe el test que falla**, y solo entonces
arregla. El fix queda demostrado, no asumido.

---

## 13. Fases de ejecución

### FASE 1 — Esqueleto y raíles ← EMPEZAR AQUÍ

- [ ] Monorepo Nx + pnpm workspace
- [ ] Paquetes vacíos: `tokens`, `cdk`, `ui`, `icons`, `cli`
- [ ] App `sandbox` (Angular 22, zoneless, standalone)
- [ ] ESLint flat config + Prettier
- [ ] Implementar las **11** reglas ESLint propias de §7, con sus tests (RuleTester)
- [ ] Vitest configurado y corriendo
- [ ] Playwright configurado
- [ ] Changesets configurado
- [ ] `ci.yml` con todos los gates de §9.2
- [ ] `CONTRIBUTING.md`

**Definition of Done — el entregable real de la Fase 1 son los gates probados:**

Un gate que no tiene nada que testear pasa en verde, y ese verde no significa nada.
Es la trampa clásica de CI. Por eso la Fase 1 se valida con **fixtures**, no con
promesas.

Crear `tools/fixtures/` con dos artefactos que NO se publican:

- `fixtures/good/` → un componente mínimo, deliberadamente **correcto**
- `fixtures/bad/` → el mismo componente, deliberadamente **roto**, violando una a una
  las 11 reglas de §7 y los checks de §9.2 (color literal, `outline: none`,
  contraste insuficiente, target < 24px, sin contrato, sin `OnPush`…)

Cada gate de §9.2 debe demostrar **las dos direcciones**:

1. **Pasa** sobre `fixtures/good/`
2. **Falla, y con un mensaje que explica cómo arreglarlo**, sobre `fixtures/bad/`

Un gate que solo demuestra (1) no está terminado.

**Regla anti-verde-falso:** cualquier gate que no encuentre objetivos que analizar
debe **fallar ruidosamente** ("no targets found"), nunca pasar en silencio.

Los fixtures se quedan en el repo para siempre: son el test de regresión de los
raíles. El día que alguien afloje una regla, los fixtures se ponen rojos.

### FASE 2 — Tokens y theming

- [ ] Tokens JSON en tres capas
- [ ] Build → CSS, preset Tailwind, tipos TS
- [ ] Dark mode por `prefers-color-scheme` + `[data-theme]`
- [ ] Página de demo del theming en `sandbox`

**DoD:** cambiar un token primitivo repinta toda la app en light y dark.

### FASE 3 — Contrato + primer componente end-to-end (Button)

- [ ] `docs/contracts/button.md`
- [ ] Schematic `nx g @aegisui/generators:component`
- [ ] Implementación de Button (cdk + ui)
- [ ] Tests: unitarios, axe, teclado, visual (light + dark)
- [ ] Story + entrada en docs
- [ ] Publicado en npm bajo tag `next`

**DoD:** el pipeline completo funciona con un componente real. **Esta fase valida
todo lo anterior. Si algo chirría, se arregla aquí, no después.**

### FASE 4 — Los ~15 componentes free núcleo

Priorizar por lo que más usa un proyecto PrimeNG típico:
`button · input · select · dropdown · dialog · toast · table · datepicker ·
checkbox · tabs · card · tooltip · menu · form-field · autocomplete`

### FASE 5 — Codemod PrimeNG

### FASE 6 — Pipeline agéntico (§12)

### FASE 7 — Primer componente Pro: el Data Grid

---

## 14. Definition of Done (aplica a TODO componente)

Un componente no está terminado hasta que:

- [ ] Tiene contrato aprobado en `docs/contracts/`
- [ ] Toda la lógica reutilizable vive en `cdk`, no en `ui`
- [ ] API 100% signals (`input()`, `output()`, `model()`)
- [ ] `OnPush` + standalone + funciona sin zone.js
- [ ] Cero valores de diseño literales; todos los tokens declarados en el contrato
- [ ] Un test por cada criterio de aceptación del contrato
- [ ] **WCAG 2.2 AA** (ver §8): 0 violaciones de axe en todas las variantes,
      en light y dark
- [ ] Contraste verificado (4.5:1 texto / 3:1 UI) en ambos temas
- [ ] Objetivos táctiles ≥ 24×24 px (2.5.8)
- [ ] Si hay arrastre, existe alternativa sin arrastre (2.5.7)
- [ ] El foco nunca queda obscurecido (2.4.11)
- [ ] `:focus-visible` implementado, sin `outline: none` huérfano
- [ ] `prefers-reduced-motion` respetado
- [ ] Todas las interacciones de teclado del contrato tienen test
- [ ] Snapshots visuales en light y dark
- [ ] Story en Storybook con todas las variantes
- [ ] Funciona vía npm **y** vía `npx aegisui add <component>`
- [ ] Dentro del presupuesto de tamaño
- [ ] Changeset incluido

---

## 15. Principio rector

> La automatización no falla por falta de agentes. Falla por falta de restricciones.
>
> Los raíles (schematics, reglas ESLint, tokens, contratos, gates de CI) **son el
> producto**. El agente solo será tan bueno como los raíles que le pongamos.
>
> Y nadie paga por componentes que parecen generados: la automatización acelera el
> trabajo aburrido (tests, docs, theming, releases), no sustituye el criterio de diseño.
