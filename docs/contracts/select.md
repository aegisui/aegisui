# Contrato: Select

> **Estado:** implementación pendiente

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
| 1 | Cerrado, sin selección | `componentes-select--default` (pendiente) | light | Baseline: el disparador con `placeholder`, que es como se ve por primera vez |
| 2 | Cerrado, con selección | `componentes-select--selected` (pendiente) | light | El valor sustituye al placeholder — verifica que lo que se lee es el texto elegido, no el marcador |
| 3 | Abierto con opción activa | `componentes-select--open` (pendiente) | light | El caso central: panel, activa distinguible de la seleccionada, y anillo de foco **en el disparador** (si saltara a la opción, el patrón estaría roto y se vería aquí) |
| 4 | Abierto con opción activa | `componentes-select--open` (pendiente) | dark | El panel es superficie elevada: fondo y sombra son lo que más cambia entre temas |
| 5 | Deshabilitado | `componentes-select--disabled` (pendiente) | light | Umbral de contraste distinto (no exige 4.5:1) y hay que ver que no se confunde con "vacío" |
| 6 | Inválido con error | `componentes-select--invalid` (pendiente) | light | Borde de error y mensaje: comparte tokens con el Input y hay que ver que **coinciden** |
| 7 | Tamaños `sm`/`md`/`lg` | `componentes-select--sizes` (pendiente) | light | Escala del disparador; `sm` es donde el objetivo táctil roza el mínimo de 2.5.8 |
| 8 | Opciones deshabilitadas | `componentes-select--disabled-options` (pendiente) | light | Una deshabilitada **dentro** del panel: sigue visible y legible, no oculta (SPEC §8) |
| 9 | Truncado (>100) | `componentes-select--truncated` (pendiente) | light | La fila de estado del listbox: debe leerse como mensaje, **no** como una opción más |
| 10 | Sin resultados | `componentes-select--empty` (pendiente) | light | Panel con solo la fila de estado — que no parezca un panel roto o vacío por error |

> Todas las filas van marcadas `(pendiente)`: el componente aún no existe, así
> que sus historias tampoco. El marcador **caduca solo** — en cuanto la historia
> exista, dejarlo puesto es violación del gate `coverage`. Implementar OBLIGA a
> retirarlo, fila a fila.

## Presupuesto de tamaño

**Presupuesto marginal:** 3.50 kB brotli *(provisional, sin medir)*

> **Techo provisional, no medida.** La marca `*(provisional, sin medir)*` la
> vigila el gate `size-marginal` y **caduca sola**: en cuanto el componente exista,
> seguir marcado es violación. El contrato va antes que el código, así que
> este número **no puede** estar medido todavía — y un presupuesto sin medir no es
> "ceñido", que es justo lo que exigimos al resto. Se declara como **techo al que
> nos comprometemos** para que el componente no nazca sin nadie vigilándolo, y el
> PR de implementación **debe sustituirlo por medido + ~5 %**. Si la medida sale
> por encima del techo, se discute el componente, no se sube el número.
>
> Base del techo: el Select es piel delgada sobre primitivos que ya paga el `cdk`
> (el overlay y el listbox no entran en el marginal de `ui`), así que debería
> quedar cerca del Button (2.78 kB medido) más el panel.

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
