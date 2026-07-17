# Contrato: Button

> Primer componente end-to-end (Fase 3). Es la **prueba** de que el pipeline
> completo funciona con código real, no con fixtures. Todos los componentes
> futuros copian este patrón: contrato → schematic → `cdk` (cerebro) + `ui`
> (piel) → tests 1:1 → gates sobre código real. Léelo entero antes de implementar.

## Propósito

`<aegis-button>` dispara una **acción del usuario** (enviar, confirmar, cancelar,
navegar por acción). Es un `<button>` nativo estilado por tokens, con estados de
carga y deshabilitado accesibles.

**Cuándo NO usarlo:**

- Para **navegar a una URL** (cambia la barra de direcciones, es compartible,
  admite abrir en pestaña nueva) → usa un enlace `<a>`. Un botón no es un enlace
  disfrazado (WCAG 4.1.2: rol correcto).
- Para **alternar un estado on/off persistente** → usa un `switch`/`checkbox`
  (fuera de este contrato).
- Para **una sola acción dentro de un grupo mutuamente excluyente** → `radio`.
- Como **contenedor de icono decorativo sin acción** → no es interactivo.

## Selector

`<aegis-button>`

El componente renderiza internamente un `<button>` nativo real (no un `<div
role="button">`): heredamos gratis semántica, foco, activación por teclado y
comportamiento de formulario, y evitamos reimplementar lo que la plataforma ya
hace bien (SPEC §8).

## Inputs (signals)

Todos vía `input()` (signals-only, SPEC §ADR-005). Ninguno es requerido.

| Nombre | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | no | Énfasis visual/semántico. `primary`: acción principal (relleno accent). `secondary`: acción alternativa (contorno neutro). `ghost`: acción terciaria/baja prominencia (sin relleno ni borde). `danger`: acción destructiva (relleno rojo). |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | no | Escala de padding, tipografía y área táctil. **Todas** cumplen objetivo táctil ≥ 24×24 px, incluida `sm` (WCAG 2.5.8). |
| `disabled` | `boolean` | `false` | no | Deshabilita la acción de forma permanente (no por carga). Aplica el atributo nativo `disabled`: fuera del orden de tabulación, sin activación. |
| `loading` | `boolean` | `false` | no | Acción en curso (asíncrona). Muestra un spinner, marca `aria-busy="true"` y **suprime la activación** manteniendo el foco (ver Accesibilidad). No usa el atributo nativo `disabled` para no perder el foco. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | no | Tipo del `<button>` nativo. El default es `'button'` **a propósito**: evita envíos de formulario accidentales (un `<button>` sin `type` dentro de un `<form>` actúa como `submit`). |

Reglas de precedencia: si `disabled` **y** `loading` son `true`, gana `disabled`
(deshabilitado nativo, sin spinner). `loading` implica que la acción está viva y
por eso mantiene el foco; `disabled` implica que no existe acción posible.

## Outputs

**Ninguno propio.** La activación se consume con el evento **nativo** `(click)`
sobre `<aegis-button>` (idiomático en Angular y correcto para lectores de
pantalla). Contrato de emisión, garantizado por el `cdk`:

| Evento | Cuándo se emite | Cuándo NO se emite |
|---|---|---|
| `click` (nativo) | Activación válida por ratón, `Enter` o `Space` en estado normal. | Mientras `disabled` (nativo) o `loading`. En `loading` el `cdk` intercepta y detiene la propagación, de modo que **ningún** `click` escapa al consumidor. |

No exponemos un `output()` redundante porque duplicaría el evento nativo y
abriría la puerta a dos fuentes de verdad. La regla «se activa salvo si
`disabled` o `loading`» vive en un solo sitio: el `cdk`.

## Model (two-way)

Ninguno. `loading` y `disabled` los controla el consumidor (entrada
unidireccional); el botón no invierte su propio estado.

## Content projection

Un **único slot por defecto**: la etiqueta accesible del botón.

```html
<aegis-button>Guardar cambios</aegis-button>
<aegis-button><aegis-icon name="save" /> Guardar</aegis-button>
```

- El contenido se dispone en `inline-flex` con `--aegis-btn-gap`, de modo que un
  icono seguido de texto queda separado y **alineado según la dirección de
  escritura** (LTR/RTL) sin markup adicional.
- El spinner de `loading` se inserta como primer hijo del contenedor,
  **antes** del contenido proyectado, sin alterar el nombre accesible.
- **No** hay slots con nombre (`icon-start`/`icon-end`) en v1: un icono proyectado
  en el slot por defecto cubre el caso con menos superficie de API.

## Tokens que consume

Lista **exhaustiva** de tokens de **capa 3** que el CSS del componente referencia.
Es la fuente de verdad del gate `tokens-declared-in-contract`: si el CSS usa un
`var(--aegis-*)` que no esté aquí, el gate lo caza; si aquí sobra uno que el CSS
no usa, es ruido a limpiar.

**La capa 3 es LOCAL al componente (ADR-016).** El propio Button **define** sus
`--aegis-btn-*` mapeándolos a **capa 2** (donde vive el dark mode), y los remapea
por variante/tamaño/estado. `packages/tokens` expone solo capas 1 y 2 (el sistema
compartido); la capa 3 es la definición visual del Button, tan suya como su HTML,
y viaja con él (resuelve la distribución dual de ADR-003: `npx aegisui add button`
copia la carpeta y se lleva sus remapeos, sin arrastrar un global).

La regla de oro no cambia: **cero literales** (`no-literal-design-values` sigue
vigente palabra por palabra) y ninguna referencia a valores crudos. Los tokens de
**color** se definen en términos de **capa 2** (`--aegis-color-*`); los tokens
**estructurales** (espaciado, radio, tipografía, motion), que no tienen capa 2
porque no varían con el tema, se definen sobre **capa 1** (primitivos
`--aegis-space-*`, `--aegis-radius-*`, …). Ambos son `var(--aegis-*)`: nunca un
literal.

Superficie y texto:

- `--aegis-btn-bg`
- `--aegis-btn-bg-hover`
- `--aegis-btn-bg-active`
- `--aegis-btn-fg`
- `--aegis-btn-border-color`
- `--aegis-btn-border-width`

Foco:

- `--aegis-btn-focus-ring-color`
- `--aegis-btn-focus-ring-width`
- `--aegis-btn-focus-ring-offset`

Forma y tipografía:

- `--aegis-btn-radius`
- `--aegis-btn-font-size`
- `--aegis-btn-font-weight`
- `--aegis-btn-line-height`

Espaciado y área táctil:

- `--aegis-btn-padding-inline`
- `--aegis-btn-padding-block`
- `--aegis-btn-gap`
- `--aegis-btn-min-block-size`
- `--aegis-btn-min-inline-size`

Movimiento:

- `--aegis-btn-transition-duration`
- `--aegis-btn-transition-easing`

Carga (spinner):

- `--aegis-btn-spinner-size`
- `--aegis-btn-spinner-stroke`
- `--aegis-btn-spinner-track-color`
- `--aegis-btn-spinner-indicator-color`

### Riel de COLOR → capa 2 (`--aegis-color-*`)

Se define en el CSS del componente y se remapea por variante. El dark mode se
resuelve solo, porque estos semánticos de capa 2 ya lo llevan dentro (ADR-016).

| Token de componente | `primary` | `secondary` | `ghost` | `danger` |
|---|---|---|---|---|
| `--aegis-btn-bg` | `--aegis-color-accent-solid` | `--aegis-color-surface-raised` | `transparent` | `--aegis-color-destructive-solid` |
| `--aegis-btn-bg-hover` | `--aegis-color-accent-solid-hover` | `--aegis-color-surface-sunken` | `--aegis-color-surface-sunken` | `--aegis-color-destructive-solid-hover` |
| `--aegis-btn-bg-active` | `--aegis-color-accent-solid-hover` | `--aegis-color-surface-sunken` | `--aegis-color-surface-sunken` | `--aegis-color-destructive-solid-hover` |
| `--aegis-btn-fg` | `--aegis-color-accent-on-solid` | `--aegis-color-text-strong` | `--aegis-color-text-strong` | `--aegis-color-destructive-on-solid` |
| `--aegis-btn-border-color` | `transparent` | `--aegis-color-border-strong` | `transparent` | `transparent` |
| `--aegis-btn-focus-ring-color` | `--aegis-color-accent-ring` | `--aegis-color-accent-ring` | `--aegis-color-accent-ring` | `--aegis-color-destructive-ring` |
| `--aegis-btn-spinner-track-color` | `--aegis-color-accent-solid-hover` | `--aegis-color-border-separator` | `--aegis-color-border-separator` | `--aegis-color-destructive-solid-hover` |

- `--aegis-btn-spinner-indicator-color` = `var(--aegis-btn-fg)` (el propio fg de la
  variante; layer-3 sobre layer-3).
- **`disabled`** (cross-variante, no por variante): remapea `--aegis-btn-bg` →
  `--aegis-color-surface-sunken` y `--aegis-btn-fg` →
  `--aegis-color-text-muted` (neutros apagados, 6.24:1 / 5.65:1). Texto
  deshabilitado exento de 1.4.3 pero legible.

> La variante `danger` mapea a `--aegis-color-destructive-*` (**acción**
> destructiva sólida), **no** a `state.danger.*` (tinte de **estado**), por
> **ADR-015**: acción ≠ estado, sin romper el raíl de ADR-014. Contraste verificado
> en light y dark (`on-solid`/`solid` 5.63:1 / 7.62:1; hover 7.38:1 / 8.63:1;
> `ring`/canvas 5.63:1 / 8.12:1).

### Riel de ESTRUCTURA → capa 1 (primitivos)

No varía con el tema, así que se define sobre **capa 1**, no capa 2 (ADR-016). Los
valores que antes serían literales (borde, ring, trazo) son primitivos creados en
`packages/tokens`, no excepciones a `no-literal`.

| Token de componente | Primitivo(s) de capa 1 |
|---|---|
| `--aegis-btn-radius` | `--aegis-radius-md` |
| `--aegis-btn-font-size` | `--aegis-font-size-sm` (sm) · `--aegis-font-size-base` (md) · `--aegis-font-size-lg` (lg) |
| `--aegis-btn-font-weight` | `--aegis-font-weight-medium` |
| `--aegis-btn-line-height` | `--aegis-font-leading-tight` |
| `--aegis-btn-padding-inline` | `--aegis-space-3` (sm) · `--aegis-space-4` (md) · `--aegis-space-5` (lg) |
| `--aegis-btn-padding-block` | `--aegis-space-2` (sm/md) · `--aegis-space-3` (lg) |
| `--aegis-btn-gap` | `--aegis-space-2` |
| `--aegis-btn-min-block-size` | `--aegis-space-5` (24 px; suelo de 2.5.8 en todos los tamaños) |
| `--aegis-btn-min-inline-size` | `--aegis-space-5` (24 px; suelo de 2.5.8 en todos los tamaños) |
| `--aegis-btn-border-width` | `--aegis-border-width-none` (primary/ghost/danger) · `--aegis-border-width-hairline` (secondary) |
| `--aegis-btn-focus-ring-width` | `--aegis-focus-ring-width` |
| `--aegis-btn-focus-ring-offset` | `--aegis-focus-ring-offset` |
| `--aegis-btn-transition-duration` | `--aegis-motion-duration-fast` |
| `--aegis-btn-transition-easing` | `--aegis-motion-easing-standard` |
| `--aegis-btn-spinner-size` | `var(--aegis-btn-font-size)` (escala con el tamaño) |
| `--aegis-btn-spinner-stroke` | `--aegis-border-width-thin` |

El giro del spinner usa `--aegis-motion-duration-slow` (capa 1) como base del
periodo de rotación; se desactiva bajo `prefers-reduced-motion`.

## Estados

| Estado | Disparador | Tratamiento |
|---|---|---|
| **default** | reposo | `--aegis-btn-bg` / `--aegis-btn-fg` de la variante. |
| **hover** | puntero encima, no `disabled`/`loading` | `--aegis-btn-bg-hover`. Solo refuerzo; nunca única señal de estado. |
| **focus-visible** | foco por teclado | Anillo con `--aegis-btn-focus-ring-*` vía `:focus-visible`. Nunca `outline: none` huérfano. |
| **active** | pulsado (`:active`) | `--aegis-btn-bg-active`. |
| **disabled** | `disabled=true` | Atributo nativo `disabled`. Fuera de tabulación, sin hover/active, sin activación. Colores remapeados a tonos apagados (no solo `opacity`). |
| **loading** | `loading=true` y no `disabled` | Spinner visible, `aria-busy="true"`, `aria-disabled="true"`, **foco retenido**, activación suprimida. El contenido mantiene su nombre accesible. |

## Accesibilidad (obligatorio, WCAG 2.2 AA — SPEC §8)

### Rol ARIA y atributos

- Rol: **`button`** implícito (elemento `<button>` nativo). No se añade
  `role="button"` redundante.
- `type`: reflejado desde el input `type` (`button` por defecto).
- `disabled`: atributo **nativo** `disabled` cuando `disabled=true`.
- `loading`: `aria-busy="true"` + `aria-disabled="true"` (NO `disabled` nativo,
  para conservar el foco). Al salir de `loading` ambos vuelven a ausentarse.
- **Nombre accesible:** proviene del contenido de texto proyectado. Si el botón
  es solo-icono, el consumidor **debe** aportar `aria-label` (se documenta y se
  testea el caso «sin nombre accesible» como fallo esperado).

### Navegación por teclado (exhaustiva)

Fuente de verdad del gate `keyboard`. El DOM renderizado declara estas teclas en
`data-handles`.

| Tecla | Comportamiento |
|---|---|
| `Tab` | Mueve el foco al botón (y fuera). En `disabled` nativo, se salta. En `loading` **permanece** enfocable. |
| `Enter` | Activa la acción (emite `click`) en estado normal. Suprimida en `disabled`/`loading`. |
| `Space` | Activa la acción (emite `click`) al soltar, en estado normal. Suprimida en `disabled`/`loading`. Se previene el scroll de página por `Space`. |

No hay otras teclas: un botón no captura flechas, `Esc` ni `Home/End`.

### Gestión y orden de foco

- Foco natural del `<button>`; sin `tabindex` manual salvo el nativo.
- **`loading` conserva el foco** en el propio botón (no lo mueve ni lo pierde):
  continuidad para el lector de pantalla mientras la acción está en curso.
- `disabled` nativo retira el elemento del orden de foco (comportamiento de
  plataforma esperado).
- El botón **no obscurece** el foco de ningún otro elemento (2.4.11): no es un
  overlay.

### Anuncios a lector de pantalla

- Entrar/salir de `loading` se refleja con `aria-busy`, y además se anuncia un
  texto de estado («Cargando…») mediante una región **`aria-live="polite"`**
  visualmente oculta, asociada al botón, para lectores que no verbalizan
  `aria-busy` por sí solo (WCAG 4.1.3 Mensajes de estado).
- El nombre accesible **no cambia** al entrar en carga (el spinner es
  `aria-hidden="true"`): el botón sigue anunciándose por su etiqueta.
- **Corrección (ADR-019):** el texto de la región se pone por interpolación
  plana (`{{ brain.busy() ? loadingLabel() : '' }}`), nunca por `@if`
  envolviendo la interpolación. La versión original sí usaba `@if`: recreaba
  el nodo de texto (`childList`) en vez de mutarlo (`characterData`), y una
  región `aria-live` que recrea su nodo dispara un anuncio doble en NVDA —
  encontrado al generalizar este patrón para el Input, no en el pase manual
  original del Button (que solo cubrió VoiceOver+Safari, donde el defecto no
  se manifestaba). Pendiente de reverificar el anuncio con NVDA+Firefox y
  VoiceOver+Safari sobre la arquitectura corregida.

### Target size (2.5.8)

- **Todos** los tamaños ofrecen un objetivo táctil ≥ 24×24 px, garantizado por
  `--aegis-btn-min-block-size` y `--aegis-btn-min-inline-size` (no depende solo
  del contenido). `sm` ≥ 24 px; `md` y `lg`, mayores. Verificado por el gate
  `target-size` sobre el DOM renderizado de cada tamaño.

### Dragging (2.5.7)

No aplica: el botón no tiene interacción de arrastre.

### Focus obscured (2.4.11)

No aplica como causa: el botón no tapa a otros. Como sujeto, su anillo de foco es
visible (no recortado por `overflow`).

### Contraste (1.4.3 / 1.4.11) — pares fg/bg, light **y** dark

Verificado por el gate `contrast` sobre el DOM renderizado, en ambos temas:

| Par (variante · estado) | Foreground | Background | Umbral |
|---|---|---|---|
| primary · default | `--aegis-btn-fg` (accent-on-solid) | `--aegis-btn-bg` (accent-solid) | ≥ 4.5:1 (texto) |
| primary · hover | accent-on-solid | accent-solid-hover | ≥ 4.5:1 |
| secondary · default | text-strong | surface-raised | ≥ 4.5:1 |
| ghost · default | text-strong | canvas (subyacente) | ≥ 4.5:1 |
| danger · default | destructive-on-solid | destructive-solid | ≥ 4.5:1 |
| danger · hover | destructive-on-solid | destructive-solid-hover | ≥ 4.5:1 |
| anillo de foco (todas) | ring vs superficie adyacente | — | ≥ 3:1 (1.4.11, UI) |
| borde secondary | border-strong vs superficies | — | ≥ 3:1 (1.4.11, UI) |

Texto deshabilitado: exento de 1.4.3, pero se mantiene legible (remapeo a tono
apagado, no solo `opacity`).

> **Corrección (ADR-018):** `--aegis-color-border-strong` no pasaba 3:1 hasta la
> corrección de ADR-018 (era 1.82:1 light / 1.76:1 dark); el gate `contrast` no lo
> cazaba porque no comprobaba ningún par de borde neutro. Ambos se corrigieron
> juntos: el token (ahora ≥ 4.24:1 en las tres superficies, ambos temas) y el gate
> (que desde ADR-018 sí verifica `border.strong`, en la capa semántica y sobre el
> DOM renderizado de los fixtures). El spinner-track de `secondary`/`ghost` y el
> borde de `disabled` usan `--aegis-color-border-separator` (decorativo, sin este
> requisito): no es el mismo rol.

### Reduced motion (`prefers-reduced-motion`)

- Las transiciones de `background`/`color`/`border` se **anulan** bajo
  `prefers-reduced-motion: reduce` (regla `require-reduced-motion`).
- El spinner de `loading` **no rota** bajo reduced-motion: la carga se comunica
  por `aria-busy`, el texto de la región `aria-live` y un indicador estático. No
  hay movimiento sin alternativa.

### Espaciado de texto (1.4.12)

Sin **alturas fijas** en px para el contenedor de texto: se usa
`--aegis-btn-min-block-size` + padding, así el botón **crece** si el usuario
fuerza interlineado/espaciado (regla `no-fixed-text-height`).

### Criterios WCAG que aplican

1.4.3, 1.4.10, 1.4.11, 1.4.12, 1.4.13 (n/a, sin tooltip propio), 2.1.1, 2.1.2,
2.4.7, 2.4.11, 2.5.8, 4.1.2, 4.1.3, y `prefers-reduced-motion`.

## Casos límite

- **Texto muy largo:** el label **envuelve** (sin `white-space: nowrap` forzado);
  el botón crece en alto (no hay altura fija). No se recorta ni se pierde texto
  (1.4.10 reflow a 320 px, 1.4.4 resize).
- **Sin contenido y sin `aria-label`:** botón sin nombre accesible → **defecto**.
  Se testea como violación esperada (axe) y se documenta que icono-solo exige
  `aria-label`.
- **RTL:** propiedades lógicas (`padding-inline`, `gap`, `margin-inline`); el
  orden icono/texto y el spinner se reflejan automáticamente. Sin `left/right`
  físicos.
- **`loading` asíncrono:** al pasar a `loading`, aparece spinner + `aria-busy` +
  anuncio live, se retiene el foco y se suprime la activación; al resolver, todo
  revierte y el botón vuelve a ser activable sin mover el foco.
- **`disabled` durante `loading`:** gana `disabled` (nativo, sin spinner).
- **Doble activación / clic rápido:** en `loading` no se emiten más `click`
  (el `cdk` los detiene); protege contra envíos duplicados.

## Criterios de aceptación (se convierten en tests 1:1)

Unitarios (Vitest + Testing Library — comportamiento observable):

- [ ] Renderiza un `<button>` nativo con el texto proyectado como nombre accesible.
- [ ] `variant` por defecto es `primary`; cada valor aplica su clase/tokens.
- [ ] `size` por defecto es `md`; cada valor aplica su escala.
- [ ] `type` por defecto es `button`; se refleja en el atributo nativo.
- [ ] `disabled=true` pone el atributo nativo `disabled` y **no** emite `click`.
- [ ] `loading=true` pone `aria-busy="true"` y `aria-disabled="true"`, muestra el
      spinner y **no** emite `click` (ni por ratón ni por teclado).
- [ ] `loading=true` **mantiene** el botón enfocable (no usa `disabled` nativo).
- [ ] Con `disabled` **y** `loading`, gana `disabled` (sin spinner).
- [ ] Un `click` válido (estado normal) emite el evento nativo al consumidor.

Teclado (gate `keyboard` + unitarios):

- [ ] `Enter` activa (emite `click`) en estado normal.
- [ ] `Space` activa (emite `click`) al soltar y **no** hace scroll de página.
- [ ] `Enter`/`Space` **no** activan en `disabled` ni en `loading`.

Accesibilidad (axe — gate `a11y`):

- [ ] 0 violaciones en las 4 variantes × 3 tamaños, en **light y dark**.
- [ ] 0 violaciones en estados `default`, `disabled` y `loading`.
- [ ] Botón solo-icono **con** `aria-label`: 0 violaciones; **sin** `aria-label`:
      violación detectada (test negativo).

Contraste (gate `contrast`):

- [ ] Cada par fg/bg de la tabla cumple su umbral en **light y dark**.

Target size (gate `target-size`):

- [ ] Cada tamaño (incl. `sm`) mide ≥ 24×24 px en el DOM renderizado.

Visual (gate `visual`):

- [ ] Snapshot de cada variante × tamaño × estado, en **light y dark**, sin
      diffs no aprobados.

Reduced motion:

- [ ] Bajo `prefers-reduced-motion`, las transiciones se anulan y el spinner no
      rota.

Foco:

- [ ] `:focus-visible` pinta el anillo; no existe `outline: none` huérfano.

## Fuera de alcance

- **Icon-button** con slots con nombre (`icon-start`/`icon-end`): v1 usa el slot
  por defecto.
- **Split button / botón con menú desplegable:** componente aparte (depende de
  `menu`, Fase 4).
- **Grupo de botones / toolbar** (roving tabindex): otro componente del `cdk`.
- **Botón-enlace** (`<a>` con apariencia de botón): rol distinto; no se disfraza
  aquí.
- **Toggle button** (`aria-pressed`): pertenece a un componente de alternancia.
- **Elevación/sombra** por variante: la estética Jade & Graphite es plana en v1
  (ADR-014); sin `--aegis-btn-shadow`.
- **Auto-`loading`** derivado de una promesa: el estado lo controla el consumidor.
