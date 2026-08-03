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
| `placeholder` | `string \| undefined` | `undefined` | no | Pista de formato, **no** sustituto de `label` (WCAG: un placeholder no es un nombre accesible; desaparece al escribir). En `labelMode='floating'`, el placeholder solo es visible cuando la etiqueta ya ha flotado (campo enfocado) — ver §Modo de etiqueta flotante. |
| `disabled` | `boolean` | `false` | no | Aplica el atributo nativo `disabled`: fuera de tabulación, sin edición, sin envío en formularios. |
| `readonly` | `boolean` | `false` | no | Aplica el atributo nativo `readonly`: **enfocable y seleccionable/copiable**, pero no editable. Distinto de `disabled` (SPEC §8: no ocultar del teclado algo que se puede leer). |
| `required` | `boolean` | `false` | no | Aplica `required` nativo + `aria-required`. El `label` muestra un indicador visual (`*`) marcado `aria-hidden` (el `required` nativo ya lo anuncia; el asterisco no debe anunciarse dos veces). |
| `invalid` | `boolean` | `false` | no | Refleja `aria-invalid="true"`. Es una señal **manual** del consumidor (v1 no trae validadores propios — ver Fuera de alcance): quien valide el formulario decide cuándo el campo está inválido. |
| `errorMessage` | `string \| undefined` | `undefined` | no | Mensaje de error. Solo se renderiza y se enlaza por `aria-describedby` cuando **`invalid` es `true`**. `invalid=true` sin `errorMessage` es válido (el campo se anuncia inválido igualmente vía `aria-invalid`) pero desaconsejado: sin mensaje, el usuario sabe que algo falla pero no qué corregir. |
| `helpText` | `string \| undefined` | `undefined` | no | Texto de ayuda persistente (no depende de `invalid`). Se enlaza por `aria-describedby` siempre que exista. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | no | Escala de padding, tipografía y área táctil. Igual que el Button, **todas** cumplen ≥ 24×24 px (2.5.8). |
| `labelMode` | `'stacked' \| 'floating'` | `'stacked'` | no | Modo de presentación de la etiqueta. `'stacked'` (default) mantiene el comportamiento actual: etiqueta encima del campo. `'floating'` posiciona la etiqueta dentro del campo en reposo y la eleva al enfocar, rellenar o autocompletar. **Retrocompatible:** ningún consumidor existente cambia de comportamiento. Ver §Modo de etiqueta flotante y §Cuándo NO usar `labelMode='floating'`. |
| `labelFloatStyle` | `'inset' \| 'notched'` | `'inset'` | no | Solo tiene efecto cuando `labelMode='floating'`. Controla la posición visual de la etiqueta en estado flotado. `'inset'` mantiene la etiqueta dentro del borde del campo. `'notched'` eleva la etiqueta sobre el borde superior, cortándolo visualmente (estilo Material). Default **`'inset'`** — ver §Modo de etiqueta flotante → *Estilos de flotado* para el argumento. |

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

## Modo de etiqueta flotante (`labelMode='floating'`)

> Diseñado para equivalencia con patrones establecidos (Material Design,
> Bootstrap Floating Label). Por defecto `'stacked'` es el modo recomendado
> — véase **§Cuándo NO usar `labelMode='floating'`** antes de adoptarlo.

### Cuándo flota la etiqueta

La etiqueta ocupa su posición flotada cuando se cumple **cualquiera** de estas
condiciones:

| Condición | Selector CSS | Motivo |
|---|---|---|
| Campo enfocado | `:focus-within` en el contenedor | El usuario está activamente escribiendo |
| Campo con valor | `.aegis-input__field:not(:placeholder-shown)` | El campo tiene contenido |
| Autocompletado del navegador | `.aegis-input__field:autofill`, `:-webkit-autofill` | El navegador rellenó el campo |

En todos los demás casos (campo vacío, sin foco, sin autofill), la etiqueta
reposa dentro del campo —sobre la zona de texto, igual que un placeholder.

### Autofill — el bug canónico

Chrome y otros navegadores rellenan campos sin disparar siempre eventos de
interacción. Sin tratamiento, la etiqueta queda en posición de reposo
superpuesta al texto que el gestor de contraseñas acaba de escribir.

La solución es **exclusivamente CSS**, nunca JS ni polling:

```css
.aegis-input__field:autofill ~ .aegis-input__label,
.aegis-input__field:-webkit-autofill ~ .aegis-input__label {
  /* fuerza estado flotado: mismo transform/posición que :focus-within */
}
```

`:-webkit-autofill` (con prefijo) es necesario para todos los motores Blink
y WebKit — Chrome, Edge, Opera, Samsung Browser y Safari en todas las versiones
actuales. No es específico de "Safari viejo": el prefijo `-webkit-` es el que
utilizan tanto WebKit (Safari) como Blink (Chromium). `:autofill` sin prefijo
es la forma estándar (disponible en Chrome ≥ 103, Firefox ≥ 86, Safari ≥ 15.4),
pero usar ambos selectores garantiza cobertura universal sin dependencias de
versión concreta.

El componente **no pelea contra el estilo visual del autofill** (fondo
amarillo/azul de Chromium, color de texto fijo de Safari): véase §Casos límite
— comportamiento ya documentado para el modo `stacked`, sin cambios aquí.
El `:autofill` CSS garantiza solo que la etiqueta suba.

### Placeholder en modo floating

El placeholder solo es visible cuando la etiqueta ya ha flotado (campo
enfocado). En reposo, el placeholder está oculto visualmente — la etiqueta
ocupa ese espacio y mostrar ambos sería solapamiento garantizado.

Implementación CSS recomendada:

```css
/* reposo con floating label: placeholder invisible */
.aegis-input--floating .aegis-input__field:not(:focus)::placeholder {
  color: transparent;
}
```

El atributo `placeholder` HTML permanece en el DOM — solo su color se vuelve
transparente. No se elimina ni se condiciona en el template: los gestores de
contraseñas lo usan para identificar el campo.

### Estilos de flotado

`labelFloatStyle` solo aplica cuando `labelMode='floating'`.

**Default `'inset'` — argumento:** la etiqueta `inset` flota siempre sobre
`--aegis-input-bg` (`surface-raised`), el mismo par de contraste ya verificado
en el contrato, y no depende de qué haya detrás del campo. `notched` sí depende:
su chip cubre el borde, y el borde separa dos superficies distintas (ver la nota
de abajo). `inset` funciona sin ningún override; `notched` necesita que la
superficie padre sea `surface-canvas` o que el consumidor ajuste un token.

| Estilo | Posición de reposo | Posición flotada | Fondo de la etiqueta |
|---|---|---|---|
| `'inset'` | Centrada verticalmente dentro del campo | Parte superior interna del campo | `--aegis-input-bg` (`surface-raised`) — par ya verificado |
| `'notched'` | Centrada verticalmente dentro del campo | Sobre el borde superior, cortándolo visualmente | Degradado de DOS paradas: `--aegis-input-label-notch-bg-outer` / `-inner` |

> **Nota sobre `'notched'`: el chip CABALGA el borde, y por eso no lleva un
> color, lleva dos.** Medido sobre el render real: la etiqueta flotada se
> posiciona con `inset-block-start: 0` y `translateY(-50%)`, así que **la mitad
> exacta de su alto queda por encima de la arista del campo y la otra mitad por
> debajo**. Detrás no hay una superficie, hay dos:
>
> - mitad **exterior** → el fondo de la página (`surface-canvas`)
> - mitad **interior** → el relleno del campo (`surface-raised`)
>
> Un color plano no puede ser invisible sobre las dos. Pintarlo todo de
> `surface-canvas` —como se hizo primero— deja la mitad inferior desentonando
> sobre el campo: el efecto "pegatina". La solución es un degradado de dos
> paradas al 50%, que no interpola porque ambas caen en el mismo punto.
>
> **El punto de corte es estructural, no un número mágico:** el 50% del chip
> coincide con el centro de su caja, que `translateY(-50%)` sitúa exactamente en
> la arista EXTERIOR del borde. Verificado con desvío `0` en `sm`, `md` y `lg`.
> La franja de 1px del borde queda pintada con `-inner`, que es lo correcto:
> debajo del borde hay campo. Partir a mitad del borde dejaría medio píxel en
> `canvas` y **ahí sí se vería una franja de color equivocado**.
>
> Los dos tokens son **alias de capa 2**, no tintes nuevos: no introducen ningún
> par de contraste que validar. El par de texto sigue siendo
> `text-strong / <superficie>`, ≥4.5:1 para cualquier superficie de Aegis.
>
> Si la superficie padre no es `surface-canvas` (p. ej. el Input dentro de una
> Card), el consumidor debe ajustar `--aegis-input-label-notch-bg-outer`.

### El flotado es puramente visual — el AT no percibe ninguna diferencia

La relación `<label for="…">` / `id` en el `<input>` **no cambia nunca** entre
`stacked` y `floating`. El nombre accesible del campo sigue viniendo del
`<label>` real. Un lector de pantalla anuncia exactamente lo mismo en ambos
modos.

**Prohibido:** sustituir el label por el placeholder como nombre accesible en
modo floating — el error clásico de las implementaciones oportunistas de este
patrón. `<aegis-input>` nunca lo hace: el `<label>` siempre existe y siempre
está enlazado.

## Cuándo NO usar `labelMode='floating'`

`labelMode='stacked'` es el **modo por defecto y el recomendado**. Los floating
labels tienen crítica documentada:

- **GOV.UK Design System** no los usa deliberadamente: los usuarios notan menos
  la etiqueta mientras escriben, lo que aumenta el riesgo de olvidar qué están
  rellenando — especialmente en formularios con muchos campos similares.
- **Adam Silver** (*Form Design Patterns*) los desaconseja: la etiqueta
  reducida es más difícil de leer para usuarios con baja visión que no usan
  zoom, y la referencia es inestable durante la escritura (la etiqueta se ha
  movido y encogido antes de que el usuario haya terminado).
- El texto reducido al flotar (`font-size-xs`, 0.64rem ≈ 10px a 16px base)
  está en el límite de legibilidad sin zoom. Con `prefers-reduced-motion`, la
  etiqueta salta bruscamente de posición sin aviso visual gradual.
- En formularios con **muchos campos**, coexisten etiquetas flotadas y etiquetas
  en reposo simultáneamente: el usuario gestiona dos estados de referencia
  visual en lugar de uno.
- El ahorro real es **espacio vertical cuando el campo está vacío**: si el
  formulario tiene espacio suficiente, `stacked` es siempre más claro.

**`labelMode='floating'` existe en Aegis UI por paridad de expectativa y por
preferencia estética de ciertos productos**, no porque sea la mejor opción para
la mayoría de los formularios. Quien lo adopte debe poder justificarlo con una
razón concreta (espacio escaso, contexto visual específico, audiencia ya
familiarizada con el patrón), no con "es lo que usa Material".

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

Etiqueta flotante (`labelMode='floating'` — nuevos):

- `--aegis-input-label-float-color` (color de la etiqueta en estado flotado)
- `--aegis-input-label-float-font-size` (tamaño reducido al flotar; suelo `font-size-xs`)
- `--aegis-input-label-float-font-weight` (peso al flotar)
- `--aegis-input-float-padding-block-start` (padding-block-start del campo en modo `inset`; crea espacio para la etiqueta flotada)
- `--aegis-input-label-notch-bg-outer` (mitad EXTERIOR del chip `notched`, la que queda sobre el fondo de la página; alias de `surface-canvas`)
- `--aegis-input-label-notch-bg-inner` (mitad INTERIOR del chip `notched`, la que queda sobre el relleno del campo; alias de `surface-raised`)
- `--aegis-input-label-notch-padding-inline` (relleno horizontal del chip `notched`)

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
| `--aegis-input-label-float-color` | `--aegis-color-text-strong` |
| `--aegis-input-label-notch-bg-outer` | `--aegis-color-surface-canvas` |
| `--aegis-input-label-notch-bg-inner` | `--aegis-color-surface-raised` |

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
| `text-strong` / `surface-raised` (valor; etiqueta flotada — inset) | 15.56:1 | 14.27:1 | ≥ 4.5:1 |
| `text-strong` / `surface-canvas` (etiqueta flotada — notched) | 15.14:1 | 15.22:1 | ≥ 4.5:1 |
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

**Par nuevo para `notched` — `text-strong` / `surface-canvas`:** ambos tokens
de capa 2 existían previamente (`text.strong`, `surface.canvas`); lo que no
existía era este **par documentado**. El gate `contrast` solo verifica lo que
se le enseña explícitamente (lección de ADR-018); al declararlo aquí queda bajo
su cobertura automática. Valores calculados con la misma fórmula WCAG
(`contrastRatio`, `scripts/gates/lib/util.mjs`): neutral.900 (#14211d) /
neutral.0 (#ffffff) = 15.14:1 en light; neutral.100 (#eaefec) / neutral.950
(#0d1512) = 15.22:1 en dark.

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
| `--aegis-input-label-float-font-size` | `--aegis-font-size-xs` (0.64rem; suelo legible para la etiqueta flotada — no reducir por debajo de este valor) |
| `--aegis-input-label-float-font-weight` | `--aegis-font-weight-medium` (sin cambio respecto a stacked; mantiene peso visual coherente) |
| `--aegis-input-float-padding-block-start` | `--aegis-space-5` (24px / 1.5rem; padding-block-start del campo en modo `inset` — crea espacio para la etiqueta flotada en la parte superior del campo) |
| `--aegis-input-label-notch-padding-inline` | `--aegis-space-1` (relleno horizontal del chip de la etiqueta en modo `notched`) |

> **Nota sobre `--aegis-input-float-padding-block-start` y el tamaño `sm`:**
> `space-5` (24 px) es el mismo valor que `--aegis-input-min-block-size`. En
> `size='sm'` con `labelMode='floating'` e `inset`, el solo padding superior
> ya iguala la altura mínima de un campo `sm` en modo `stacked`: el campo
> floating-inset `sm` resultante tiene aproximadamente el doble de altura
> que un `sm` stacked (~50 px vs ~36 px). **Esta es una consecuencia consciente,
> no un error.** El motivo: `space-4` (16 px) es insuficiente bajo WCAG 1.4.12
> con espaciado forzado (`font-size-xs × leading 1.5 ≈ 15.4 px`, dejando < 1 px
> de margen). `space-5` es el mínimo seguro. En modo `floating`, `sm` deja de
> ser pequeño en altura — mantiene su compacidad solo en el eje horizontal
> (padding-inline, font-size). Si se necesita un campo compacto en ambos ejes,
> el modo `stacked` es la elección correcta.

## Estados

| Estado | Disparador | Tratamiento |
|---|---|---|
| **default** | reposo | `--aegis-input-bg`/`fg`/`border-color` de reposo. |
| **hover** | puntero encima, no `disabled` | `--aegis-input-border-color-hover`. Solo refuerzo, nunca única señal (igual que el Button). |
| **focus-visible** | foco por teclado o clic | Anillo con `--aegis-input-focus-ring-*`; color del anillo depende de `invalid` (accent vs `state-danger-point`). |
| **disabled** | `disabled=true` | Atributo nativo `disabled`. Fuera de tabulación, sin hover, colores apagados (exento de contraste). |
| **readonly** | `readonly=true` | Atributo nativo `readonly`. Enfocable y seleccionable, no editable. Fondo `surface-sunken`, texto y borde con contraste normal (no exento). |
| **invalid** | `invalid=true` | `aria-invalid="true"`, borde y (si hay foco) anillo en `state-danger-point`, mensaje de error renderizado y enlazado si `errorMessage` existe. |
| **floating-resting** | `labelMode='floating'`, campo vacío sin foco | Etiqueta centrada verticalmente dentro del campo, `font-size` normal (`--aegis-input-label-font-size`), placeholder oculto. |
| **floating-active** | `labelMode='floating'` + (foco ∣ valor ∣ autofill) | Etiqueta en posición superior (`inset`) o sobre el borde (`notched`), `font-size` = `--aegis-input-label-float-font-size`. Placeholder visible solo si hay foco. |

`disabled` y `readonly` son independientes entre sí (a diferencia de
`disabled`/`loading` del Button, que eran mutuamente excluyentes por
precedencia): un campo puede ser `readonly` **e** `invalid` a la vez (mostrar
por qué un valor precargado no es válido, sin dejar que se edite ahí mismo).
`disabled` sí desactiva la relevancia de `invalid` visualmente (un campo
deshabilitado no se resalta en rojo), pero **no** apaga `aria-invalid`: el
atributo semántico se mantiene coherente con el estado lógico aunque no se
pinte.

En `labelMode='floating'` con `disabled=true`: si el campo tiene un valor
preexistente, la etiqueta permanece en posición flotada (el valor sigue siendo
visible y la etiqueta lo identifica). Si el campo está vacío, la etiqueta
permanece en reposo. La selección de posición sigue la misma lógica que el
estado no-disabled: `:not(:placeholder-shown)` sigue siendo verdadero si hay
valor, aunque el campo esté `disabled`.

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
- **`labelMode='floating'` — invariante de accesibilidad:** la relación
  `<label for>` / `id` no cambia nunca entre `stacked` y `floating`. El nombre
  accesible del campo sigue siendo el texto del `<label>` real, independiente de
  su posición visual. Un lector de pantalla no debe percibir ninguna diferencia
  entre los dos modos. Esto es verificable en CI: el gate `a11y` no distingue
  modos y pasa igual en ambos.

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

  **Limitación conocida — VoiceOver, caso 4** (cambio sucesivo del mensaje sin
  soltar el foco): VoiceOver anuncia el primer mensaje cuando `aria-invalid`
  cambia de `null` a `"true"`. Cambios posteriores del texto del error, sin
  nueva transición de `aria-invalid`, no se anuncian en directo; al reenfocar,
  VoiceOver puede leer el primer valor en lugar del actual. Sin solución limpia:
  cualquier señal extra para VoiceOver (aria-live, cambio de describedby en
  caliente) reactiva el doble anuncio en NVDA. NVDA anuncia todos los cambios
  correctamente. Detalle completo en ADR-019 §"Limitaciones conocidas".
- `helpText` (persistente, no ligado a un evento): igual, solo `aria-describedby`,
  sin `role`/`aria-live`. Nunca lo necesitó.

### Target size (2.5.8)

- Los tres tamaños ofrecen un objetivo táctil ≥ 24×24 px, garantizado por
  `--aegis-input-min-block-size` (no depende del contenido). Verificado por
  el gate `target-size` sobre el DOM renderizado de cada tamaño.
- **`labelMode='floating'`, modo `inset`:** el campo requiere espacio adicional
  en la parte superior para alojar la etiqueta flotada. `--aegis-input-float-padding-block-start`
  (`space-5` = 24px) se suma al `padding-block-end` normal y a la altura de la
  línea de texto: el campo supera los 24px en todos los tamaños. El objetivo
  táctil no disminuye — aumenta. Verificado con el gate `target-size` también
  para `labelMode='floating'`.
- **`labelMode='floating'`, modo `notched`:** la etiqueta sale fuera del borde
  (zona visual extra, no interactiva). Las dimensiones del campo en sí no cambian
  respecto al modo `stacked`. Target size ≥ 24px garantizado igual que en `stacked`.

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
- **Etiqueta flotada (`inset`):** `text-strong` / `surface-raised` — mismo par
  que el texto del valor; 15.56:1 / 14.27:1 ✓
- **Etiqueta flotada (`notched`):** `text-strong` / `surface-canvas` — nuevo
  par declarado en §Tokens → Riel de color; 15.14:1 / 15.22:1 ✓

Texto deshabilitado: exento de 1.4.3 (mismo criterio que el Button).

#### Valor a vigilar (criterio de regresión)

**`readonly` · borde sobre superficie hundida = 3.89:1** (`#6a7a73` sobre
`#eaefec`, light), medido sobre el render real de
`componentes-input--solo-lectura`. El mínimo de 1.4.11 es 3:1, así que el margen
es de **0.89 puntos** — el borde más ajustado del set mínimo.

Es el par más estrecho porque `readonly` es el único estado que pinta
`border-strong` sobre `surface.sunken` en vez de sobre `surface.raised`: el fondo
se acerca al borde y el contraste cae. `disabled` no cuenta aquí (exento, control
inactivo).

**Si un cambio de token deja este par por debajo de 3:1, es una REGRESIÓN**, no
un ajuste: se corrige `border.strong` o `surface.sunken`, nunca el umbral.
Cualquier PR que toque esos dos tokens tiene que volver a medirlo — y ojo, es
justo el token que ADR-018 ya tuvo que corregir una vez.

### Reduced motion (`prefers-reduced-motion`)

- Las transiciones de `background`/`border-color` se **anulan** bajo
  `prefers-reduced-motion: reduce` (regla `require-reduced-motion`).
- **`labelMode='floating'`:** la transición de posición y tamaño de la etiqueta
  flotante también se **anula** bajo `prefers-reduced-motion: reduce`. La
  etiqueta salta instantáneamente a su posición sin ninguna animación de
  traslado o escala. No se aplican `transition` ni `animation` en la etiqueta
  flotante cuando `prefers-reduced-motion: reduce`.

### Alto contraste forzado (`forced-colors: active`)

Bajo `@media (forced-colors: active)` (Windows High Contrast Mode, macOS
Contrast Themes y equivalentes), el navegador sustituye los colores del
documento por los del sistema. Los tokens `--aegis-input-*` quedan anulados.

**`labelMode='stacked'`:** el campo y la etiqueta reciben colores de sistema
automáticamente (`Field`/`FieldText`, `ButtonBorder`). Sin tratamiento especial
necesario — el resultado es accesible por defecto.

**`labelMode='floating'`:** la etiqueta flotante necesita tratamiento explícito
en ambos estilos.

- **`labelFloatStyle='inset'`:** si la implementación posiciona la etiqueta de
  modo que su área coincida visualmente con el borde superior del campo (p. ej.,
  `top: 0; transform: translateY(-50%)`), el borde del sistema puede atravesar
  visualmente el texto de la etiqueta. En forced-colors, `background-color`
  queda suprimido salvo que se declare explícitamente con `forced-color-adjust:
  none`.

- **`labelFloatStyle='notched'`:** el chip depende de sus dos tokens de fondo
  para cubrir el borde, y en forced-colors quedan anulados — el borde del
  sistema atravesaría la etiqueta. Es el caso más crítico del componente.
  **Trampa verificada:** el chip pinta un `background-image` (el degradado de
  dos paradas), y una imagen de fondo se dibuja POR ENCIMA del
  `background-color`. Declarar solo `background-color: Canvas` NO basta: el
  degradado de marca seguiría tapando el color del sistema. Hay que anular
  también `background-image`. Es el mismo fallo que descarta `border-image` y
  el trazo SVG para un corte real de borde: pintura que el sistema no
  recolorea. Con `background-image: none` + `background-color: Canvas` +
  `color: CanvasText`, **no hace falta `forced-color-adjust: none`** — y por
  tanto la limitación de WebKit descrita arriba deja de aplicar a la etiqueta.

Regla CSS de referencia para la implementación (obligatoria en `floating`):

```css
@media (forced-colors: active) {
  .aegis-input--floating .aegis-input__label {
    background-color: Canvas;
    color: CanvasText;
    forced-color-adjust: none;
  }
}
```

`Canvas` es el fondo de la página en el esquema de colores del sistema del
usuario; `CanvasText` es el color de texto correspondiente. Juntos garantizan
que la etiqueta flotante tenga fondo opaco y texto legible en cualquier tema de
contraste forzado.

> `forced-color-adjust: none` impide que el UA anule estas declaraciones. Se
> aplica **solo al elemento de la etiqueta flotante**, no al campo ni al
> contenedor: las sustituciones del sistema sobre el campo (`Field`,
> `FieldText`, `ButtonBorder`) son deseables y no deben interferirse.
>
> **Limitación en Safari:** `forced-color-adjust` no está soportado en Safari
> (no está implementado en WebKit a 2026-08-02). En macOS con Contrast Themes
> activo, la etiqueta flotada puede no mantener el fondo `Canvas` declarado.
> Documentado como limitación de plataforma, no como defecto de la librería.

**Verificación manual** (añadir al banco `aegis-input-a11y-manual`): activar
Windows High Contrast Mode (o Forced Colors en DevTools → Rendering → Emulate
CSS media feature `forced-colors: active`) y comprobar los tres modos
(`stacked`, `floating-inset`, `floating-notched`) en reposo y enfocado.
Criterio: etiqueta legible, borde del campo visible, anillo de foco visible.
Esta verificación se añade a la lista del pase manual obligatorio de §8.4
junto con el pase de lectores de pantalla (NVDA+Firefox, VoiceOver+Safari).

### Espaciado de texto (1.4.12)

Sin alturas fijas en px: `--aegis-input-min-block-size` + padding, el campo
**crece** si el usuario fuerza interlineado/espaciado (`no-fixed-text-height`).

**`labelMode='floating'` — análisis adicional:** al forzar `line-height: 1.5×`
(requerimiento WCAG 1.4.12), la etiqueta flotada en `font-size-xs` (0.64rem)
alcanza una altura de ~0.96rem (≈15.4px a 16px base). Con `--aegis-input-float-padding-block-start`
= `space-5` (1.5rem = 24px), la diferencia entre el padding y la altura de la
etiqueta es ≥8px — suficiente para que el texto del campo no se solape con la
etiqueta. El campo no tiene altura fija: si el espaciado forzado hace crecer la
etiqueta flotada, el campo crece con ella. La etiqueta nunca queda recortada
ni solapada al texto del campo bajo condiciones de espaciado forzado.

### Criterios WCAG que aplican

1.3.1 (relación label/campo por `for`/`id` programática), 1.4.3, 1.4.10,
1.4.11, 1.4.12, 2.1.1, 2.1.2, 2.4.7, 2.4.11, 2.5.8, 3.3.1 (identificación de
error), 3.3.2 (labels/instrucciones), 4.1.2, 4.1.3, `prefers-reduced-motion`,
y `forced-colors` (Windows High Contrast / Contrast Themes).

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
  sincroniza sin código adicional. En `labelMode='floating'`, el selector
  `:autofill` / `:-webkit-autofill` garantiza además que la etiqueta suba
  para no solaparse al texto rellenado por el navegador (ver §Modo de etiqueta
  flotante → *Autofill*).
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
- **`labelMode='floating'` sin `placeholder`:** válido y el caso más común. La
  etiqueta en reposo ocupa la zona donde estaría el placeholder, actuando
  visualmente como guía de contenido esperado. Sin placeholder, no hay texto
  que colisione con la etiqueta al enfocar.
- **`labelMode='floating'` con `labelFloatStyle='notched'` en campo `sm`:** la
  etiqueta en `font-size-xs` flotando sobre el borde de un campo pequeño puede
  crear una zona táctil visualmente reducida. Sin embargo, el campo en sí
  mantiene `min-block-size: space-5` (24px): el target-size del campo no se ve
  afectado por la posición de la etiqueta. El elemento etiqueta no es interactivo
  por sí solo (el clic sobre la etiqueta mueve el foco al `<input>` por la
  relación `for`/`id`, comportamiento nativo del `<label>`).

## Matriz visual representativa (`labelMode='floating'`)

> La matriz completa (2 estilos × 3 tamaños × ~8 estados × 2 temas) da >90
> snapshots. La mayoría son redundantes: la diferencia visual entre `notched-sm`
> y `notched-lg` no aporta información distinta más allá de la que ya dan
> `inset-sm`/`inset-lg`. Se propone una matriz de 16 snapshots representativos.

**Criterio de selección:** cada snapshot aporta información visual que ningún
otro ya contiene. Se excluyen combinaciones donde la variable adicional produce
la misma diferencia que una ya cubierta (p. ej., `notched-sm` vs. `notched-lg`
muestra el mismo fenómeno de escala que `inset-sm` vs. `inset-lg`, que ya está).

| # | `labelFloatStyle` | `size` | Estado del campo | Historia | Tema | Información distinta que aporta |
|---|---|---|---|---|---|---|
| 1 | `inset` | md | reposo, vacío | `componentes-input--floating-inset` | light | Baseline: etiqueta centrada dentro del campo, placeholder oculto |
| 2 | `notched` | md | reposo, vacío | `componentes-input--floating-notched` | light | Baseline notched: misma posición de reposo — verifica que no hay diferencia visual en reposo |
| 3 | `inset` | md | enfocado, vacío | `componentes-input--floating-inset` | light | Float inset: etiqueta en la parte superior interna; placeholder ahora visible |
| 4 | `notched` | md | enfocado, vacío | `componentes-input--floating-notched` | light | Float notched: etiqueta sobre el borde; chip de dos paradas sin costura; el borde queda "cortado" visualmente |
| 5 | `inset` | md | relleno, sin foco | `componentes-input--floating-relleno` (pendiente) | light | Float inset en reposo con valor: placeholder oculto, etiqueta pequeña arriba |
| 6 | `notched` | md | relleno, sin foco | `componentes-input--floating-notched-relleno` (pendiente) | light | Float notched en reposo con valor: notch sobre canvas sin foco — contraste nuevo `text-strong/canvas` |
| 7 | `inset` | md | enfocado, inválido | `componentes-input--floating-invalido` | light | Float + danger: borde rojo + anillo + etiqueta flotada inset |
| 8 | `notched` | md | enfocado, inválido | `componentes-input--floating-notched-invalido` (pendiente) | light | Float + danger: borde rojo + notch + etiqueta sobre canvas |
| 9 | `inset` | md | autofill | `componentes-input--floating-autofill` (pendiente) | light | Caso canónico del bug: estilos de navegador + label forzado a flotar por `:autofill` |
| 10 | `inset` | sm | enfocado, vacío | `componentes-input--floating-tamanos` | light | Tamaño `sm`: label-xs sobre campo pequeño — verifica legibilidad mínima |
| 11 | `inset` | lg | enfocado, vacío | `componentes-input--floating-tamanos` | light | Tamaño `lg`: label-xs sobre campo grande — verifica proporción label/campo |
| 12 | `inset` | md | reposo, vacío | `componentes-input--floating-inset` | dark | Dark baseline: `surface-raised` dark (#14211d sobre #1e2d29) |
| 13 | `notched` | md | enfocado, vacío | `componentes-input--floating-notched` | dark | Dark notched: chip sobre `surface-canvas` dark (#0d1512) — el par más nuevo en dark |
| 14 | `inset` | md | relleno, sin foco | `componentes-input--floating-relleno` (pendiente) | dark | Dark filled: contraste etiqueta flotada sobre campo en dark |
| 15 | `inset` | md | enfocado, inválido | `componentes-input--floating-invalido` | dark | Dark invalid: rojo en dark + float |
| 16 | `inset` | md | `disabled`, con valor | `componentes-input--floating-deshabilitado-con-valor` | light | Disabled float: campo atenuado, etiqueta en posición flotada (hay valor) |

**Redundantes excluidos:**
- `notched` × `sm`/`lg`: el fenómeno de escala ya está en `inset-sm`/`inset-lg`
  (snapshots 10/11); la notch no añade información nueva a distintos tamaños.
- `notched` × dark × `invalid`: el par `text-strong/canvas` dark ya está en snapshot 13;
  `invalid` en dark ya está en snapshot 15; la combinación no suma información distinta.
- `notched` × `disabled`, `notched` × `autofill`: el mecanismo CSS de autofill y
  el tratamiento de disabled son independientes del estilo de notch.
- `readonly` × floating: el comportamiento es idéntico a default en cuanto a posición
  de la etiqueta; solo cambia el fondo del campo (ya cubierto por el gate visual
  de `stacked`).

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
- [ ] `labelMode='stacked'` (default): comportamiento idéntico al de este
      contrato antes de la adición de `labelMode` — ningún cambio de DOM, CSS
      ni a11y respecto al comportamiento base.
- [ ] `labelMode='floating'`: la etiqueta tiene posición `floating-resting`
      cuando el campo está vacío y sin foco; posición `floating-active` cuando
      el campo está enfocado.
- [ ] `labelMode='floating'`: la etiqueta tiene posición `floating-active`
      cuando `value` no es vacío (campo relleno, aunque no esté enfocado).
- [ ] `labelMode='floating'`: el placeholder (si existe) está visualmente
      oculto en `floating-resting`; visible cuando el campo está enfocado.
- [ ] `labelMode='floating'`: la relación `<label for>` / `id` del `<input>`
      es idéntica a `labelMode='stacked'` — el AT no percibe ninguna diferencia.
- [ ] `labelFloatStyle='inset'`: la etiqueta flotada permanece dentro del borde
      del campo.
- [ ] `labelFloatStyle='notched'`: la etiqueta flotada se posiciona sobre el
      borde superior con un fondo de DOS paradas al 50%
      (`--aegis-input-label-notch-bg-outer` / `-inner`), cuyo punto de corte
      cae en la arista exterior del borde en los tres tamaños.
- [ ] Bajo `prefers-reduced-motion`, la etiqueta salta a su posición sin
      transición (cero `transition`/`animation` en el elemento etiqueta).
- [ ] `disabled=true` con `labelMode='floating'` y valor presente: etiqueta en
      posición `floating-active`; sin valor, en posición `floating-resting`.

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
- [ ] 0 violaciones con `labelMode='floating'` en cada `labelFloatStyle`,
      en los 3 tamaños, en ambos temas.

Contraste (gate `contrast`):

- [ ] Cada par fg/bg de la tabla cumple su umbral en **light y dark**, incluido
      el nuevo par `text-strong` / `surface-canvas` (etiqueta flotada — notched).

Target size (gate `target-size`):

- [ ] Cada tamaño (incl. `sm`) mide ≥ 24×24 px en el DOM renderizado.
- [ ] Con `labelMode='floating'` en modo `inset`, el campo sigue midiendo
      ≥ 24px de bloque-size en los 3 tamaños.

Visual (gate `visual`):

- [ ] Snapshot de cada tamaño × estado (`default`/`disabled`/`readonly`/
      `invalid`), en **light y dark**, sin diffs no aprobados.
- [ ] Los 16 snapshots de la §Matriz visual representativa (`labelMode='floating'`)
      sin diffs no aprobados.

Reduced motion:

- [ ] Bajo `prefers-reduced-motion`, las transiciones de borde/fondo se anulan.
- [ ] Bajo `prefers-reduced-motion`, la transición de posición y tamaño de la
      etiqueta flotante se anula (la etiqueta salta, no viaja).

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
- [ ] **Pendiente** — forced-colors (Windows High Contrast Mode o Forced Colors
      vía DevTools). Casos: `stacked`, `floating-inset` y `floating-notched`,
      en reposo y enfocado. Criterio: etiqueta legible, borde del campo visible,
      anillo de foco visible. Solo aplica cuando `labelMode='floating'` esté
      implementado. Limitación conocida: el fondo `Canvas` de la etiqueta puede
      no preservarse en Safari/WebKit (ver §Alto contraste forzado).

## Fuera de alcance

- **`textarea` (multilínea), `select`/`combobox`, inputs con máscara:**
  componentes aparte de la Fase 4 — v1 es solo texto de una línea.
- **`labelMode='floating'` en `textarea`/`select`:** fuera de alcance en v1.
  Cuando estos componentes existan, evaluarán el patrón floating por separado
  (los requisitos de autocompletado, desbordamiento de texto y tamaño mínimo
  son distintos).
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
- **Animación "morphing" del placeholder a label:** el placeholder y la
  etiqueta son elementos distintos; no hay efecto de morphing ni de
  transformación del texto de uno al otro.
- **Etiquetas de más de una línea en modo floating:** la etiqueta flotante
  se asume de una sola línea. Etiquetas largas que quiebren línea en
  `font-size-xs` pueden solapar el contenido del campo en modo `inset` —
  sin corrección en v1; el consumidor debe usar etiquetas concisas en
  modo floating.
