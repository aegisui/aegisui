# Contrato: Input

> Segundo componente de la Fase 4 (set mínimo de la landing: Button hecho,
> Input · Switch · Card · Badge por delante). Es el de **mayor superficie de
> accesibilidad** de los cinco: nombre accesible, validación anunciada y
> contraste de tres colores distintos (texto, placeholder, borde) a la vez.
> Si el pipeline aguanta este contrato, el resto es fácil.

## Propósito

`<aegis-input>` captura **una línea de texto** del usuario: un `<input>`
nativo estilado por tokens, con etiqueta, texto de ayuda y mensaje de error
accesibles de fábrica.

**Cuándo NO usarlo:**

- Para **texto multilínea** → un `textarea` (fuera de alcance v1, ver abajo).
- Para **elegir de una lista cerrada de opciones** → `select`/`combobox`
  (fuera de alcance v1).
- Para **un valor con formato estricto** (tarjeta, teléfono con máscara,
  fecha) → un componente con máscara (Fase 4, aparte).
- Para **un booleano** → `switch`/`checkbox` (otro componente del set mínimo).

## Selector

`<aegis-input>`

El componente renderiza, en su propio template, un `<label>` **y** un
`<input>` nativos reales (nunca un `<div contenteditable>` ni un `<span>`
disfrazado): heredamos gratis edición de texto, selección, portapapeles,
autocompletado del navegador y el árbol de accesibilidad de una caja de texto
nativa (SPEC §8).

## Inputs (signals)

Todos vía `input()` salvo `value` (vía `model()`, two-way). Ninguno excepto
`label` es estrictamente requerido por el compilador —**pero omitir `label`
dejando el campo sin nombre accesible se trata como un defecto**, igual que el
botón sin `aria-label` del contrato del Button, y se testea como violación
esperada (ver Casos límite).

| Nombre | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `label` | `string` | `''` | no (pero ver arriba) | Texto del `<label>` que el propio componente renderiza y asocia por `for`/`id` (ver §Accesibilidad). |
| `type` | `'text' \| 'email' \| 'password' \| 'search' \| 'tel' \| 'url' \| 'number'` | `'text'` | no | Tipo del `<input>` nativo: activa el teclado virtual, la validación de formato y el icono de revelar (`password`) correctos por plataforma. |
| `value` | `string` (`model`) | `''` | no | Contenido del campo, two-way. **Siempre `string`**, incluso con `type="number"` (así lo expone `HTMLInputElement.value`): v1 no hace coerción numérica: el consumidor parsea si lo necesita. |
| `placeholder` | `string \| undefined` | `undefined` | no | Pista de formato, **no** sustituto de `label` (WCAG: un placeholder no es un nombre accesible; desaparece al escribir). |
| `disabled` | `boolean` | `false` | no | Aplica el atributo nativo `disabled`: fuera de tabulación, sin edición, sin envío en formularios. |
| `readonly` | `boolean` | `false` | no | Aplica el atributo nativo `readonly`: **enfocable y seleccionable/copiable**, pero no editable. Distinto de `disabled` (SPEC §8: no ocultar del teclado algo que se puede leer). |
| `required` | `boolean` | `false` | no | Aplica `required` nativo + `aria-required`. El `label` muestra un indicador visual (`*`) marcado `aria-hidden` (el `required` nativo ya lo anuncia; el asterisco no debe anunciarse dos veces). |
| `invalid` | `boolean` | `false` | no | Refleja `aria-invalid="true"`. Es una señal **manual** del consumidor (v1 no trae validadores propios — ver Fuera de alcance): quien valide el formulario decide cuándo el campo está inválido. |
| `errorMessage` | `string \| undefined` | `undefined` | no | Mensaje de error. Solo se renderiza y se enlaza por `aria-describedby` cuando **`invalid` es `true`**. `invalid=true` sin `errorMessage` es válido (el campo se anuncia inválido igualmente vía `aria-invalid`) pero desaconsejado: sin mensaje, el usuario sabe que algo falla pero no qué corregir. |
| `helpText` | `string \| undefined` | `undefined` | no | Texto de ayuda persistente (no depende de `invalid`). Se enlaza por `aria-describedby` siempre que exista. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | no | Escala de padding, tipografía y área táctil. Igual que el Button, **todas** cumplen ≥ 24×24 px (2.5.8). |

## Outputs

**Ninguno propio.** Dos matices importantes de composición (el `<input>` real
vive dentro del template de `<aegis-input>`, no es el propio host):

| Evento | Comportamiento |
|---|---|
| `(input)` / `(change)` nativos | **Bubblean** por el DOM real (encapsulación emulada de Angular, sin Shadow DOM): funcionan escritos directamente sobre `<aegis-input (input)="...">`. |
| `(focus)` / `(blur)` nativos | **No bubblean** (son eventos no-burbujeantes por spec DOM). Escribirlos sobre `<aegis-input>` **no** se dispara. Usa `(focusin)` / `(focusout)` (sí bubblean), o el método `focus()` expuesto (ver Gestión de foco). |

No exponemos `output()` propios para envolver esto: sería una segunda fuente
de verdad sobre eventos que el DOM ya ofrece (dos de ellos gratis, dos con una
alternativa nativa igual de estándar).

## Model (two-way)

| Nombre | Tipo | Descripción |
|---|---|---|
| `value` | `string` | Contenido del campo. Se actualiza en cada evento `input` nativo (no solo al `blur`): consistente con `[(ngModel)]`/`FormControl` de Angular. |

## Content projection

**Ninguna.** A diferencia del Button (que proyecta su etiqueta), `<aegis-input>`
no proyecta contenido: `label`, `helpText` y `errorMessage` son **inputs de
texto**, no slots. Decisión deliberada (ver §Accesibilidad): el componente
**posee** el marcado completo de la relación label/input/ayuda/error para que
esa relación no dependa de que el consumidor la componga bien fuera del
componente — es verificable en CI precisamente porque el componente es dueño
del DOM entero, no solo del `<input>`.

## Tokens que consume

Lista **exhaustiva** de tokens de **capa 3** (ADR-016: local al componente,
dos rieles — color→capa 2, estructura→capa 1). Cero literales
(`no-literal-design-values`).

Superficie y texto:

- `--aegis-input-bg`
- `--aegis-input-fg`
- `--aegis-input-placeholder-color`
- `--aegis-input-border-color`
- `--aegis-input-border-color-hover`
- `--aegis-input-border-color-invalid`

Foco:

- `--aegis-input-focus-ring-color`
- `--aegis-input-focus-ring-color-invalid`
- `--aegis-input-focus-ring-width`
- `--aegis-input-focus-ring-offset`

Forma y tipografía:

- `--aegis-input-radius`
- `--aegis-input-border-width`
- `--aegis-input-font-size`
- `--aegis-input-line-height`

Espaciado y área táctil:

- `--aegis-input-padding-inline`
- `--aegis-input-padding-block`
- `--aegis-input-min-block-size`

Movimiento:

- `--aegis-input-transition-duration`
- `--aegis-input-transition-easing`

Etiqueta y campos auxiliares (label / help / error):

- `--aegis-input-label-color`
- `--aegis-input-label-font-size`
- `--aegis-input-label-font-weight`
- `--aegis-input-label-gap` (separación label↔campo)
- `--aegis-input-required-indicator-color`
- `--aegis-input-help-color`
- `--aegis-input-help-font-size`
- `--aegis-input-error-color`
- `--aegis-input-error-font-size`
- `--aegis-input-meta-gap` (separación campo↔ayuda/error)

### Riel de COLOR → capa 2 (`--aegis-color-*`)

**Acción vs estado (ADR-015), aplicado por primera vez fuera del Button:** el
Button usaba `destructive.*` para `danger` porque es una **acción** (el botón
_hace_ algo destructivo). El estado inválido de un Input no es una acción, es
un **estado** — exactamente el caso para el que existe `state.danger.*`
(ADR-014). Por eso `border-color-invalid` y `focus-ring-color-invalid` mapean
a `state.danger.point` (el rol de estado con contraste de **UI** ya
verificado por `semanticPairs()`), no a `destructive.solid`/`destructive.ring`.

| Token de componente | Mapeo (capa 2) |
|---|---|
| `--aegis-input-bg` | `--aegis-color-surface-raised` |
| `--aegis-input-fg` | `--aegis-color-text-strong` |
| `--aegis-input-placeholder-color` | `--aegis-color-text-muted` |
| `--aegis-input-border-color` | `--aegis-color-border-strong` |
| `--aegis-input-border-color-hover` | `--aegis-color-accent-border` |
| `--aegis-input-border-color-invalid` | `--aegis-color-state-danger-point` |
| `--aegis-input-focus-ring-color` | `--aegis-color-accent-ring` |
| `--aegis-input-focus-ring-color-invalid` | `--aegis-color-state-danger-point` |
| `--aegis-input-label-color` | `--aegis-color-text-strong` |
| `--aegis-input-required-indicator-color` | `--aegis-color-text-muted` |
| `--aegis-input-help-color` | `--aegis-color-text-muted` |
| `--aegis-input-error-color` | `--aegis-color-state-danger-text` |

- **`disabled`** (cross-estado): remapea `--aegis-input-bg` →
  `--aegis-color-surface-sunken`, `--aegis-input-fg` → `--aegis-color-text-muted`,
  `--aegis-input-border-color` → `--aegis-color-border-separator` (decorativo:
  un control deshabilitado está exento de 1.4.3/1.4.11 — mismo patrón que el
  Button, ADR-018).
- **`readonly`**: mismo `--aegis-input-fg`/borde que `default` (sigue siendo
  legible y su borde sigue siendo funcional: no está exento de 1.4.11, solo no
  es editable). Únicamente cambia `--aegis-input-bg` →
  `--aegis-color-surface-sunken`, como pista visual de "no editable" sin
  tocar el contraste de texto ni de borde.

Verificado (mismo script que el gate `contrast`, `scripts/gates/lib/util.mjs`):

| Par | light | dark | Umbral |
|---|---|---|---|
| `text-strong` / `surface-raised` (valor) | 15.56:1 | 14.27:1 | ≥ 4.5:1 |
| `text-muted` / `surface-raised` (placeholder, ayuda) | 6.81:1 | 6.35:1 | ≥ 4.5:1 |
| `border-strong` / `surface-raised` (borde default) | 4.24:1 | 6.35:1 | ≥ 3:1 |
| `accent-border` / `surface-raised` (borde hover) | 4.77:1 | 8.41:1 | ≥ 3:1 |
| `state.danger.point` / `surface-raised` (borde/ring inválido) | 5.28:1 | 7.27:1 | ≥ 3:1 |
| `accent-ring` / `surface-canvas` (anillo foco) | 5.09:1 | 9.39:1 | ≥ 3:1 |
| `state.danger.text` / `surface-raised` (texto de error) | 6.92:1 | 8.24:1 | ≥ 4.5:1 |

`--aegis-color-text-subtle` se **descarta** explícitamente para el
placeholder: en dark (neutral.500 sobre neutral.950) da **4.10:1**, por debajo
de 4.5:1. `text-muted` es el único candidato semántico que pasa en ambos
temas contra las superficies donde el Input aparece (7.26/7.09 contra canvas,
6.81/6.35 contra raised) — es el token correcto, no una elección arbitraria.

### Riel de ESTRUCTURA → capa 1 (primitivos)

| Token de componente | Primitivo(s) de capa 1 |
|---|---|
| `--aegis-input-radius` | `--aegis-radius-md` |
| `--aegis-input-border-width` | `--aegis-border-width-hairline` |
| `--aegis-input-font-size` | `--aegis-font-size-sm` (sm) · `--aegis-font-size-base` (md) · `--aegis-font-size-lg` (lg) |
| `--aegis-input-line-height` | `--aegis-font-leading-normal` (texto escrito por el usuario: prioriza legibilidad sobre compacidad, a diferencia del `leading-tight` del Button) |
| `--aegis-input-padding-inline` | `--aegis-space-3` (sm) · `--aegis-space-4` (md) · `--aegis-space-5` (lg) |
| `--aegis-input-padding-block` | `--aegis-space-2` (sm/md) · `--aegis-space-3` (lg) |
| `--aegis-input-min-block-size` | `--aegis-space-5` (24 px; suelo de 2.5.8 en los tres tamaños) |
| `--aegis-input-focus-ring-width` | `--aegis-focus-ring-width` |
| `--aegis-input-focus-ring-offset` | `--aegis-focus-ring-offset` |
| `--aegis-input-transition-duration` | `--aegis-motion-duration-fast` |
| `--aegis-input-transition-easing` | `--aegis-motion-easing-standard` |
| `--aegis-input-label-font-size` | `--aegis-font-size-sm` (constante: la etiqueta no escala con `size` — evita que un input `lg` con etiqueta gigante rompa layouts de formulario) |
| `--aegis-input-label-font-weight` | `--aegis-font-weight-medium` |
| `--aegis-input-label-gap` | `--aegis-space-1` |
| `--aegis-input-help-font-size` | `--aegis-font-size-sm` |
| `--aegis-input-error-font-size` | `--aegis-font-size-sm` |
| `--aegis-input-meta-gap` | `--aegis-space-1` |

## Estados

| Estado | Disparador | Tratamiento |
|---|---|---|
| **default** | reposo | `--aegis-input-bg`/`fg`/`border-color` de reposo. |
| **hover** | puntero encima, no `disabled` | `--aegis-input-border-color-hover`. Solo refuerzo, nunca única señal (igual que el Button). |
| **focus-visible** | foco por teclado o clic | Anillo con `--aegis-input-focus-ring-*`; color del anillo depende de `invalid` (accent vs `state-danger-point`). |
| **disabled** | `disabled=true` | Atributo nativo `disabled`. Fuera de tabulación, sin hover, colores apagados (exento de contraste). |
| **readonly** | `readonly=true` | Atributo nativo `readonly`. Enfocable y seleccionable, no editable. Fondo `surface-sunken`, texto y borde con contraste normal (no exento). |
| **invalid** | `invalid=true` | `aria-invalid="true"`, borde y (si hay foco) anillo en `state-danger-point`, mensaje de error renderizado y enlazado si `errorMessage` existe. |

`disabled` y `readonly` son independientes entre sí (a diferencia de
`disabled`/`loading` del Button, que eran mutuamente excluyentes por
precedencia): un campo puede ser `readonly` **e** `invalid` a la vez (mostrar
por qué un valor precargado no es válido, sin dejar que se edite ahí mismo).
`disabled` sí desactiva la relevancia de `invalid` visualmente (un campo
deshabilitado no se resalta en rojo), pero **no** apaga `aria-invalid`: el
atributo semántico se mantiene coherente con el estado lógico aunque no se
pinte.

## Accesibilidad (obligatorio, WCAG 2.2 AA — SPEC §8)

### Rol ARIA y atributos

- Rol: **ninguno explícito**. Un `<input type="text|email|...">` nativo ya
  expone el rol correcto (`textbox`, o `spinbutton`-adyacente para `number`)
  sin ayuda.
- `aria-invalid`: `"true"` cuando `invalid=true`; **ausente** (no `"false"`)
  en caso contrario — un lector de pantalla no necesita que se le diga "no
  inválido" constantemente; ausencia de atributo es la señal neutra correcta.
- `aria-required`: refleja `required` (redundante con el atributo nativo
  `required` para navegadores/AT que no lo infieren solos; documentado, no
  eliminado).
- `aria-describedby`: compone, en orden `helpText` → `errorMessage`, los ids
  aplicables (space-separated). El de `helpText` solo entra cuando hay
  `helpText`. **El de `errorMessage` está SIEMPRE**, desde el primer render,
  vacío cuando no hay error — ADR-019: la relación es estable, no se crea ni se
  destruye en caliente; solo cambia el texto del span. Es el único canal de
  anuncio del error: **sin `aria-live`, sin `role="alert"`** (ver §Anuncios).
- **Nombre accesible:** viene del `<label for="{id}">` que el propio
  componente renderiza, asociado al `id` (auto-generado o, si el consumidor
  pasa uno propio vía el `id` nativo del host, respetado — ver más abajo).
  **Decisión de diseño, la pregunta central de este contrato:** en vez de
  pedirle al consumidor que escriba su propio `<label for="...">` fuera del
  componente (frágil: nada garantiza que el `for` coincida con el `id`
  interno, que puede cambiar), `<aegis-input>` **posee** el `<label>`. La
  relación `for`/`id` es un detalle de implementación interno, verificado en
  CI porque el componente controla ambos lados; el consumidor solo aporta el
  *texto* de la etiqueta (`label`). Si algún día un layout necesita el
  `<label>` en otra celda del grid del formulario (fuera del contenedor de
  `<aegis-input>`), eso es un caso de un componente `form-field` de
  composición más flexible — **fuera de alcance de v1** (ver abajo).
- **Placeholder no sustituye a `label`:** un input sin `label` pero con
  `placeholder` **no tiene nombre accesible** (el placeholder no cuenta como
  tal en la especificación ARIA/HTML). Se testea como violación esperada.

### Navegación por teclado (exhaustiva)

Fuente de verdad del gate `keyboard`.

| Tecla | Comportamiento |
|---|---|
| `Tab` | Mueve el foco al campo (y fuera). En `disabled`, se salta. En `readonly`, **permanece** enfocable (no es lo mismo que `disabled`). |
| *(cualquier tecla imprimible)* | Comportamiento **nativo** del `<input>`: inserta el carácter y actualiza `value`. No se intercepta. Sin efecto si `disabled` o `readonly` (comportamiento nativo del atributo). |
| `Ctrl/Cmd+A`, flechas, `Home`/`End`, selección con `Shift` | Comportamiento **nativo** de edición de texto. No se reimplementa nada (SPEC §8: no reinventar lo que la plataforma ya hace bien). |

No hay teclas propias del componente: a diferencia del Button, `<aegis-input>`
no intercepta ningún evento de teclado — toda la interacción de texto es
nativa. `data-handles` del gate `keyboard` declara una lista **vacía** a
propósito (ninguna tecla gestionada explícitamente por el componente).

### Gestión y orden de foco

- Foco natural del `<input>`; sin `tabindex` manual.
- El componente expone `focus(): void` (vía `exportAs: 'aegisInput'` en el
  `ui`, delegando al `cdk`) que enfoca el `<input>` real — necesario porque
  `(focus)`/`(blur)` no bubblean (ver Outputs) y un consumidor puede querer
  enfocar el campo programáticamente (p. ej. al fallar la validación del
  formulario, llevar el foco al primer campo inválido).
- El campo **no obscurece** el foco de ningún otro elemento (2.4.11): no es
  un overlay.

### Anuncios a lector de pantalla

- **Solo `aria-describedby` + `aria-invalid`, sin región live (ADR-019).** El
  mensaje de error vive en UN único `<span>` visible, siempre presente en el
  DOM (vacío cuando no hay error), enlazado por `aria-describedby` desde el
  `<input>` con un `id` estable. `aria-invalid="true"` cuando aplica. **Sin
  `role="alert"`, sin `aria-live`, sin `role="status"`.** El texto se interpola
  plano (muta in situ, no se recrea el nodo).

  Por qué no una región live: NVDA y JAWS **reannuncian nativamente** la
  descripción de un control enfocado cuando su texto cambia — se comportan
  como región live sin que se declare. Añadir `aria-live`/`role="alert"`
  **duplica** el anuncio en NVDA/JAWS y **rompe** el `aria-describedby` en
  VoiceOver. Cuatro fuentes independientes convergen: GOV.UK Design System,
  Adrian Roselli, David MacDonald, React Aria (detalle y enlaces en ADR-019).

  Este componente llegó aquí tras **cuatro** intentos con región live que
  fallaron el pase manual (uno/dos anuncios en NVDA, o el mensaje ausente
  hasta el blur). La causa común: una región live que sobraba. El historial
  completo, para que nadie lo reabra, está en ADR-019 §"El camino recorrido".
  El Button comparte ahora exactamente el mismo patrón limpio (su `srId`
  también perdió el `aria-live`).

  **Verificación manual con lector de pantalla obligatoria antes de release**
  (NVDA+Firefox, VoiceOver+Safari) — los cuatro casos: (1) campo normal;
  (2) error ya presente al enfocar; (3) error apareciendo con el campo ya
  enfocado; (4) error cambiando de texto varias veces sin soltar el foco.
  Criterio en los cuatro: **visible al aparecer, una sola lectura, reanuncio
  con el texto ACTUALIZADO al reenfocar**. La estructura (describedby estable,
  cero región live) está verificada con `MutationObserver` en Chromium real;
  no sustituye escuchar el resultado.
- `helpText` (persistente, no ligado a un evento): igual, solo `aria-describedby`,
  sin `role`/`aria-live`. Nunca lo necesitó.

### Target size (2.5.8)

- Los tres tamaños ofrecen un objetivo táctil ≥ 24×24 px, garantizado por
  `--aegis-input-min-block-size` (no depende del contenido). Verificado por
  el gate `target-size` sobre el DOM renderizado de cada tamaño.

### Dragging (2.5.7)

No aplica: el Input no tiene interacción de arrastre.

### Focus obscured (2.4.11)

No aplica como causa (el campo no tapa a otros). Como sujeto, su anillo de
foco no queda recortado por `overflow`.

### Contraste (1.4.3 / 1.4.11) — pares fg/bg, light **y** dark

Ver tabla completa en §Tokens → Riel de color. Resumen de lo verificado por
el gate `contrast` (capa semántica + DOM renderizado):

- Texto del valor, placeholder, label, ayuda y error: ≥ 4.5:1 en ambos temas.
- Borde por defecto, borde hover, borde/anillo inválido, anillo de foco:
  ≥ 3:1 en ambos temas, contra `surface-raised` (el fondo real del campo).

Texto deshabilitado: exento de 1.4.3 (mismo criterio que el Button).

### Reduced motion (`prefers-reduced-motion`)

- Las transiciones de `background`/`border-color` se **anulan** bajo
  `prefers-reduced-motion: reduce` (regla `require-reduced-motion`). El Input
  no tiene ninguna animación además de esa transición (sin spinner ni
  movimiento propio).

### Espaciado de texto (1.4.12)

Sin alturas fijas en px: `--aegis-input-min-block-size` + padding, el campo
**crece** si el usuario fuerza interlineado/espaciado (`no-fixed-text-height`).

### Criterios WCAG que aplican

1.3.1 (relación label/campo por `for`/`id` programática), 1.4.3, 1.4.10,
1.4.11, 1.4.12, 2.1.1, 2.1.2, 2.4.7, 2.4.11, 2.5.8, 3.3.1 (identificación de
error), 3.3.2 (labels/instrucciones), 4.1.2, 4.1.3, y `prefers-reduced-motion`.

## Casos límite

- **Valor muy largo:** el `<input>` **desplaza** el texto horizontalmente
  siguiendo el cursor (comportamiento nativo del navegador); no se trunca ni
  se envuelve — truncar ocultaría contenido que el usuario escribió.
- **RTL:** propiedades lógicas (`padding-inline`, `margin-inline`); el
  navegador alinea el texto y el placeholder según `dir` automáticamente. Sin
  `left/right` físicos en el CSS del componente.
- **Autocompletado del navegador** (gestor de contraseñas, direcciones):
  el componente no pelea contra el estilo que el navegador aplica a campos
  autocompletados (p. ej. el fondo amarillo/azul de Chromium) — respetar la
  UI del gestor de contraseñas del usuario es más importante que la
  consistencia visual del token. El valor autocompletado dispara el evento
  `input` nativo igual que si el usuario tecleara, así que el `model` se
  sincroniza sin código adicional.
- **`required` sin valor:** al enviar un formulario nativo (`<form>` con
  `<button type="submit">`), el navegador bloquea el envío y enfoca el campo
  con su validación nativa (`:invalid` + mensaje del navegador) **si** el
  consumidor no ha puesto `invalid`/`errorMessage` propios. Documentado: v1
  no desactiva la validación nativa del navegador (no `novalidate` propio);
  el consumidor que quiera su propio mensaje de error debe gestionar
  `invalid`/`errorMessage` explícitamente (v1 no reconcilia ambos sistemas
  automáticamente — riesgo de doble mensaje si se mezclan, documentado como
  advertencia de uso, no como bug).
- **Sin `label`:** campo sin nombre accesible → **defecto**, se testea como
  violación esperada (axe), igual que el botón icono-solo sin `aria-label`.
- **`invalid=true` sin `errorMessage`:** válido (ver tabla de Inputs);
  `aria-invalid` se refleja igual. La entrada de error en `aria-describedby`
  **ya estaba ahí** desde el primer render (ADR-019): sigue estando, apuntando
  a un `<span>` vacío — no aparece ni desaparece nada nuevo.
- **`disabled` y `readonly` simultáneos:** `disabled` nativo gana a efectos de
  interacción (fuera de tabulación) — `readonly` queda semánticamente
  redundante pero no es un error declarar ambos.

## Criterios de aceptación (se convierten en tests 1:1)

Unitarios (Vitest + Testing Library):

- [ ] Renderiza un `<input>` nativo del `type` indicado (default `'text'`).
- [ ] Renderiza un `<label>` cuyo `for` coincide con el `id` del `<input>`.
- [ ] El nombre accesible del `<input>` es el texto de `label`.
- [ ] `value` se actualiza en cada evento `input` nativo (two-way).
- [ ] `placeholder` se refleja en el atributo nativo `placeholder`.
- [ ] `disabled=true` pone el atributo nativo `disabled`.
- [ ] `readonly=true` pone el atributo nativo `readonly` y el campo sigue
      siendo enfocable.
- [ ] `required=true` pone `required` nativo y `aria-required="true"`.
- [ ] `invalid=true` pone `aria-invalid="true"`; `invalid=false` **no** pone
      `aria-invalid="false"` (atributo ausente).
- [ ] **No existe ningún nodo con `role="alert"` ni `aria-live`**: el error se
      anuncia solo por `aria-describedby` (ADR-019, Solución 5).
- [ ] El `<span>` de error existe siempre y su id está siempre en
      `aria-describedby`, vacío cuando no hay error.
- [ ] Con `helpText`, `aria-describedby` incluye ambos ids (ayuda y error) en
      ese orden.
- [ ] La relación `aria-describedby` con el error es **estable**: el mismo id
      antes y después de que aparezca el error — solo cambia el texto del span.
- [ ] Si el error cambia de texto, el mismo `<span>` se actualiza in situ (la
      descripción siempre al día para el reenfoque).
- [ ] `invalid=true` sin `errorMessage`: `aria-invalid` presente; el `<span>`
      de `aria-describedby` sigue ahí pero vacío.
- [ ] `size` por defecto es `md`; cada valor aplica su escala.
- [ ] El método `focus()` mueve el foco al `<input>` real.

Teclado (gate `keyboard` + unitarios):

- [ ] `Tab` mueve el foco al campo; lo salta si `disabled`; lo respeta si
      `readonly`.
- [ ] Escribir un carácter actualiza `value` (comportamiento nativo, no
      interceptado).

Accesibilidad (axe — gate `a11y`):

- [ ] 0 violaciones en los 3 tamaños, en **light y dark**.
- [ ] 0 violaciones en `default`, `disabled`, `readonly`, `invalid` (con y
      sin `errorMessage`).
- [ ] Campo **con** `label`: 0 violaciones; **sin** `label` (y sin
      `aria-label` externo): violación detectada (test negativo).

Contraste (gate `contrast`):

- [ ] Cada par fg/bg de la tabla cumple su umbral en **light y dark**.

Target size (gate `target-size`):

- [ ] Cada tamaño (incl. `sm`) mide ≥ 24×24 px en el DOM renderizado.

Visual (gate `visual`):

- [ ] Snapshot de cada tamaño × estado (`default`/`disabled`/`readonly`/
      `invalid`), en **light y dark**, sin diffs no aprobados.

Reduced motion:

- [ ] Bajo `prefers-reduced-motion`, las transiciones de borde/fondo se anulan.

Foco:

- [ ] `:focus-visible` pinta el anillo (accent o danger según `invalid`); no
      existe `outline: none` huérfano.

Manual (antes de release, no de cada PR — SPEC §8.4).

Cuatro arquitecturas con región live fallaron el pase manual antes de llegar
aquí; el historial completo está en ADR-019 §"El camino recorrido" (no se
repite en el contrato: la regla operativa es la de abajo, no las cuatro
descartadas). **Ningún resultado de esos pases se hereda** — cada uno era otra
arquitectura.

- [ ] **Pendiente** — arquitectura actual (Solución 5: solo `aria-describedby`
      + `aria-invalid`, cero región live). La ESTRUCTURA está verificada con
      `MutationObserver` en Chromium real (cero `role="alert"`/`aria-live`,
      describedby estable, texto que muta in situ). Falta el oído, en
      NVDA+Firefox **y** VoiceOver+Safari, los cuatro casos del banco manual
      (`aegis-input-a11y-manual`): visible al aparecer, **una** lectura,
      reanuncio con el texto ACTUALIZADO al reenfocar. Los dos lectores, no
      uno — la lección de todo el historial es que un pase con un solo lector
      no certifica el patrón.

## Fuera de alcance

- **`textarea` (multilínea), `select`/`combobox`, inputs con máscara:**
  componentes aparte de la Fase 4 — v1 es solo texto de una línea.
- **Validadores integrados** (email bien formado, longitud mínima, patrón):
  `invalid`/`errorMessage` son señales que el consumidor decide cuándo
  activar; el Input no sabe *por qué* algo es inválido, un
  `ReactiveFormsModule`/validador externo sí.
- **Afijos/iconos** (icono de búsqueda, botón de "limpiar", prefijo de
  moneda): sin slots en v1 — mismo criterio que el Button, que tampoco tiene
  `icon-start`/`icon-end` en su primera versión.
- **Componente `form-field` de composición libre** (label en una celda de
  grid separada del campo): `<aegis-input>` posee su `<label>` en v1; un
  `form-field` que desacople esa relación es un componente futuro, no una
  variante de este.
- **Contador de caracteres / `maxlength` visual:** no se renderiza ningún
  contador; el atributo `maxlength` nativo no está expuesto como input
  propio en v1 (el consumidor puede añadirlo igualmente vía atributo HTML
  estándar, pero no aparece documentado ni testeado aquí).
- **Reconciliación con la validación nativa del navegador:** ver Casos
  límite — v1 no desactiva ni fusiona el mensaje nativo del navegador con
  `invalid`/`errorMessage` propios.
