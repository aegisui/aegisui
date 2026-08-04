# Contrato: `AegisListbox` (primitivo de `@aegisui/cdk`)

> **Estado:** implementación pendiente
>
> **Sin matriz visual:** primitivo headless, no renderiza
>
> **Cobertura del gate `contracts`:** igual que [`overlay.md`](./overlay.md) — lo
> reconcilia `reconcilePrimitives()` contra `packages/cdk/src/lib/`, con la regla
> de primitivo headless (sin componente `aegis-*`). El marcador caduca solo.

Segundo primitivo de la Fase 5. Aquí vive el **cap de resultados** que ADR-023 §4
fijó como comportamiento observable de v1, y el foco virtual
(`aria-activedescendant`) que fue el hallazgo decisivo de aquel análisis.

## Propósito

`AegisListbox` implementa el **patrón ARIA listbox con foco virtual**: navegación
por teclado, opción activa, selección, typeahead y el cap de resultados. Es *brain*
puro: sin CSS, sin tokens, sin opinión visual.

Existe porque **ninguna dependencia nos lo daba resuelto**: `@angular/cdk/listbox`
arrastra `@angular/forms`, rxjs, `NgModule`, `@Input`/`@Output`, `ContentChildren`
y `NgZone` (ADR-023 Hallazgo 3), y `@angular/aria` exige suelo `^22` con pin exacto
de CDK (Hallazgo 4). Se escribe entero, a propósito.

**Cuándo NO usarlo:** para navegación entre páginas → `menu`/`menubar`; para
selección múltiple con casillas visibles → un grupo de checkboxes; para miles de
filas tabulares → tabla de datos (Pro), que virtualiza y usa rol `grid`.

## Superficie pública

Directivas standalone, signals-only, `OnPush`, sin `NgModule`.

### Inputs

| Nombre | Tipo | Default | Descripción |
|---|---|---|---|
| `options` | `readonly T[]` | `[]` | Colección **completa**, sin recortar. El cap lo aplica el primitivo, no el consumidor. |
| `optionLabel` | `string \| ((option: T) => string)` | *(sin valor)* → `String(option)` | Cómo obtener la **etiqueta visible** de una opción. Ver §Etiqueta de una opción. |
| `filter` | `string` | `''` | Texto de filtrado. `''` = sin filtrar. Compara contra la **etiqueta**, no contra el objeto. |
| `maxVisible` | `number` | `100` | Cap de opciones renderizadas. Ver §Cap de resultados. |
| `disabledOptions` | `readonly T[]` | `[]` | Opciones presentes pero no seleccionables. |
| `typeahead` | `boolean` | `true` | Salto a opción por escritura rápida. Se ignora con `editable=true`. |
| `editable` | `boolean` | `false` | El listbox está gobernado por un **campo de texto editable** (combobox). Ver §Modo editable. |
| `loop` | `boolean` | `true` | `ArrowDown` en la última vuelve a la primera. |

### Model

| Nombre | Tipo | Descripción |
|---|---|---|
| `value` | `T \| undefined` | Opción **seleccionada** (compromiso del usuario). |
| `activeIndex` | `number` | Índice de la opción **activa** (foco virtual) dentro de las visibles. `-1` = ninguna. |

**Activa ≠ seleccionada**, y la distinción es el corazón del patrón: `activeIndex`
es dónde está el foco virtual (se mueve con flechas, no compromete nada); `value`
es lo elegido (`Enter`/click). Confundirlas produce el bug clásico de "seleccionar
al navegar" que rompe a los usuarios de lector de pantalla.

### Estado derivado (computed, solo lectura)

| Nombre | Tipo | Descripción |
|---|---|---|
| `visibleOptions` | `readonly T[]` | Resultado de aplicar `filter` y **luego** `maxVisible`. Es lo que se renderiza. |
| `matchCount` | `number` | Coincidencias **totales** con `filter`, antes del cap. |
| `truncated` | `boolean` | `matchCount > maxVisible`. |
| `activeDescendantId` | `string \| undefined` | `id` de la opción activa. **Siempre corresponde a un elemento renderizado** (ver §Accesibilidad). |

### Outputs

| Nombre | Payload | Cuándo |
|---|---|---|
| `optionSelected` | `T` | El usuario comprometió una opción (`Enter`, `Space`, click). No se emite al navegar. |

## Etiqueta de una opción (`optionLabel`)

`optionLabel` dice cómo sacar el **texto visible** de una opción:

| Forma | Significado |
|---|---|
| *(sin valor)* | `String(option)`. Mantiene `options: string[]` funcionando sin ceremonia. |
| `string` | Nombre de propiedad: `optionLabel="label"` toma `option.label`. |
| `(option: T) => string` | Accesor libre, para etiquetas compuestas. |

**El filtro y el typeahead operan SOBRE LA ETIQUETA, nunca sobre el objeto ni
sobre el `id`.** Es la regla que hace predecible la búsqueda: **un usuario busca
lo que ve**. Si el filtro mirase el objeto entero, teclear `3` casaría con
`{ id: 3, label: 'Argentina' }` y el usuario vería aparecer un país que no
contiene ningún `3` — comportamiento imposible de explicar.

La identidad va por **objeto**; la búsqueda, por **etiqueta**. Son ejes distintos
a propósito:

- El `value` emitido y el `aria-selected` comparan **la opción**, no su etiqueta:
  dos opciones distintas con la misma etiqueta siguen siendo distintas.
- `disabledOptions` compara **opciones**, no etiquetas.
- Una etiqueta `undefined`/`null` (propiedad que no existe) se trata como cadena
  vacía: no casa con ningún filtro y no rompe el typeahead.

## Modo editable (`editable`)

`editable=true` declara que **el listbox vive bajo un campo de texto real** (el
combobox), donde cada pulsación pertenece a la escritura del usuario.

| | `editable=false` (Select) | `editable=true` (Combobox) |
|---|---|---|
| `Space` | **Selecciona** la activa | **Escribe un espacio.** Nunca se secuestra la escritura |
| Typeahead | Según `typeahead` | **Ignorado**: filtrar YA es la búsqueda |

**`Space` consulta `editable`, NO el estado de `typeahead`.** Son conceptos
distintos aunque hoy coincidan en las dos pieles previstas: un combobox editable
con filtro no usa typeahead porque se escribe de verdad; un select no editable sí
lo usa. Deducir una condición semántica ("hay un campo de texto delante") a partir
de un efecto colateral ("el typeahead está apagado") es una trampa que se cobra
sola la primera vez que alguien quiera un select **sin** typeahead y descubra que
su `Space` dejó de seleccionar. Ese caso concreto es criterio de aceptación.

`typeahead` sigue siendo un input independiente; lo único que `editable` hace con
él es **ignorarlo**, porque con un campo de texto delante las teclas ya tienen
dueño.

## Cap de resultados — el comportamiento que fija ADR-023 §4

v1 **no virtualiza**. Renderiza como mucho `maxVisible` opciones (default **100**) y
lo dice. Tres estados observables:

| Estado | Condición | Qué se renderiza |
|---|---|---|
| **normal** | `0 < matchCount ≤ maxVisible` | Las opciones. Sin fila de estado. |
| **truncado** | `matchCount > maxVisible` | Las primeras `maxVisible` **más** una fila de estado no focalizable: *"Mostrando los primeros 100 de 1240. Afina la búsqueda."* |
| **vacío** | `matchCount === 0` | Solo la fila de estado: *"Sin resultados."* |

Reglas del marcado, y cada una evita un fallo concreto:

- La fila de estado **no** lleva `role="option"`, **no** es navegable con flechas y
  **no** entra en `matchCount`. Si fuera una opción, `ArrowDown` podría "activar" un
  mensaje y `aria-activedescendant` apuntaría a algo no seleccionable.
- `aria-setsize` / `aria-posinset`: **no se escriben a mano**. Con la lista completa
  en el DOM el navegador los calcula solo, y ese es precisamente uno de los
  beneficios por los que ADR-023 §4 descartó virtualizar. Escribirlos a mano aquí
  sería introducir el problema que evitamos.
- Cuando `truncated`, **la selección por teclado solo alcanza lo renderizado**. Es
  coherente: lo que no se ve no se puede elegir, y por eso el mensaje pide afinar.

### Anuncio a lector de pantalla — decisión, con fuentes

**Canal: `aria-live="polite"` en un `<span>` hermano visualmente oculto. SIN
`aria-describedby` sobre ese nodo.**

Es [ADR-019](../../adr/ADR-019-anuncio-de-estado-dinamico-describedby-estable-mas-alert-separado.md)
**Regla 2** (notificación transitoria de estado), no la Regla 1: el número de
resultados cambia mientras el usuario teclea con el foco en el campo, y no es una
descripción persistente del control. Aplican también la **Regla 3** (nunca dos
canales sobre el mismo contenido) y la **Regla 4** (interpolación plana, jamás `@if`
alrededor del texto — un `@if` recrea el nodo y dispara doble anuncio).

**Qué se anuncia, y qué deliberadamente no.** Solo se anuncian **truncado** y
**vacío**. El recuento normal **no se anuncia nunca**:

- NVDA y JAWS ya anuncian de forma nativa el número de opciones al expandirse el
  listbox. Añadir *"5 resultados"* por región live sería el segundo canal sobre el
  mismo contenido — Regla 3, y la causa exacta del doble anuncio que costó cuatro
  intentos en el Input.
- La **truncación**, en cambio, **ningún lector puede inferirla**: para la AT hay
  100 opciones y punto; que existan 1 140 más es información que solo nosotros
  tenemos. Ese es el contenido que justifica una región live.

**Cadencia:** se anuncia **solo cuando el mensaje cambia**, no en cada pulsación —
la regla de React Aria ("el recuento total solo se anuncia cuando cambia el número
de opciones disponibles"), que evita inundar al usuario mientras escribe. La región
está en el DOM desde el primer render y **vacía** (una región live insertada en
caliente puede no registrarse en el árbol de accesibilidad).

**Fuentes consultadas** (la lección del Input: ir a la literatura *antes*, no tras
cuatro intentos):

- [React Aria — Building a ComboBox](https://react-aria.adobe.com/blog/building-a-combobox) (Adobe): usa regiones live para el estado del combobox; anuncia el recuento **solo cuando cambia**; documenta que VoiceOver no anuncia recuentos de opciones con `aria-activedescendant` y que NVDA se confundía al borrar caracteres con foco virtual.
- [Sara Soueidan — Accessible notifications with ARIA Live Regions (Part 2)](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/): `polite` por defecto; la región debe existir vacía antes de recibir texto.
- [WAI-ARIA APG — patrón Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): **no exige ni prohíbe** anunciar el recuento; sí fija que el foco DOM permanece en el combobox y la AT se mueve con `aria-activedescendant`. Se cita por lo que dice y por lo que **calla** — no se le atribuye una recomendación que no hace.
- [a11ysupport.io — `combobox` role](https://a11ysupport.io/tech/aria/combobox_role): soporte real por lector.

**Limitación conocida, asumida y documentada:** VoiceOver no anuncia el recuento de
opciones por su cuenta con foco virtual, y v1 **no** lo compensa. React Aria sí, pero
**detectando plataforma Apple** para no duplicar en NVDA/JAWS. v1 no hace sniffing de
UA: preferimos que a VoiceOver le falte un dato que el usuario puede obtener
navegando, antes que arriesgar doble anuncio en NVDA — la lección de ADR-019.
**Se reevalúa con el resultado del pase manual**, no antes.

## Accesibilidad (WCAG 2.2 AA — SPEC §8)

### Roles y atributos

- Contenedor: `role="listbox"`; opciones: `role="option"` con `aria-selected`.
- **Foco virtual:** el foco DOM permanece en el control (input o disparador); la
  opción activa se comunica con `aria-activedescendant` apuntando al `id` de
  `activeIndex`.
- `aria-multiselectable` no se expone en v1 (ver Fuera de alcance).

### `aria-activedescendant` sobre nodos renderizados — el invariante central

**`activeDescendantId` apunta SIEMPRE a un elemento presente en el DOM.** En v1 es
cierto **por construcción**, no por cuidado: como no virtualizamos, toda opción
navegable está renderizada.

Este invariante es el motivo entero por el que ADR-023 §4 aplazó el virtual scroll:
con virtualización, `aria-activedescendant` puede referirse a un `id` que no existe,
y ni `@angular/cdk` ni `@angular/aria` traen eso resuelto (Hallazgos 3 y 4).

- [ ] **Raíl automático:** un test recorre la lista entera con `ArrowDown` y verifica
      en cada paso que `document.getElementById(activeDescendantId)` **no es `null`**.
      Si algún día alguien virtualiza sin resolver el problema, este test se pone
      rojo. Es el guardián de la decisión de ADR-023 §4, escrito antes de que exista
      la tentación.

Mantener la activa a la vista se hace con `scrollIntoView({ block: 'nearest' })`
sobre el elemento real — posible precisamente porque el elemento siempre existe.

### Teclado (exhaustiva)

Fuente de verdad del gate `keyboard`.

| Tecla | Comportamiento |
|---|---|
| `ArrowDown` | Activa la siguiente opción habilitada; con `loop`, de la última a la primera. Si no hay activa, activa la primera. |
| `ArrowUp` | Simétrico hacia atrás. |
| `Home` | Activa la primera habilitada. |
| `End` | Activa la última habilitada **renderizada** (no la última del modelo: ver Cap). |
| `Enter` | Selecciona la activa y emite `optionSelected`. Sin activa, no hace nada. |
| `Space` | Igual que `Enter` **cuando `editable=false`**. Con `editable=true` escribe un espacio y no selecciona (nunca se secuestra la escritura). La condición es `editable`, **no** el estado de `typeahead`. |
| *(caracteres imprimibles)* | Con `typeahead` **y** `editable=false`, activa la primera coincidencia por prefijo **de la etiqueta** (`optionLabel`); el buffer se reinicia a **1 s** de inactividad. Con `editable=true` la escritura va al campo y el typeahead se ignora (filtrar ya es la búsqueda). |

Las opciones deshabilitadas **se saltan** al navegar, pero permanecen visibles y
anunciadas con `aria-disabled` (SPEC §8: no ocultar del teclado algo legible).

`data-handles` declara: `ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`, `Space`.

### Criterios WCAG que aplican

1.3.1 (relaciones listbox/option), 2.1.1, 2.1.2, 2.4.3 (orden de foco), 2.4.7,
4.1.2 (nombre/rol/valor de cada opción), 4.1.3 (mensajes de estado: la fila de
truncado y la de vacío).

## Casos límite

- **`options` vacío** (no por filtro): estado **vacío**, mismo mensaje.
- **Filtro que no casa nada:** estado **vacío**. `activeIndex` vuelve a `-1` y
  `aria-activedescendant` se **retira** (no apunta a un id inexistente).
- **La activa desaparece al reducirse el filtro:** `activeIndex` se recoloca a la
  primera visible; nunca queda apuntando fuera de rango.
- **`maxVisible` menor que 1:** se trata como 1. Un listbox que no muestra nada no
  es una configuración válida.
- **Todas las visibles deshabilitadas:** ninguna se activa; `ArrowDown` no hace nada
  (sin bucle infinito buscando una habilitada).
- **`value` fuera de `options`:** se conserva tal cual (el consumidor manda) pero no
  se marca ninguna opción con `aria-selected`.
- **Opciones duplicadas:** se distinguen por índice, no por identidad de valor; los
  `id` generados son únicos aunque el contenido se repita.
- **RTL:** `ArrowUp`/`ArrowDown` no dependen de la dirección; no se remapean.

## Criterios de aceptación (se convierten en tests 1:1)

Unitarios (Vitest + Testing Library):

- [ ] `visibleOptions` aplica `filter` y **después** `maxVisible`.
- [ ] `matchCount` cuenta **todas** las coincidencias, no las visibles.
- [ ] `truncated` es `true` exactamente cuando `matchCount > maxVisible`.
- [ ] Con 1 240 coincidencias y `maxVisible=100`: se renderizan 100 opciones + 1
      fila de estado; la fila **no** tiene `role="option"`.
- [ ] La fila de estado no es alcanzable con `ArrowDown`/`ArrowUp`/`End`.
- [ ] Estado vacío: 0 opciones, fila *"Sin resultados"*, `aria-activedescendant`
      **ausente**.
- [ ] Navegar con flechas **no** cambia `value` ni emite `optionSelected`.
- [ ] `Enter` sobre la activa emite `optionSelected` y fija `value`.
- [ ] Las deshabilitadas se saltan al navegar y conservan `aria-disabled`.
- [ ] `loop=false` detiene la navegación en los extremos.
- [ ] Typeahead activa por prefijo y reinicia el buffer a 1 s.
- [ ] Reducir el filtro hasta que desaparece la activa recoloca `activeIndex` sin
      dejarlo fuera de rango.

Etiqueta de la opción (`optionLabel`):

- [ ] Sin `optionLabel`, `options: string[]` se comporta igual que con `String(option)`.
- [ ] `optionLabel="label"` filtra por `option.label` en `{ id, label }`.
- [ ] `optionLabel` como función filtra por lo que devuelve.
- [ ] El filtro **no** casa contra el `id` ni contra otras propiedades: con
      `{ id: 3, label: 'Argentina' }`, teclear `3` **no** la muestra.
- [ ] El typeahead salta por prefijo de la **etiqueta**, no del objeto.
- [ ] `value` y `optionSelected` entregan **la opción**, no su etiqueta.
- [ ] Dos opciones distintas con la misma etiqueta se distinguen (`aria-selected`
      marca una sola).
- [ ] Una etiqueta ausente se trata como cadena vacía y no rompe filtro ni typeahead.

Modo editable (`editable`):

- [ ] `editable=false` + `typeahead=false`: `Space` **sigue seleccionando**. Es el
      caso que una inferencia implícita rompería, y el motivo de que `editable`
      exista como input propio.
- [ ] `editable=true`: `Space` **no** selecciona ni llama a `preventDefault`.
- [ ] `editable=true`: los caracteres imprimibles **no** mueven la activa, aunque
      `typeahead=true`.
- [ ] `editable=false` + `typeahead=true`: el typeahead funciona.

Invariante de foco virtual (el raíl de ADR-023 §4):

- [ ] Recorriendo la lista completa con `ArrowDown`,
      `document.getElementById(activeDescendantId)` **nunca** es `null`.
- [ ] `aria-activedescendant` se retira cuando no hay opción activa.
- [ ] La opción activa queda siempre dentro del área visible del scroller.

Anuncios (estructura — el oído va en el pase manual):

- [ ] Existe **una sola** región `aria-live="polite"`, presente desde el primer
      render y **vacía**.
- [ ] Esa región **no** está referenciada por `aria-describedby` desde ningún sitio
      (ADR-019 Regla 3).
- [ ] El recuento normal **no** se anuncia (la región sigue vacía con
      `0 < matchCount ≤ maxVisible`).
- [ ] Pasar a truncado escribe el mensaje **una vez**; seguir tecleando sin que el
      mensaje cambie **no** lo reescribe.
- [ ] `MutationObserver`: las transiciones de mensaje producen solo mutaciones
      `characterData`, **ninguna** `childList` (ADR-019 Regla 4, mismo raíl que el
      Button).

Teclado (gate `keyboard`):

- [ ] Cada tecla de la tabla hace lo declarado; `data-handles` coincide con ella.

Accesibilidad (gate `a11y`):

- [ ] 0 violaciones en los tres estados (normal, truncado, vacío), light y dark.
- [ ] Estructura `listbox`/`option` válida con opciones deshabilitadas presentes.

Manual (antes de release, no de cada PR — SPEC §8.4):

- [ ] **Pendiente** — NVDA+Firefox **y** VoiceOver+Safari, los dos lectores (la
      lección de ADR-019: un solo lector no certifica un patrón). Casos: (1) abrir
      con pocas opciones; (2) teclear hasta truncar; (3) seguir tecleando dentro del
      truncado; (4) llegar a cero resultados; (5) navegar con flechas por las 100
      opciones. Criterio: la truncación se anuncia **una vez** al aparecer, el
      recuento normal **no** se duplica con el anuncio nativo del lector, y cada
      opción activa se lee al navegar.
- [ ] **Pendiente** — decidir con ese resultado si VoiceOver necesita el recuento
      explícito (ver §Limitación conocida). **No se implementa antes del pase.**

## Fuera de alcance

- **Virtual scroll:** ADR-023 §4. Llega con la tabla de datos Pro. Añadir
  `@angular/cdk` para esto está **prohibido**.
- **Selección múltiple** (`aria-multiselectable`, `value` como array): v1 es
  selección simple.
- **Agrupación** (`role="group"` / `optgroup`) y encabezados de sección.
- **Carga asíncrona / paginación incremental** (scroll infinito): el cap es un
  corte duro con mensaje, no una ventana paginada.
- **Filtrado difuso o por relevancia:** `filter` es coincidencia por subcadena; un
  ranking mejor es responsabilidad del consumidor, que puede pasar `options` ya
  ordenadas.
- **Las pieles `select` y `combobox`:** contratos aparte en `docs/contracts/`, que
  **no se abren hasta que este y [`overlay.md`](./overlay.md) estén aprobados**.
