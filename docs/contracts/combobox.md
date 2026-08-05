# Contrato: Combobox

> **Estado:** implementación pendiente

Última pieza del set. Como el [Select](./select.md), es una **configuración fina**
sobre [`AegisOverlay`](./cdk/overlay.md) y [`AegisListbox`](./cdk/listbox.md), más
la reutilización del [Input](./input.md) real como campo editable.

Es el patrón más difícil de los que hemos hecho: foco virtual sobre un campo de
texto que además filtra. Por eso el **pase manual con dos lectores** no es un
trámite aquí, es donde se comprueba de verdad (§Pase manual).

## Propósito

`<aegis-combobox>` deja elegir **una** opción de una lista **escribiendo para
filtrar**. Es el Select cuando la lista es demasiado larga para recorrerla.

**Cuándo NO usarlo:**

- Pocas opciones que se recorren sin esfuerzo → `<aegis-select>`.
- El usuario puede introducir **texto libre** que no esté en la lista → un
  `<aegis-input>` con sugerencias; este componente **siempre** compromete una
  opción de la lista (§Fuera de alcance).
- Búsqueda que navega a resultados en otra página → un buscador, no un combobox.

## Reutilización del Input real — el punto de integración

El campo editable **es un `<aegis-input>`**, no una versión paralela. El Combobox
no reimplementa etiqueta, etiqueta flotante, `helpText`, `errorMessage`, tamaños
ni su CSS: los consume.

Eso es posible gracias a la enmienda `controlAttrs` de
[`input.md`](./input.md#passthrough-al-control-interno-controlattrs), y **solo**
gracias a ella: sin passthrough, el ARIA del patrón aterriza en el host
`<aegis-input>` y el `<input>` real —el que recibe el foco— se queda sin `role`
ni `aria-activedescendant`. Está medido en esa enmienda; el resultado es un
combobox que un lector de pantalla no puede usar.

```
[controlAttrs] = {
  role: 'combobox',
  'aria-expanded': open() ? 'true' : 'false',
  'aria-controls': listboxId,
  'aria-activedescendant': listbox.activeDescendantId() ?? null,
  'aria-autocomplete': 'list',
}
```

Ninguno de esos cinco está en el conjunto protegido del Input, así que conviven
con `aria-invalid` y `aria-describedby`: **un combobox inválido sigue anunciando
su error** por el canal de ADR-019.

### Lo que ya funciona sin tocar nada (dependencia declarada)

Verificado sobre el Input actual, no supuesto:

- **`(keydown)` sobre `<aegis-input>` recibe el evento del `<input>` interno por
  burbujeo.** El Combobox lo cablea ahí y se lo pasa a `listbox.onKeydown($event)`.
  No hace falta exponer el elemento ni añadir un output.
- **`value` del Input es `model` two-way**, así que el texto del campo se gobierna
  con un binding normal.

Si cualquiera de las dos dejara de ser cierta, este contrato se rompe: por eso se
declaran aquí como **dependencia**, no como detalle de implementación.

## Selector

`aegis-combobox`. Renderiza un `<aegis-input>` como campo y un contenedor
`role="listbox"` como panel.

## Inputs (signals)

| Nombre | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | `string` | `''` | Se pasa al Input. Omitirlo es defecto. |
| `options` | `readonly T[]` | `[]` | Colección completa. |
| `optionLabel` | `string \| ((option: T) => string)` | *(sin valor)* | Se pasa al listbox. **Gobierna qué se filtra**: la etiqueta visible, nunca el objeto (enmienda 1 de listbox.md). |
| `placeholder` | `string` | `''` | |
| `disabled`, `readonly`, `required`, `invalid` | `boolean` | `false` | Se pasan al Input. |
| `errorMessage`, `helpText` | `string \| undefined` | `undefined` | Se pasan al Input. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Se pasa al Input. |
| `labelMode` | `'stacked' \| 'floating'` | `'stacked'` | Se pasa al Input. **Los dos están soportados** (ver §Autofill). |
| `labelFloatStyle` | `'inset' \| 'notched'` | `'inset'` | Se pasa al Input. |
| `disabledOptions` | `readonly T[]` | `[]` | Se pasa al listbox. |
| `maxVisible` | `number` | `100` | Se pasa al listbox (ADR-023 §4). |
| `placement` | `AegisPlacement` | `'bottom-start'` | Se pasa al overlay. |
| `autocomplete` | `string` | `'off'` | Atributo `autocomplete` del campo. Ver §Autofill. |

### Model

| Nombre | Tipo | Descripción |
|---|---|---|
| `value` | `T \| undefined` | Opción **comprometida**, two-way. |
| `open` | `boolean` | Panel abierto, two-way. |

### Outputs

| Nombre | Payload | Cuándo |
|---|---|---|
| `selectionChange` | `T` | El usuario comprometió una opción. No al navegar ni al teclear. |

## Texto del campo vs. opción comprometida

Son **dos cosas distintas** y confundirlas produce el combobox que "pierde" lo que
escribes:

| Momento | Qué muestra el campo |
|---|---|
| En reposo, con `value` | `optionLabel(value)` |
| En reposo, sin `value` | Vacío (se ve el `placeholder`) |
| Mientras se teclea | Exactamente lo tecleado — **es** el `filter` del listbox |
| Al comprometer (`Enter`/click) | `optionLabel(value)`, y el panel cierra |
| Al salir sin comprometer | **Vuelve** a `optionLabel(value)`, o a vacío si no había |

Esa última fila es la regla que evita el estado imposible: el campo **nunca** se
queda con texto que no corresponde a la opción comprometida. Este componente no
acepta texto libre (§Fuera de alcance), así que un texto huérfano no significa
nada.

## Configuración de los primitivos

| Primitivo | Input | Valor | Por qué |
|---|---|---|---|
| `AegisListbox` | `editable` | **`true`** | Hay un campo de texto delante: `Space` **escribe un espacio**, no selecciona. |
| `AegisListbox` | `typeahead` | *(ignorado)* | Con `editable=true` el listbox lo ignora: filtrar YA es la búsqueda. |
| `AegisListbox` | `filter` | **el texto tecleado** | Es lo que convierte esto en un Combobox. |
| `AegisOverlay` | `matchAnchorWidth` | **`true`** | El panel mide lo que el campo. |
| `AegisOverlay` | `maxHeightFromViewport` | **`true`** | 1.4.10 Reflow. |
| `AegisOverlay` | `flip` / `shift` | `true` | 2.4.11. |

**`Space` no selecciona porque `editable=true`**, no porque el typeahead esté
apagado. Es el otro lado de la enmienda 2 del listbox, y este contrato es su
segundo consumidor real — el que demuestra que los dos conceptos hacían falta
separados.

## Autofill del navegador y etiqueta flotante — decidido

**Decisión: se soportan los DOS `labelMode`, y `autocomplete` vale `'off'` por
defecto.**

Esto **contradice la lectura inicial** de cerrar el floating para el combobox, y
la contradice a propósito, con dos razones:

**1. Sí hay un caso real que perderíamos.** El combobox con etiqueta flotante es
uno de los patrones más extendidos que existe — es la forma por defecto del
autocomplete de Material Design, y lo espera cualquiera que venga de ahí. Cerrarlo
no sería quitarnos un problema: sería renunciar a la presentación por defecto de
nuestro componente más caro para esquivar un choque que, mirado de cerca, no
ocurre.

**2. El choque se disuelve solo.** La etiqueta flota con foco, con contenido o con
`:autofill` ([`input.component.css:269`](../../packages/ui/src/lib/input/input.component.css)).
Con `autocomplete="off"`, `:autofill` prácticamente no llega a activarse. Y si un
navegador ignora ese `off` —Chrome lo hace en campos de dirección— y autorrellena
igual, la etiqueta flota... que es **exactamente lo correcto**: el campo tiene
contenido. No hay bug visual en ninguna de las dos ramas.

Lo que el autofill sí rompe, y hay que declarar, **no es la etiqueta**: es la
**consistencia de estado**. El navegador puede escribir texto en el campo sin
pasar por el filtro ni por la selección, dejando `value` sin corresponder con lo
que se ve. Eso pasa **en los dos modos de etiqueta**, así que no es motivo para
restringir `labelMode`, y se resuelve donde toca:

> Si el campo recibe texto que el Combobox no originó, se trata **igual que texto
> tecleado**: se convierte en `filter`, el panel abre si hay coincidencias, y
> `value` **no cambia** hasta que el usuario comprometa. Si al salir no hay
> compromiso, el campo vuelve a `optionLabel(value)` (§Texto del campo).

`autocomplete` queda como input para el caso legítimo contrario: un combobox de
país o de dirección donde el autofill del navegador **sí** se quiere.

## Tokens que consume

Lista **exhaustiva** de tokens de **capa 3** (ADR-016: locales al componente, dos
rieles — color→capa 2, estructura→capa 1). Los define el propio CSS del
componente en su `:host`, y de ahí salen a capa 2. Cero literales
(`no-literal-design-values`), y la palabra `dark` no aparece: el tema vive en
los tokens.

Los verifica la regla `tokens-declared-in-contract`: **cualquier
`var(--aegis-*)` del CSS que no esté en esta lista es error de lint**.

### El campo NO tiene tokens propios

El campo editable **es un `<aegis-input>`**, así que su superficie, su foco, su
etiqueta, su ayuda y su error los gobiernan los tokens `--aegis-input-*` que ya
declara [`input.md`](./input.md). El Combobox **no los redeclara ni los pisa** —
si lo hiciera, un Input y el campo de un Combobox podrían divergir, que es
exactamente lo que reutilizar existe para impedir.

Consecuencia práctica: retocar el aspecto del campo se hace en un solo sitio.

### Panel y opciones

Panel:

- `--aegis-combobox-panel-bg`
- `--aegis-combobox-panel-border-color`
- `--aegis-combobox-panel-border-width`
- `--aegis-combobox-panel-radius`
- `--aegis-combobox-panel-shadow`
- `--aegis-combobox-panel-padding-block`

Opción:

- `--aegis-combobox-option-fg`
- `--aegis-combobox-option-padding-inline`
- `--aegis-combobox-option-padding-block`
- `--aegis-combobox-option-min-height`
- `--aegis-combobox-option-bg-active`
- `--aegis-combobox-option-fg-active`
- `--aegis-combobox-option-bg-selected`
- `--aegis-combobox-option-fg-selected`
- `--aegis-combobox-option-fg-disabled`

Fila de estado (truncado / sin resultados):

- `--aegis-combobox-status-color`
- `--aegis-combobox-status-font-size`

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

- Campo: `<input role="combobox">` con `aria-expanded`, `aria-controls`,
  `aria-activedescendant`, `aria-autocomplete="list"` — **todos sobre el `<input>`
  interno**, vía `controlAttrs`.
- Panel: `role="listbox"`, opciones `role="option"`.
- **El foco DOM no se mueve nunca del campo.**

### `aria-controls`: el Combobox posee el id del panel

`aria-controls` es **obligatorio** en `role="combobox"` y debe apuntar al panel.
Ese id lo **genera y posee el Combobox** (`aegis-combobox-<n>-listbox`), no el
consumidor y no el listbox: es el único que ve los dos extremos de la relación.
Misma decisión, y por la misma razón, que la del Input con `for`/`id` — una
relación que el componente posee es verificable en CI; una delegada al consumidor,
no.

Se testea que el id **existe en el DOM** y que es el del contenedor `role="listbox"`.

### Teclado

| Tecla | Comportamiento |
|---|---|
| *(imprimibles)* | Escriben en el campo y **filtran**. Abren el panel si había coincidencias. |
| `Space` | **Escribe un espacio.** Nunca selecciona (`editable=true`). |
| `ArrowDown` | Cerrado: abre y activa la primera. Abierto: siguiente. |
| `ArrowUp` | Cerrado: abre y activa la última. Abierto: anterior. |
| `Home` / `End` | Abierto: primera / última **renderizada** (respeta el cap). |
| `Enter` | Compromete la activa y cierra. Sin activa, no hace nada. |
| `Escape` | Cierra sin comprometer y devuelve el foco al campo (nativo del popover). |
| `Backspace` | Edición normal del campo; refiltra. |

`data-handles`: `ArrowDown ArrowUp Home End Enter`.

**`Space` no se declara**: el Combobox no lo maneja, lo escribe el campo.
Declararlo sería afirmar un comportamiento que no existe.

### Criterios que aplican

1.3.1, 2.1.1, 2.1.2, 2.4.3, 2.4.7, **2.4.11**, **1.4.10** (Reflow a 320 px),
3.3.2, 4.1.2, **4.1.3** (los mensajes de truncado y vacío del listbox).

## Casos límite

- **Filtro sin coincidencias**: panel abierto con *"Sin resultados."*,
  `aria-activedescendant` **retirado**.
- **Más de `maxVisible` coincidencias**: fila de truncado del listbox. El Combobox
  **no** la reimplementa ni la desactiva (ADR-023 §4).
- **Borrar todo el texto**: el filtro vuelve a `''` y se ven todas las opciones
  (hasta el cap). `value` **no** se limpia solo.
- **`value` fuera de `options`**: el campo muestra su etiqueta; ninguna opción
  marca `aria-selected`.
- **Cerrar sin comprometer**: el campo vuelve a `optionLabel(value)`.
- **`disabled` / `readonly`**: no abren. `readonly` conserva el foco; `disabled` no.
- **RTL**: lo resuelven el overlay y el campo nativo.

## Matriz visual representativa

Renderiza: declara matriz, no se exime.

**Criterio de selección:** igual que el resto — cada fila aporta algo que
ninguna otra contiene.

| # | Variante | Historia | Tema | Información distinta que aporta |
|---|---|---|---|---|
| 1 | Reposo, sin selección | `componentes-combobox--default` (pendiente) | light | Baseline: es un campo de texto y tiene que **parecerlo** (si se ve como un Select, el usuario no sabrá que puede escribir) |
| 2 | Con selección comprometida | `componentes-combobox--selected` (pendiente) | light | El campo muestra `optionLabel(value)`, no el texto tecleado — la distinción de §Texto del campo, hecha visible |
| 3 | Abierto, filtrando, con activa | `componentes-combobox--filtering` (pendiente) | light | El caso central: texto parcial, lista recortada, opción activa, y el foco **en el campo** |
| 4 | Abierto, filtrando, con activa | `componentes-combobox--filtering` (pendiente) | dark | Panel elevado sobre campo editable: fondo, sombra y color de texto cambian a la vez |
| 5 | Sin resultados | `componentes-combobox--empty` (pendiente) | light | Con texto en el campo y cero coincidencias — el estado que más desconcierta si no se explica |
| 6 | Truncado (>100) | `componentes-combobox--truncated` (pendiente) | light | La fila de truncado, aquí alcanzable tecleando: el comportamiento observable de ADR-023 §4 |
| 7 | Deshabilitado | `componentes-combobox--disabled` (pendiente) | light | Campo deshabilitado, sin panel posible |
| 8 | Inválido **con panel abierto** | `componentes-combobox--invalid-open` (pendiente) | light | **No es decorativa:** la única que muestra error y panel a la vez — la coexistencia del ARIA de combobox con el `aria-describedby` de ADR-019, hecha visible |
| 9 | Etiqueta flotante, abierto | `componentes-combobox--floating` (pendiente) | light | La decisión de §Autofill: etiqueta flotada **y** panel sin recortar por el wrapper `position: relative` (lo garantiza la capa superior del popover) |
| 10 | Tamaños `sm`/`md`/`lg` | `componentes-combobox--sizes` (pendiente) | light | Escala del campo y del panel, que la sigue vía `matchAnchorWidth` |

`Combobox/InvalidOpen` no es decorativa: es la variante que demuestra que el ARIA
del combobox y el `aria-describedby` del error **coexisten** en el mismo `<input>`.

> Todas las filas van marcadas `(pendiente)`: el componente aún no existe, así
> que sus historias tampoco. El marcador **caduca solo** — en cuanto la historia
> exista, dejarlo puesto es violación del gate `coverage`. Implementar OBLIGA a
> retirarlo, fila a fila.

## Presupuesto de tamaño

**Presupuesto marginal:** 10.50 kB brotli *(provisional, sin medir)*

> **Techo provisional, no medida** — mismo régimen que el [Select](./select.md).
> La marca `*(provisional, sin medir)*` **caduca sola**: el gate `size-marginal` la
> rechaza en cuanto el componente existe.
> el PR de implementación lo sustituye por **medido + ~5 %**.
>
> **Por qué es tan alto, y por qué es honesto.** El gate `size-marginal` mide lo
> que paga una app que usa **solo** este componente. Como el Combobox depende del
> Input, ese coste **entra en su marginal** (Input medido: 6.19 kB). El techo son
> ~6.2 kB de Input más ~4 kB de combobox propio.
>
> No es un número inflado para tener sitio: es la consecuencia medible de
> reutilizar el Input en vez de duplicarlo. La alternativa —un campo paralelo— no
> sería más barata para quien use los dos componentes, y además duplicaría la
> etiqueta flotante y ADR-019. El agregado informativo es donde se ve que
> compartir sale a cuenta.
>
> **Matiz anotado en [#36](https://github.com/aegisui/aegisui/issues/36):** este
> número es correcto para quien use SOLO el Combobox, pero miente al alza para
> quien ya usa `<aegis-input>` en sus formularios — ese añade ~4 kB, no 10.5.
> El marginal NETO (descontando la dependencia interna) es trabajo de gate
> pendiente; hasta entonces el presupuesto vigila el bruto, dicho en voz alta.

## Criterios de aceptación (se convierten en tests 1:1)

Integración con el Input (lo que hace de esto una piel y no una reimplementación):

- [ ] El campo es un `<aegis-input>`, no un `<input>` propio.
- [ ] `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
      y `aria-autocomplete` están en el **`<input>` interno**, no en el host.
- [ ] Con `invalid` y `errorMessage`, el `<input>` interno lleva **a la vez** el
      ARIA de combobox y `aria-invalid` + `aria-describedby` apuntando al error.
- [ ] `aria-controls` apunta a un id que **existe** y es el del `role="listbox"`.
- [ ] El `keydown` llega al listbox por burbujeo desde el `<aegis-input>`.

Patrón:

- [ ] Teclear filtra: `filter` del listbox es el texto del campo.
- [ ] El filtro casa contra `optionLabel`, no contra el objeto.
- [ ] Navegar con flechas **no** cambia `value` ni emite `selectionChange`.
- [ ] `Enter` compromete y cierra; el campo pasa a `optionLabel(value)`.
- [ ] **`Space` escribe un espacio y NO selecciona** (raíl de `editable=true`).
- [ ] `Escape` cierra sin comprometer y el campo vuelve a `optionLabel(value)`.
- [ ] Salir sin comprometer restaura el campo (nunca queda texto huérfano).
- [ ] El foco DOM permanece en el campo durante toda la navegación.
- [ ] Sin coincidencias: *"Sin resultados."* y `aria-activedescendant` ausente.
- [ ] Más de `maxVisible`: fila de truncado, y la selección solo alcanza lo
      renderizado.
- [ ] Texto que el Combobox no originó (autofill) se trata como tecleado: filtra,
      no compromete.
- [ ] `labelMode='floating'` funciona: la etiqueta flota con foco y con contenido,
      y el panel **no** queda recortado por el wrapper `position: relative` (lo
      garantiza la capa superior del popover).
- [ ] Cero literales de diseño en el CSS; la palabra `dark` no aparece.

Accesibilidad (gate `a11y`):

- [ ] 0 violaciones cerrado, abierto, filtrando, vacío y truncado; light y dark.
- [ ] **2.4.11**: con el campo pegado a cada borde, el panel no lo obscurece.
- [ ] **1.4.10**: a 320 px no hay scroll en dos ejes.

## Pase manual (antes de release — SPEC §8.4)

**Ningún gate cubre esto**, y es el componente donde más falta hace: el foco
virtual sobre un campo editable es donde los lectores más difieren.

- [ ] **Pendiente** — **NVDA + Firefox** y **VoiceOver + Safari**, los dos (la
      lección de ADR-019: un solo lector no certifica un patrón). Guion:
      1. Abrir el panel y navegar con flechas: **cada opción activa se lee** sin
         que el foco salga del campo.
      2. Teclear hasta truncar: la truncación se anuncia **una vez**.
      3. Seguir tecleando dentro del truncado: no se inunda de anuncios.
      4. Llegar a cero resultados: se anuncia el vacío.
      5. Comprometer con `Enter`: se anuncia la selección.
      6. **Combobox inválido**: el error se anuncia **y** el patrón sigue
         funcionando (es la coexistencia de ARIA que este contrato promete).
      7. `Escape`: el foco vuelve al campo de verdad.
- [ ] **Pendiente** — comprobar el punto abierto de
      [`listbox.md`](./cdk/listbox.md#anuncio-a-lector-de-pantalla--decisión-con-fuentes):
      si VoiceOver necesita el recuento explícito. **No se implementa antes del
      pase.**
- [ ] **Pendiente** — `disabled` y `readonly` bajo `role="combobox"`: el rol
      sustituye al implícito `textbox` y el mapeo del estado nativo **varía entre
      lectores** (§Convivencia en [`input.md`](./input.md)). Comprobar que se
      anuncian.

## Fuera de alcance

- **Texto libre** (valor que no está en `options`): v1 siempre compromete una
  opción de la lista.
- **Selección múltiple / chips**.
- **Carga asíncrona de opciones** (buscar en servidor mientras se teclea): el cap
  es un corte duro con mensaje, no una ventana paginada.
- **Filtrado difuso o por relevancia**: `filter` es subcadena sobre la etiqueta;
  un ranking mejor lo aporta el consumidor ordenando `options`.
- **Virtual scroll**: ADR-023 §4, con la tabla de datos Pro.
- **Agrupación** de opciones.
