# Contrato: Switch

**Estado:** implementación pendiente

> Tercero del set mínimo de la landing (Button ✓, Input ✓, **Switch**, Card,
> Badge). Es el **único de los tres restantes con superficie real de
> accesibilidad**, y aun así es mucho menor que la del Input: no tiene
> validación, ni descripciones asociadas, ni mensajes que cambien con el foco
> dentro. **ADR-019 no le aplica en su parte activa** (ver §Anuncios).

## Propósito

`<aegis-switch>` alterna un booleano que surte efecto **inmediatamente**
(activar notificaciones, modo oscuro, un feature flag).

**Cuándo NO usarlo:**

- Si el valor solo se aplica **al enviar un formulario** → un `checkbox` (fuera
  de alcance v1). Un switch promete efecto inmediato; usarlo dentro de un
  formulario con botón "Guardar" miente al usuario.
- Para **elegir entre dos opciones con nombre** (p. ej. Mensual / Anual) → un
  grupo de radios o un toggle-group (fuera de alcance v1).
- Para **seleccionar varios elementos de una lista** → `checkbox`.

## Selector

`<aegis-switch>`

El componente renderiza en su template un **`<button type="button"
role="switch">` nativo real** — no un `<input type="checkbox">` disfrazado con
CSS, y **nunca** un `<div>` con `tabindex`. Del `<button>` heredamos gratis
foco, activación por teclado (Enter y Space nativos), el estado `:disabled` real
y la participación correcta en el árbol de accesibilidad. `role="switch"` es un
rol ARIA 1.2 que hereda de `checkbox`: el AT anuncia "activado/desactivado" en
vez de "casilla marcada".

**Por qué `role="switch"` sobre un `<button>` y no un `<input type="checkbox"
role="switch">`:** el checkbox nativo arrastra un `indeterminate` que no
queremos (§Fuera de alcance), participa en el envío de formularios (que este
componente **no** promete, ver §Propósito) y su apariencia nativa hay que
neutralizarla con `appearance: none`. El `<button>` no tiene ninguno de los
tres problemas y da exactamente el mismo teclado.

## Inputs (signals)

| Nombre | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `checked` | `boolean` (`model`) | `false` | no | Estado del interruptor, two-way. Se refleja en `aria-checked`. |
| `label` | `string` | `''` | no (pero ver abajo) | Texto del `<label>` que el propio componente renderiza y asocia al `<button>` (ver §Accesibilidad). |
| `disabled` | `boolean` | `false` | no | Aplica el atributo nativo `disabled` del `<button>`: fuera de tabulación, sin activación. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | no | Escala de la pista, el pulgar y la tipografía de la etiqueta. Los **tres** cumplen ≥ 24×24 px (2.5.8). |

Omitir `label` deja el interruptor **sin nombre accesible**: se trata como
defecto y se testea como violación esperada, mismo criterio que el botón
icono-solo sin `aria-label` (Button) y el campo sin `label` (Input).

## Outputs

**Ninguno propio.** El cambio de estado se comunica por el `model` `checked`
(two-way), igual que `value` en el Input. Un `output` `change` adicional sería
una segunda fuente de verdad sobre el mismo hecho; quien necesite reaccionar
usa el two-way binding o un `effect` sobre la señal.

El evento `(click)` nativo del `<button>` **bubblea** hasta `<aegis-switch>`
(encapsulación emulada, sin Shadow DOM), pero **no** es la API recomendada: el
switch también se activa por teclado sin `click` sintético en algunos AT.

## Model (two-way)

| Nombre | Tipo | Descripción |
|---|---|---|
| `checked` | `boolean` | Se actualiza al activar (ratón o teclado). Nunca cambia si `disabled`. |

## Content projection

**Ninguna.** `label` es un input de texto, no un slot — **misma decisión y misma
razón que el Input**: el componente **posee** el `<label>` y la relación con el
control, de modo que esa relación es verificable en CI porque el componente es
dueño de ambos lados del DOM. Un slot dejaría el nombre accesible a merced de
lo que el consumidor proyecte.

## Tokens que consume

Lista **exhaustiva** de capa 3 (ADR-016: local al componente; dos rieles —
color→capa 2, estructura→capa 1). Cero literales (`no-literal-design-values`).

Pista (track):

- `--aegis-switch-track-bg`
- `--aegis-switch-track-bg-checked`
- `--aegis-switch-track-border-color`
- `--aegis-switch-track-border-width`
- `--aegis-switch-track-inline-size`
- `--aegis-switch-track-block-size`
- `--aegis-switch-track-radius`

Pulgar (thumb):

- `--aegis-switch-thumb-bg`
- `--aegis-switch-thumb-bg-checked`
- `--aegis-switch-thumb-size`
- `--aegis-switch-thumb-inset`
- `--aegis-switch-thumb-radius`

Foco:

- `--aegis-switch-focus-ring-color`
- `--aegis-switch-focus-ring-width`
- `--aegis-switch-focus-ring-offset`

Etiqueta y área táctil:

- `--aegis-switch-label-color`
- `--aegis-switch-label-font-size`
- `--aegis-switch-label-font-weight`
- `--aegis-switch-label-gap`
- `--aegis-switch-min-target-size`

Movimiento:

- `--aegis-switch-transition-duration`
- `--aegis-switch-transition-easing`

### Riel de COLOR → capa 2 (`--aegis-color-*`)

El switch es una **superficie de acción** (lo pulsas), no un estado que se lee:
mapea a `accent.*`, nunca a `state.*` (ADR-014, _jade es lo que pulsas_). No
usa `destructive.*`: activar un interruptor no es una acción destructiva
(ADR-015).

| Token de componente | Mapeo (capa 2) |
|---|---|
| `--aegis-switch-track-bg` (off) | `--aegis-color-surface-sunken` |
| `--aegis-switch-track-bg-checked` | `--aegis-color-accent-solid` |
| `--aegis-switch-track-border-color` | `--aegis-color-border-strong` |
| `--aegis-switch-thumb-bg` (off) | `--aegis-color-border-strong` |
| `--aegis-switch-thumb-bg-checked` | `--aegis-color-accent-on-solid` |
| `--aegis-switch-focus-ring-color` | `--aegis-color-accent-ring` |
| `--aegis-switch-label-color` | `--aegis-color-text-strong` |

- **`disabled`** (cross-estado): remapea `--aegis-switch-track-border-color` →
  `--aegis-color-border-separator` (decorativo; un control deshabilitado está
  exento de 1.4.11, mismo patrón que Button e Input, ADR-018), el pulgar y la
  etiqueta → `--aegis-color-text-muted`. La pista `checked` deshabilitada
  **conserva** `accent-solid` apagado por opacidad de token, no por un color
  nuevo: no se siembra un `accent.disabled` que nadie más usaría.

#### El pulgar es BICOLOR, y no es una elección estética

Verificado antes de escribir esto (mismo `contrastRatio` que el gate
`contrast`, `scripts/gates/lib/util.mjs`). El diseño intuitivo —**un pulgar
blanco que se desliza sobre las dos pistas**— **falla 1.4.11**:

| Pulgar naif | vs pista off (`surface.sunken`) | umbral |
|---|---|---|
| `surface.canvas` (blanco) light | **1.16:1** | ≥ 3:1 ❌ |
| `surface.canvas` dark | **1.25:1** | ≥ 3:1 ❌ |

El pulgar es el elemento que comunica el estado por posición: si se funde con
la pista apagada, el estado *off* deja de ser perceptible. Por eso el pulgar
**cambia de color con el estado** (`border-strong` en off → `accent.on-solid`
en on), y por eso hay dos tokens de pulgar y no uno. Ambos pasan:

| Par | light | dark | umbral |
|---|---|---|---|
| pulgar off (`border.strong`) / pista off (`surface.sunken`) | 3.89:1 | 5.65:1 | ≥ 3:1 |
| pulgar on (`accent.on-solid`) / pista on (`accent.solid`) | 5.09:1 | 9.57:1 | ≥ 3:1 |
| pista on (`accent.solid`) / `surface.canvas` | 5.09:1 | 9.39:1 | ≥ 3:1 |
| pista on (`accent.solid`) / `surface.raised` (dentro de una Card) | 4.77:1 | 8.41:1 | ≥ 3:1 |
| borde de pista off (`border.strong`) / `surface.canvas` | 4.52:1 | 7.09:1 | ≥ 3:1 |
| borde de pista off (`border.strong`) / `surface.raised` | 4.24:1 | 6.35:1 | ≥ 3:1 |
| anillo de foco (`accent.ring`) / `surface.canvas` | 5.09:1 | 9.39:1 | ≥ 3:1 |
| etiqueta (`text.strong`) / `surface.canvas` | 16.60:1 | 15.94:1 | ≥ 4.5:1 |

La **pista apagada** (`surface.sunken`) da 1.16:1 contra el canvas — por eso
lleva **borde** `border.strong` obligatorio: el borde, no el relleno, es su
señal de límite (1.4.11). Sin ese borde, un switch apagado sería invisible
sobre fondo claro. La pista encendida no necesita borde (5.09:1 por sí sola),
pero lo conserva transparente para que la geometría no salte entre estados.

**El estado no se comunica solo por color (1.4.1):** la posición del pulgar
(izquierda/derecha) es la señal primaria, redundante con el color y con
`aria-checked`.

### Riel de ESTRUCTURA → capa 1 (primitivos)

| Token de componente | Primitivo(s) de capa 1 |
|---|---|
| `--aegis-switch-track-border-width` | `--aegis-border-width-hairline` |
| `--aegis-switch-track-radius` | `--aegis-radius-full` |
| `--aegis-switch-thumb-radius` | `--aegis-radius-full` |
| `--aegis-switch-track-inline-size` | `--aegis-space-6` (32 px, sm) · `--aegis-space-7` (48 px, md) · `--aegis-space-8` (64 px, lg) |
| `--aegis-switch-track-block-size` | `--aegis-space-4` (16 px, sm) · `--aegis-space-5` (24 px, md) · `--aegis-space-6` (32 px, lg) |
| `--aegis-switch-thumb-size` | `--aegis-space-2` (8 px, sm) · `--aegis-space-4` (16 px, md) · `--aegis-space-5` (24 px, lg) |
| `--aegis-switch-thumb-inset` | `--aegis-space-1` (4 px, constante) |
| `--aegis-switch-min-target-size` | `--aegis-space-5` (24 px; suelo de 2.5.8 en los tres tamaños) |
| `--aegis-switch-focus-ring-width` | `--aegis-focus-ring-width` |
| `--aegis-switch-focus-ring-offset` | `--aegis-focus-ring-offset` |
| `--aegis-switch-transition-duration` | `--aegis-motion-duration-fast` |
| `--aegis-switch-transition-easing` | `--aegis-motion-easing-standard` |
| `--aegis-switch-label-font-size` | `--aegis-font-size-sm` (sm) · `--aegis-font-size-base` (md/lg) |
| `--aegis-switch-label-font-weight` | `--aegis-font-weight-medium` |
| `--aegis-switch-label-gap` | `--aegis-space-3` |

**Toda la geometría cae en la escala de capa 1 ya existente — ni un primitivo
nuevo, ni un literal.** La escala `space` es deliberadamente gruesa
(0·4·8·12·16·24·32·48·64 px) y la geometría se eligió **para encajar en ella**,
no al revés:

| Tamaño | Pista (inline × block) | Pulgar | Inset | Ratio |
|---|---|---|---|---|
| `sm` | 32 × 16 px | 8 px | 4 px | 2:1 |
| `md` | 48 × 24 px | 16 px | 4 px | 2:1 |
| `lg` | 64 × 32 px | 24 px | 4 px | 2:1 |

El pulgar sale de `block − 2 × inset` en los tres casos, así que la relación es
consistente y el recorrido del pulgar es `inline − block` sin ningún cálculo con
literales. `--aegis-radius-full` (`9999px`) también existe ya.

## Estados

| Estado | Disparador | Tratamiento |
|---|---|---|
| **off** | `checked=false` | Pista `surface-sunken` + borde `border-strong`; pulgar a la izquierda (derecha en RTL), color `border-strong`. |
| **on** | `checked=true` | Pista `accent-solid`; pulgar al lado opuesto, color `accent-on-solid`. |
| **hover** | puntero encima, no `disabled` | Refuerzo sutil del borde de pista. Nunca única señal. |
| **focus-visible** | foco por teclado o clic | Anillo con `--aegis-switch-focus-ring-*` alrededor del `<button>`. Nunca `outline: none` huérfano. |
| **disabled** | `disabled=true` | Atributo nativo `disabled`: fuera de tabulación, sin hover, sin activación, colores apagados (exento de contraste). |

`disabled` es ortogonal a `checked`: un switch puede estar **encendido y
deshabilitado** (mostrar una opción activa que el usuario no puede cambiar en su
plan) — combinación válida y testeada.

## Accesibilidad (obligatorio, WCAG 2.2 AA — SPEC §8)

### Rol ARIA y atributos

- Rol: **`role="switch"`** explícito sobre el `<button type="button">`.
- `aria-checked`: **`"true"` / `"false"`** — a diferencia de `aria-invalid` en
  el Input (donde la ausencia es la señal neutra), aquí **el atributo siempre
  está presente con valor explícito**: un switch sin `aria-checked` no es un
  switch, es un botón. `role="switch"` **exige** `aria-checked` por
  especificación ARIA.
- `aria-disabled`: **no se usa.** El `<button>` lleva el atributo nativo
  `disabled`, que ya expone el estado deshabilitado al AT y saca el control de
  la tabulación. (El Button sí usa `aria-disabled` durante `loading` porque
  necesita **retener el foco**; el Switch no tiene estado de carga.)
- **Nombre accesible:** del `<label>` que el propio componente renderiza,
  asociado al `<button>` por `for`/`id` internos (auto-generados). Misma
  decisión que el Input: la relación es interna y por tanto verificable en CI.
  El texto de la etiqueta **no** cambia con el estado ("Notificaciones", nunca
  "Notificaciones activadas") — el estado lo aporta `aria-checked`; meterlo en
  el nombre lo haría anunciarse dos veces y rompería 2.5.3 al cambiar.
- **Clic en la etiqueta activa el interruptor** (comportamiento esperado de un
  `<label for>`), y el área de la etiqueta cuenta como parte del objetivo.

### Teclado

Fuente de verdad del gate `keyboard`. Ambas teclas son **comportamiento nativo
del `<button>`**: el componente escucha `click` (que el navegador sintetiza para
las dos) y **no intercepta `keydown`**.

- `Enter` → alterna `checked`
- `Space` → alterna `checked`

| Tecla | Comportamiento |
|---|---|
| `Tab` | Mueve el foco al interruptor (y fuera). Si `disabled`, se salta. |
| `Enter` | Alterna `checked`. Sin efecto si `disabled`. |
| `Space` | Alterna `checked`. Sin efecto si `disabled`. |
| Flechas | **Sin efecto.** Un switch aislado no es un grupo; no hay navegación entre opciones que gestionar. |

> **Matiz honesto sobre `Enter`:** la APG de ARIA especifica solo `Space` para
> `role="switch"`; `Enter` viene "de regalo" por usar un `<button>` nativo. Lo
> declaramos **a propósito** (el usuario lo espera y no cuesta nada), y por eso
> aparece listado arriba: si algún día la implementación dejara de activarse con
> `Enter`, el gate lo cazaría.

### Gestión y orden de foco

- Foco natural del `<button>`; sin `tabindex` manual.
- El componente expone `focus(): void` (vía `exportAs: 'aegisSwitch'` en `ui`,
  delegando al `cdk`) — mismo patrón que el Input.
- El foco **permanece en el interruptor** al alternar: activar no mueve el foco
  a ningún sitio (3.2.2, "on input": cambiar el valor no provoca cambio de
  contexto).
- No obscurece el foco de ningún otro elemento (2.4.11): no es un overlay.

### Anuncios a lector de pantalla — **ninguna región live** (ADR-019)

**El Switch no añade ninguna región live, ni `aria-live`, ni `role="alert"`, ni
`role="status"`.** No es una omisión: es la decisión correcta según ADR-019.

Ninguna de las dos reglas de ADR-019 aplica al cambio de estado del switch:

- **No es Regla 1** (descripción persistente asociada a un control): el estado
  no es una *descripción*, es una propiedad del control.
- **No es Regla 2** (notificación transitoria): `aria-checked` es un cambio de
  **estado ARIA**, y los AT anuncian nativamente el cambio de estado de un
  control **enfocado** — que es exactamente la situación tras activarlo por
  teclado o por clic. No hace falta un canal adicional.

Añadir una región live encima reproduciría literalmente la **Regla 3** de
ADR-019 (dos canales sobre el mismo contenido → doble anuncio en NVDA/JAWS:
una vez por la live, otra por la relectura nativa del estado).

La **Regla 4** (interpolación plana, nunca `@if` alrededor del texto) sigue
aplicando al `<label>`: su texto se renderiza por interpolación. No hay región
live que proteger, así que **no** se replica el raíl de `MutationObserver` del
Button — ese raíl es específico de regiones `aria-live`, y aquí no hay ninguna.

**Consecuencia práctica:** el Switch **no** requiere el pase manual con lector
de pantalla que sí exigen el Button (`aria-live` del `loading`) y el Input
(mensaje de error). Su comportamiento de anuncio es el nativo de
`role="switch"` + `aria-checked`, no un patrón nuestro. Se verifica igualmente
en el pase manual general previo a release, pero **no es un punto frágil
específico de este componente**.

### Target size (2.5.8)

- El objetivo táctil es ≥ 24×24 px en los **tres** tamaños, garantizado por
  `--aegis-switch-min-target-size` sobre el `<button>` — **incluida la pista y
  el pulgar**, que quedan dentro de ese objetivo mínimo.
- **Ojo, el caso que se escapa:** en `sm` la pista mide menos de 24 px de alto.
  El objetivo de 24 px **no** es la pista pintada, sino el área interactiva del
  `<button>`, que se extiende con padding hasta el mínimo. El gate
  `target-size` mide el **bounding box del `<button>`** en el DOM renderizado,
  no el de la pista — y ese es el criterio correcto de 2.5.8 (objetivo, no
  ornamento). Se testea explícitamente en `sm`, que es donde podría romperse.

### Dragging (2.5.7)

**Aplica, y por eso v1 no implementa arrastre.** Un switch que solo se pudiera
cambiar arrastrando el pulgar violaría 2.5.7. El nuestro se activa con un
**clic simple** (y con teclado): no hay ningún gesto de arrastre que necesite
alternativa. Si algún día se añade arrastre como refuerzo, el clic debe seguir
funcionando.

### Contraste (1.4.3 / 1.4.11)

Ver tabla completa en §Tokens → Riel de color, verificada en light **y** dark.
Resumen: pista (ambos estados), borde de pista, pulgar (ambos estados) y anillo
de foco ≥ 3:1 como UI no textual; etiqueta ≥ 4.5:1 como texto. Estado
deshabilitado exento (mismo criterio que Button e Input).

### Reduced motion (`prefers-reduced-motion`)

- El deslizamiento del pulgar y la transición de color de la pista se **anulan**
  bajo `prefers-reduced-motion: reduce` (regla `require-reduced-motion`): el
  pulgar **salta** a su posición final en vez de animarse. El estado final es
  idéntico; solo desaparece la interpolación.

### Espaciado de texto (1.4.12)

La etiqueta no tiene altura fija en px (`no-fixed-text-height`): crece si el
usuario fuerza interlineado. La pista tiene tamaño fijo **a propósito** — es un
gráfico, no texto, y 1.4.12 aplica al contenido de texto.

### Criterios WCAG que aplican

1.3.1 (relación label/control programática), 1.4.1 (el estado no depende solo
del color: la posición del pulgar lo redunda), 1.4.3, 1.4.11, 1.4.12, 2.1.1,
2.1.2, 2.4.7, 2.4.11, 2.5.3 (el nombre visible está en el nombre accesible),
2.5.7, 2.5.8, 3.2.2 (alternar no provoca cambio de contexto), 4.1.2, y
`prefers-reduced-motion`.

## Casos límite

- **Etiqueta muy larga:** la etiqueta **envuelve** en varias líneas; la pista
  se mantiene alineada al inicio del bloque de texto (`align-items: start`), no
  centrada verticalmente respecto a un párrafo de tres líneas.
- **RTL:** propiedades lógicas (`inset-inline-start` para la posición del
  pulgar). En RTL el pulgar viaja de **derecha a izquierda** al encenderse,
  automáticamente. Sin `left`/`right` físicos en el CSS.
- **Sin `label`:** interruptor sin nombre accesible → **defecto**, se testea
  como violación esperada (axe).
- **`checked=true` + `disabled=true`:** combinación válida (opción activa no
  modificable). `aria-checked="true"` **se mantiene** — el estado lógico se
  expone aunque no se pueda cambiar, mismo criterio que `aria-invalid` en un
  Input deshabilitado.
- **Doble activación rápida (doble clic):** cada activación alterna; dos
  activaciones devuelven al estado inicial. No se hace *debounce* (ocultaría
  intención del usuario).
- **Cambio de `checked` desde fuera** (el consumidor lo asigna
  programáticamente): `aria-checked` se actualiza y el pulgar se mueve, pero
  **no** se anuncia si el control no tiene foco — correcto: un cambio que el
  usuario no provocó y que no está mirando no debe interrumpir su lectura
  (ADR-019, por qué no hay live region).

## Criterios de aceptación (se convierten en tests 1:1)

Unitarios (Vitest + Testing Library):

- [ ] Renderiza un `<button type="button">` con `role="switch"` (no un
      `<input type="checkbox">`, no un `<div>`).
- [ ] `aria-checked` es `"false"` por defecto y `"true"` con `checked=true`
      (atributo **siempre presente**, nunca ausente).
- [ ] Renderiza un `<label>` cuyo `for` coincide con el `id` del `<button>`.
- [ ] El nombre accesible del `<button>` es el texto de `label`, y **no**
      incluye el estado.
- [ ] Activar (clic) alterna `checked` (two-way) y actualiza `aria-checked`.
- [ ] Clic en el `<label>` alterna `checked`.
- [ ] `disabled=true` pone el atributo nativo `disabled` y **no** pone
      `aria-disabled`.
- [ ] Con `disabled=true`, activar (clic o teclado) **no** cambia `checked`.
- [ ] `checked=true` + `disabled=true`: `aria-checked="true"` se mantiene.
- [ ] `size` por defecto es `md`; cada valor aplica su escala.
- [ ] El método `focus()` mueve el foco al `<button>` real.
- [ ] El foco permanece en el interruptor tras alternar.
- [ ] **No existe ningún nodo con `aria-live`, `role="alert"` ni
      `role="status"`** en el DOM del componente (raíl de ADR-019: verifica que
      nadie añada una región live "por si acaso").

Teclado (gate `keyboard` + unitarios):

- [ ] `Space` alterna `checked`.
- [ ] `Enter` alterna `checked`.
- [ ] `Tab` mueve el foco al interruptor; lo salta si `disabled`.
- [ ] Las flechas **no** alteran `checked`.

Accesibilidad (axe — gate `a11y`):

- [ ] 0 violaciones en los 3 tamaños × `off`/`on`/`disabled`, en light y dark.
- [ ] Con `label`: 0 violaciones; **sin** `label`: violación detectada (test
      negativo).

Contraste (gate `contrast`):

- [ ] Cada par de la tabla cumple su umbral en **light y dark**, incluidos los
      dos colores del pulgar contra su pista correspondiente.

Target size (gate `target-size`):

- [ ] El `<button>` mide ≥ 24×24 px en los tres tamaños — **explícitamente en
      `sm`**, donde la pista pintada es menor que el objetivo.

Visual (gate `visual`):

- [ ] Snapshot de cada tamaño × estado (`off`/`on`/`disabled-off`/
      `disabled-on`), en light y dark, sin diffs no aprobados.

Reduced motion:

- [ ] Bajo `prefers-reduced-motion`, el pulgar no anima (transición anulada) y
      el estado final es el mismo.

Foco:

- [ ] `:focus-visible` pinta el anillo; no existe `outline: none` huérfano.

## Fuera de alcance

- **`checkbox` y `radio`:** componentes distintos con semántica y casos de uso
  distintos (valor al enviar, agrupación, selección múltiple). No son variantes
  de este.
- **Estado indeterminado / mixto** (`aria-checked="mixed"`): pertenece al
  `checkbox` (padre de una lista parcialmente marcada). Un switch es binario por
  definición — un interruptor "medio encendido" no significa nada.
- **Etiquetas de estado a los lados** ("Off / On" flanqueando la pista) o
  iconos ✓/✕ dentro del pulgar: ornamento que multiplica los pares de contraste
  y las decisiones de i18n sin añadir información (el estado ya se comunica por
  posición, color y `aria-checked`).
- **Participación en formularios nativos** (`name`/`value`, envío con `<form>`):
  el switch promete efecto inmediato (§Propósito); si hace falta un booleano que
  viaje en el envío, es un `checkbox`.
- **Activación por arrastre** del pulgar: ver §Dragging.
- **Grupo de switches con navegación por flechas:** un patrón de composición
  (`switch-group`), no una variante de este componente.
