# Contrato: Select

Primera de las dos pieles de la Fase 5. Es una **configuración fina** sobre
[`AegisOverlay`](./cdk/overlay.md) y [`AegisListbox`](./cdk/listbox.md): aquí no
vive lógica de foco, teclado ni posicionamiento. Si algo de eso hiciera falta,
va al `cdk` — nunca a esta piel (SPEC §brain/skin, ADR-002).

## Propósito

`<aegis-select>` deja elegir **una** opción de una lista cerrada, con un
disparador que muestra la elección actual.

**Cuándo NO usarlo:**

- El usuario necesita **buscar/filtrar** entre muchas opciones → `<aegis-combobox>`
  ([contrato](./combobox.md)).
- Menos de ~4 opciones que caben a la vista y no compiten por espacio → un grupo
  de radios: se ven todas de golpe, sin abrir nada.
- Es una **acción**, no una elección de valor → un menú (fuera de v1).
- Selección múltiple → fuera de alcance en v1 (§Fuera de alcance).

## Selector

`aegis-select`. Renderiza un `<button>` nativo real como disparador y un
contenedor con `role="listbox"` como panel.

### Por qué el disparador NO reutiliza `<aegis-button>`

Aunque el elemento sea un `<button>`, **un disparador de select no es un botón de
acción**: se ve y se lee como un **campo de formulario** (borde de campo, etiqueta
asociada, estado de error), no como una llamada a la acción. Reutilizar
`<aegis-button>` traería su piel de CTA (variantes `primary`/`destructive`,
spinner de `loading`, tamaños de botón) y habría que neutralizarla entera — un
componente peleándose con su propia piel.

Es la razón contraria a la del Combobox, y por eso las dos decisiones difieren:
allí el campo editable **sí** es exactamente un input de formulario y se reutiliza
`<aegis-input>` ([combobox.md §Reutilización](./combobox.md)); aquí no lo es.

Lo que sí se comparte es lo que importa: el **brain**. El disparador no
reimplementa foco, teclado ni posicionamiento — todo eso lo ponen `AegisOverlay` y
`AegisListbox`.

## Inputs (signals)

| Nombre | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | `string` | `''` | Nombre accesible. Omitirlo es defecto, igual que en el Input. |
| `options` | `readonly T[]` | `[]` | Colección completa. El cap lo aplica el listbox. |
| `optionLabel` | `string \| ((option: T) => string)` | *(sin valor)* | Se **pasa tal cual** al listbox. |
| `placeholder` | `string` | `''` | Texto del disparador sin selección. |
| `disabled` | `boolean` | `false` | |
| `invalid` | `boolean` | `false` | |
| `errorMessage` | `string \| undefined` | `undefined` | |
| `helpText` | `string \| undefined` | `undefined` | |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Misma escala que el Input. |
| `disabledOptions` | `readonly T[]` | `[]` | Se pasa al listbox. |
| `placement` | `AegisPlacement` | `'bottom-start'` | Se pasa al overlay. |

### Model

| Nombre | Tipo | Descripción |
|---|---|---|
| `value` | `T \| undefined` | Opción seleccionada, two-way. |
| `open` | `boolean` | Panel abierto, two-way. |

### Outputs

| Nombre | Payload | Cuándo |
|---|---|---|
| `selectionChange` | `T` | El usuario comprometió una opción. No se emite al navegar. |

## Configuración de los primitivos — el corazón del contrato

Esto es lo que el Select *es*: una configuración concreta. Cada valor, decidido:

| Primitivo | Input | Valor | Por qué |
|---|---|---|---|
| `AegisListbox` | `editable` | **`false`** | No hay campo de texto. `Space` selecciona. Explícito, **no inferido** de `typeahead` (enmienda 2 de listbox.md). |
| `AegisListbox` | `typeahead` | **`true`** | Sin campo donde escribir, saltar por prefijo es la única búsqueda posible. |
| `AegisListbox` | `filter` | **`''`** (fijo) | El Select no filtra. Filtrar es lo que lo convertiría en Combobox. |
| `AegisListbox` | `loop` | `true` | |
| `AegisOverlay` | `matchAnchorWidth` | **`true`** | El panel mide lo que el disparador: es el caso canónico del input. |
| `AegisOverlay` | `maxHeightFromViewport` | **`true`** | La lista scrollea en vez de desbordar (1.4.10 Reflow). |
| `AegisOverlay` | `flip` / `shift` | `true` | Un panel que tapa el disparador enfocado viola 2.4.11. |

**`Space` selecciona porque `editable=false`**, no porque el typeahead esté
encendido. Esa distinción es exactamente la enmienda 2 del listbox, y este
contrato es su primer consumidor real.

## Tokens que consume

Lista **exhaustiva** de tokens de **capa 3** (ADR-016: locales al componente, dos
rieles — color→capa 2, estructura→capa 1). Los define el propio CSS del
componente en su `:host`, y de ahí salen a capa 2. Cero literales
(`no-literal-design-values`), y la palabra `dark` no aparece: el tema vive en
los tokens.

Los verifica la regla `tokens-declared-in-contract`: **cualquier
`var(--aegis-*)` del CSS que no esté en esta lista es error de lint**.

### Disparador

Superficie y texto:

- `--aegis-select-bg`
- `--aegis-select-fg`
- `--aegis-select-placeholder-color`
- `--aegis-select-border-color`
- `--aegis-select-border-color-hover`
- `--aegis-select-border-color-invalid`
- `--aegis-select-border-width`

Foco:

- `--aegis-select-focus-ring-color`
- `--aegis-select-focus-ring-color-invalid`
- `--aegis-select-focus-ring-width`
- `--aegis-select-focus-ring-offset`

Forma, tipografía y espaciado:

- `--aegis-select-radius`
- `--aegis-select-font-size`
- `--aegis-select-padding-inline`
- `--aegis-select-padding-block`
- `--aegis-select-min-height`
- `--aegis-select-gap`

Indicador (la flecha):

- `--aegis-select-indicator-color`
- `--aegis-select-indicator-size`

Etiqueta, ayuda y error — **los mismos roles que el Input**, para que un Select y
un Input uno al lado del otro no se vean como de librerías distintas:

- `--aegis-select-label-color`
- `--aegis-select-label-font-size`
- `--aegis-select-label-font-weight`
- `--aegis-select-label-gap`
- `--aegis-select-help-color`
- `--aegis-select-help-font-size`
- `--aegis-select-error-color`
- `--aegis-select-error-font-size`

### Panel y opciones

Panel:

- `--aegis-select-panel-bg`
- `--aegis-select-panel-border-color`
- `--aegis-select-panel-border-width`
- `--aegis-select-panel-radius`
- `--aegis-select-panel-shadow`
- `--aegis-select-panel-padding-block`

Opción:

- `--aegis-select-option-fg`
- `--aegis-select-option-padding-inline`
- `--aegis-select-option-padding-block`
- `--aegis-select-option-min-height`
- `--aegis-select-option-bg-active`
- `--aegis-select-option-fg-active`
- `--aegis-select-option-bg-selected`
- `--aegis-select-option-fg-selected`
- `--aegis-select-option-fg-disabled`

Fila de estado (truncado / sin resultados):

- `--aegis-select-status-color`
- `--aegis-select-status-font-size`

**`option-bg-active` y `option-bg-selected` son tokens distintos a propósito.**
Activa (foco virtual) y seleccionada son estados distintos que pueden coincidir en
la misma fila; si compartieran token, el usuario no podría distinguir "dónde estoy"
de "qué elegí" — el mismo error conceptual que confundir `activeIndex` con
`value` en el listbox.

### Capa 2 a la que mapean

- `--aegis-color-surface-raised`, `--aegis-color-surface-sunken`,
  `--aegis-color-surface-canvas`
- `--aegis-color-text-strong`, `--aegis-color-text-muted`,
  `--aegis-color-text-subtle`
- `--aegis-color-border-separator`, `--aegis-color-border-strong`
- `--aegis-color-accent-bg`, `--aegis-color-accent-text`,
  `--aegis-color-accent-border`, `--aegis-color-accent-ring`
- `--aegis-color-state-danger-text`, `--aegis-color-state-danger-point`
- `--aegis-font-size-xs`, `--aegis-font-size-sm`, `--aegis-font-size-base`,
  `--aegis-font-size-lg`
- `--aegis-font-weight-medium`, `--aegis-font-leading-normal`
- `--aegis-border-width-hairline`, `--aegis-border-width-thin`
- `--aegis-focus-ring-width`, `--aegis-focus-ring-offset`
- `--aegis-radius-md`, `--aegis-space-1`, `--aegis-space-2`, `--aegis-space-3`
- `--aegis-elevation-2` (el panel es superficie elevada)
- `--aegis-space-5` (altura mínima de disparador y opción — objetivo táctil de 2.5.8)

### Custom properties del overlay — NO son tokens

El primitivo escribe `--aegis-overlay-x`, `--aegis-overlay-y`,
`--aegis-overlay-available-height` y `--aegis-overlay-anchor-width`. El CSS del
panel las consume, pero **no son decisiones de diseño**: son geometría calculada
en tiempo real. Se listan aquí solo para que `tokens-declared-in-contract` no las
tome por tokens sin declarar ([overlay.md §Lo que expone al CSS](./cdk/overlay.md)).

## Accesibilidad (WCAG 2.2 AA — SPEC §8)

### Roles y foco virtual

- Disparador: `<button role="combobox">` con `aria-expanded`, `aria-controls`
  (id del panel), `aria-haspopup="listbox"` y `aria-activedescendant` cuando está
  abierto.
- Panel: `role="listbox"`; opciones `role="option"` con `aria-selected`.
- **El foco DOM se queda en el disparador** mientras el panel está abierto. La
  opción activa viaja por `aria-activedescendant`. No se mueve el foco a las
  opciones — es el corazón del patrón y el error más común.
- El nombre accesible del disparador sale de `label`; el **valor** seleccionado se
  lee como contenido del disparador.

### Teclado

Fuente de verdad del gate `keyboard`.

| Tecla | Comportamiento |
|---|---|
| `Enter` | Cerrado: abre. Abierto: selecciona la activa y cierra. |
| `Space` | Cerrado: abre. Abierto: selecciona la activa y cierra (`editable=false`). |
| `ArrowDown` | Cerrado: abre y activa la primera (o la seleccionada). Abierto: siguiente. |
| `ArrowUp` | Cerrado: abre y activa la última (o la seleccionada). Abierto: anterior. |
| `Home` / `End` | Abierto: primera / última habilitada. |
| `Escape` | Cierra y devuelve el foco al disparador (nativo de `popover="auto"`). |
| *(imprimibles)* | Typeahead del listbox. |

`data-handles`: `Enter Space ArrowDown ArrowUp Home End`.

`Escape` **no** se declara en `data-handles`: no lo maneja el Select, lo maneja la
Popover API nativa. Declarar lo que no manejas es tan falso como no declarar lo
que sí.

### Criterios que aplican

1.3.1, 2.1.1, 2.1.2, 2.4.3, 2.4.7, **2.4.11** (el panel no obscurece el
disparador enfocado), 3.3.2, 4.1.2.

## Estados

Reposo, hover, foco, abierto, con selección, deshabilitado, inválido. El anillo de
foco vive en el disparador **siempre** — también con el panel abierto, porque ahí
sigue el foco real.

## Casos límite

- **`options` vacío**: el panel abre y muestra *"Sin resultados."* (fila de estado
  del listbox). No se abre un panel vacío sin explicación.
- **`value` fuera de `options`**: se conserva; el disparador muestra su etiqueta
  vía `optionLabel`; ninguna opción marca `aria-selected`.
- **Abrir con selección previa**: la activa arranca en la seleccionada, no en la
  primera.
- **`disabled` con el panel abierto**: se cierra.
- **Más de `maxVisible` opciones**: aplica el cap del listbox con su fila de
  truncado. El Select **no** lo reimplementa ni lo desactiva.
- **RTL**: el panel se alinea por `start`/`end`; lo resuelve el overlay.

## Matriz visual representativa

Esta piel **renderiza**, así que declara matriz (no se exime — la exención es solo
para primitivos headless, ADR-023).

**Criterio de selección:** cada snapshot aporta información visual que ningún
otro ya contiene. Se excluyen las combinaciones cuya variable adicional produce
la misma diferencia que otra ya cubierta.

| # | Variante | Historia | Tema | Información distinta que aporta |
|---|---|---|---|---|
| 1 | Cerrado, sin selección | `componentes-select--default` | light | Baseline: el disparador con `placeholder`, que es como se ve por primera vez |
| 2 | Cerrado, con selección | `componentes-select--selected` | light | El valor sustituye al placeholder — verifica que lo que se lee es el texto elegido, no el marcador |
| 3 | Abierto con opción activa | `componentes-select--open` | light | El caso central: panel, activa distinguible de la seleccionada, y anillo de foco **en el disparador** (si saltara a la opción, el patrón estaría roto y se vería aquí) |
| 4 | Abierto con opción activa | `componentes-select--open` | dark | El panel es superficie elevada: fondo y sombra son lo que más cambia entre temas |
| 5 | Deshabilitado | `componentes-select--disabled` | light | Umbral de contraste distinto (no exige 4.5:1) y hay que ver que no se confunde con "vacío" |
| 6 | Inválido con error | `componentes-select--invalid` | light | Borde de error y mensaje: comparte tokens con el Input y hay que ver que **coinciden** |
| 7 | Tamaños `sm`/`md`/`lg` | `componentes-select--sizes` | light | Escala del disparador; `sm` es donde el objetivo táctil roza el mínimo de 2.5.8 |
| 8 | Opciones deshabilitadas | `componentes-select--disabled-options` | light | Una deshabilitada **dentro** del panel: sigue visible y legible, no oculta (SPEC §8) |
| 9 | Truncado (>100) | `componentes-select--truncated` | light | La fila de estado del listbox: debe leerse como mensaje, **no** como una opción más |
| 10 | Sin resultados | `componentes-select--empty` | light | Panel con solo la fila de estado — que no parezca un panel roto o vacío por error |

> Todas las filas van marcadas `(pendiente)`: el componente aún no existe, así
> que sus historias tampoco. El marcador **caduca solo** — en cuanto la historia
> exista, dejarlo puesto es violación del gate `coverage`. Implementar OBLIGA a
> retirarlo, fila a fila.

## Presupuesto de tamaño

**Presupuesto marginal:** 16.20 kB brotli

Medido con app Angular real contra `dist/`: **15.43 kB**, más ~5 % de margen.

### El techo provisional era 3.50 kB y estaba mal

No se sube el número sin explicar por qué falló, así que: el techo asumía que
*"el overlay y el listbox no entran en el marginal de `ui`"*. **Esa suposición es
falsa y está medida.** El gate construye una app que usa **solo** el Select, y
esa app arrastra los dos primitivos y Floating UI enteros.

Atribución medida (misma app real, mismo método):

| Pieza | Coste sobre una app vacía |
|---|---|
| `AegisListbox` solo | 5.73 kB |
| `AegisOverlay` solo (con Floating UI dentro) | 9.00 kB |
| **Suma de los dos primitivos** | **14.73 kB** |
| Select completo | 15.43 kB |
| **→ piel propia del Select** | **~0.70 kB** |

**La piel pesa 0.70 kB.** Eso es exactamente lo que "configuración fina, no lógica
nueva" debe producir, y es la lectura optimista del número: el componente está
bien: lo caro es la infraestructura que habilita, no él.

### Lo que este presupuesto NO vigila bien

Con el listón en 16.20 kB, **una regresión de 1 kB en la piel se pierde en el
ruido** de una dependencia que ni siquiera es suya. El presupuesto cumple su
función original —avisar si el coste total se dispara— pero **no vigila el código
propio del componente**, que es lo que un presupuesto por componente debería
vigilar.

Es [#36](https://github.com/aegisui/aegisui/issues/36) generalizado: allí el
doble-conteo era entre componentes de `ui`; aquí es `ui` → `cdk` → dependencia
externa, y es **mayor**. El número honesto para esta piel sería

```
marginal_neto(Select) = Δ(app con overlay+listbox+Select) − Δ(app con overlay+listbox)
```

que es ~0.70 kB y sí se movería con un descuido de 1 kB. Hasta que ese gate
exista, este presupuesto vigila el bruto, **dicho en voz alta aquí** para que
nadie lea 16.20 kB como "hay sitio de sobra".

## Criterios de aceptación (se convierten en tests 1:1)

- [ ] El disparador es un `<button>` nativo con `role="combobox"`.
- [ ] `aria-expanded` refleja `open` en las dos direcciones.
- [ ] `aria-controls` apunta al id del panel, y ese id **existe** en el DOM.
- [ ] Abierto, `aria-activedescendant` apunta a una opción **renderizada**;
      cerrado, el atributo **no está**.
- [ ] Navegar con flechas **no** cambia `value` ni emite `selectionChange`.
- [ ] `Enter` y `Space` seleccionan y cierran.
- [ ] **`Space` selecciona con `typeahead=false`**: la condición es `editable`, no
      el typeahead (raíl de la enmienda 2 de listbox.md).
- [ ] Cerrar con `Escape` devuelve el foco al disparador.
- [ ] El foco DOM permanece en el disparador durante toda la navegación.
- [ ] Abrir con `value` ya puesto activa la opción seleccionada, no la primera.
- [ ] `matchAnchorWidth` hace que el panel mida lo que el disparador.
- [ ] Con `options` vacío, el panel muestra la fila *"Sin resultados."*.
- [ ] `disabled` impide abrir; si estaba abierto, cierra.
- [ ] Cero literales de diseño en el CSS: solo `var(--aegis-*)` de capa 3.
- [ ] La palabra `dark` no aparece en su CSS.

Accesibilidad (gate `a11y`):

- [ ] 0 violaciones cerrado y abierto, en light y dark.
- [ ] **2.4.11**: con el disparador pegado a cada borde del viewport, el panel no
      lo obscurece.

Manual (antes de release):

- [ ] **Pendiente** — NVDA+Firefox y VoiceOver+Safari (§Pase manual de
      [combobox.md](./combobox.md), que cubre los dos con el mismo guion).

## Fuera de alcance

- **Selección múltiple**: v1 es selección simple.
- **Filtrado / búsqueda**: eso es el Combobox.
- **Agrupación** (`optgroup`, `role="group"`).
- **Virtual scroll**: ADR-023 §4. El cap de ~100 es el comportamiento de v1.
- **Reutilizar `<aegis-button>`** como disparador (ver §Selector).
