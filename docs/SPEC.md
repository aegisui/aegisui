# Aegis UI — Especificación técnica

> Documento maestro de arquitectura y calidad de Aegis UI.
> Es la fuente de verdad para cualquier persona (o agente) que trabaje en el repo.

---

## 0. Cómo usar este documento

**Reglas para quien desarrolle aquí, humano o agente:**

1. Lee este documento entero antes de escribir código.
2. Ejecuta las fases **en orden**. No adelantes trabajo de fases posteriores.
3. Al terminar cada fase, para y reporta.
4. Si una decisión no está en este documento, **pregunta**. No improvises arquitectura.
5. Todo lo que se declare aquí como regla debe acabar siendo **verificable en CI**.
   Si una regla no se puede automatizar, se discute antes de implementarla.

---

## 1. Qué es Aegis UI

Una librería de componentes UI para Angular: **nativa de signals, zoneless,
standalone**, con theming 100% configurable y dark mode de primera clase.

### 1.1 Principios

- **Código fuente incluido. Siempre.** Sin ofuscación, sin cajas negras.
- **MIT de verdad** en el core: sin límites de asientos, sin criterios de elegibilidad.
- **Accesibilidad verificada en CI**, no prometida en el README (WCAG 2.2 AA).
- **Pocos componentes, excelentes.** No perseguimos un catálogo de 80.
- **Sin deuda heredada.** Angular moderno, sin concesiones a APIs obsoletas.

### 1.2 Alcance

Componentes de formulario, overlays, navegación y datos, más un CDK headless y un
sistema de tokens. La **ruta de migración desde PrimeNG** (codemod) es parte del
proyecto (Fase 5).

Explícitamente **fuera de alcance**: gráficas. El ecosistema ya está bien servido
(ECharts, uPlot). Si acaso, wrappers finos, nunca un motor propio.

---

## 2. Decisiones de arquitectura (ADR)

### ADR-001: Dos repositorios

| Repo | Licencia | Contenido |
|---|---|---|
| `aegisui` (este) | MIT | tokens, cdk, ui, icons, cli, codemod, docs |
| `aegisui-pro` | Comercial | componentes avanzados (fuera del alcance de este repo) |

El repo `pro` consume el público **vía npm**, como cualquier consumidor externo.
Nunca como path local. Esto garantiza que la API pública es realmente usable.

**Razón:** un monorepo único mezclaría ambos en el historial de git.

**Y una regla que no se negocia:** el código fuente se entrega en los dos casos.
Sin ofuscación, sin cajas negras, sin claves que rompan en runtime.

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

- Angular **22** (soportando desde 20, ver §3.1), standalone (**prohibido `NgModule`**), **zoneless**.
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
| Framework | Angular 22 (peer: ^20 \|\| ^21 \|\| ^22) |
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

### 3.1 Política de versiones y `peerDependencies`

**El toolchain se fija por coherencia interna, no por "la última de cada pieza".**
TypeScript lo acota Angular: usa la que Angular exija, no la más nueva.

- Angular de build: **22.x exacto** (sin `^`, sin `~`)
- Node: **22 LTS** · pnpm vía `corepack` + campo `packageManager`

**`peerDependencies` de los paquetes publicados:**

```json
"peerDependencies": {
  "@angular/core": "^20.0.0 || ^21.0.0 || ^22.0.0",
  "@angular/common": "^20.0.0 || ^21.0.0 || ^22.0.0"
}
```

**Compilamos con 22, pero soportamos desde 20.** Es posible porque lo que decide la
compatibilidad **no es la versión de build, sino el `minVersion` que Angular embebe
en cada declaración del FESM** según las features que uses. Toda la API que este
spec declara (`input`, `output`, `model`, `computed`, `linkedSignal`, `resource`)
existe en Angular ≤ 19, así que el suelo real hoy es muy inferior a 20.

⚠️ **`ng-packagr` NO calcula el `peerDependencies`: copia literalmente lo que le
escribas.** Un peer amplio sin verificación es una promesa que se rompe sola el día
que alguien use una API de Angular 21. Por eso existe el gate `peer-floor` (§9.2),
que lee el `minVersion` del **artefacto construido** y falla si supera 20.0.0.

**Subir el suelo (p.ej. a 21) es un cambio `major`** y requiere justificación
explícita en el PR. No se hace por comodidad.

**Requisito mínimo, dicho claramente:** Aegis UI requiere **Angular 20 o superior**.
Esto debe aparecer de forma visible en el README y en la documentación. No generes
la expectativa contraria.

---

## 4. Estructura del repositorio

```
aegisui/
├── apps/
│   ├── docs/                  # sitio de documentación público
│   └── sandbox/               # app Angular real para probar componentes
├── packages/
│   ├── tokens/                # design tokens (fuente de verdad del theming)
│   ├── cdk/                   # primitivas headless
│   ├── ui/                    # componentes estilados
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
| **2.5.7 Dragging Movements** | AA | Todo lo que se arrastra debe tener alternativa sin arrastre. **Crítico para slider, file-upload y cualquier componente con drag & drop.** |
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
peer-floor    → el minVersion embebido en cada FESM ≤ 20.0.0 (ver §3.1).
                Verificado leyendo el artefacto construido, NO el package.json
contracts     → todo componente tiene contrato y todo contrato tiene componente
changeset     → todo PR que toca packages/** debe incluir un changeset
```

### 9.3 Presupuestos de tamaño (orientativos, ajustar tras el primer build)

- `@aegisui/cdk`: < 15 kB gzip
- `@aegisui/ui` (import individual, tree-shakeable): < 3 kB gzip por componente
- Cero dependencias en runtime salvo `@angular/*`

---

## 10. Fases de ejecución

### FASE 1 — Esqueleto y raíles ✅

Monorepo, paquetes vacíos, las 11 reglas ESLint propias, Vitest, Playwright,
Changesets, `ci.yml` con todos los gates, y los **fixtures `good/` y `bad/`** que
prueban que cada gate bloquea en las dos direcciones.

**No produce ni un componente.** Produce los raíles.

**Definition of Done — el entregable real son los gates probados:**

Un gate que no tiene nada que testear pasa en verde, y ese verde no significa nada.
Es la trampa clásica de CI. Por eso la Fase 1 se valida con **fixtures**:

- `tools/fixtures/good/` → componente mínimo, deliberadamente **correcto**
- `tools/fixtures/bad/` → el mismo, deliberadamente **roto**, violando una a una
  las 11 reglas de §7 y los checks de §9.2

Cada gate demuestra **las dos direcciones**: pasa sobre `good/`, y **falla con
mensaje accionable** sobre `bad/`. Un gate que solo demuestra que pasa no está
terminado.

**Regla anti-verde-falso:** cualquier gate que no encuentre objetivos que analizar
debe **fallar ruidosamente** ("no targets found"), nunca pasar en silencio.

Los fixtures se quedan para siempre: son el test de regresión de los raíles.

**Y la protección de rama es parte del entregable.** Un CI en rojo que igualmente
deja mergear no es un raíl. `main` exige PR y todos los checks en verde.

### FASE 2 — Tokens y theming

- Tokens JSON en tres capas
- Build → CSS, preset Tailwind, tipos TS
- Dark mode por `prefers-color-scheme` + `[data-theme]`
- Demo viva del theming en `sandbox`

**DoD:** cambiar un token primitivo repinta toda la app, en light y en dark.

### FASE 3 — Contrato + primer componente end-to-end (Button)

- `docs/contracts/button.md`
- Schematic `nx g @aegisui/generators:component`
- Implementación (cdk + ui)
- Tests: unitarios, axe, teclado, contraste, target size, visual (light + dark)
- Story + entrada en docs

**DoD:** el pipeline completo funciona con un componente real. **Esta fase valida
todo lo anterior. Si algo chirría, se arregla aquí, no después.**

### FASE 4 — Los ~15 componentes núcleo

`button · input · select · dropdown · dialog · toast · table · datepicker ·
checkbox · tabs · card · tooltip · menu · form-field · autocomplete`

### FASE 5 — Codemod de migración desde PrimeNG

No es un buscar-y-reemplazar: usa **schematics de Angular** y AST (TypeScript +
parser de plantillas).

```bash
ng add @aegisui/migrate-primeng
```

- Reescribe imports y selectores (`<p-table>` → `<aegis-table>`)
- Mapea inputs/outputs equivalentes
- Convierte propiedades a `input()` signals
- Traduce tokens de tema y variables CSS
- **Inserta `// TODO(aegis):` con explicación donde NO puede mapear**

**Alcance realista:** los 10–15 componentes más usados. **Ser explícito sobre lo que
no cubre.** Un codemod que promete el 100% y falla a medias destruye la confianza
justo en el momento de evaluación.

### FASE 6 — Pipeline de desarrollo automatizado

```
Petición (GitHub Issue Form)
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

## 11. Definition of Done (aplica a TODO componente)

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

## 12. Principio rector

> La automatización no falla por falta de agentes. Falla por falta de restricciones.
>
> Los raíles (schematics, reglas ESLint, tokens, contratos, gates de CI) **son el
> producto**. Un agente solo será tan bueno como los raíles que le pongamos.
>
> Y nadie confía en componentes que parecen generados: la automatización acelera el
> trabajo aburrido (tests, docs, theming, releases), no sustituye el criterio de diseño.
