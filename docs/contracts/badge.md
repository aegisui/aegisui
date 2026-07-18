# Contrato: Badge

**Estado:** implementación pendiente

> Quinto y último del set mínimo de la landing. El **más simple de los cinco**:
> texto estilado, sin interacción, sin foco, sin teclado, sin estado. Su
> superficie de riesgo no está en el comportamiento sino en el **color**: es el
> componente donde más fácil sería violar ADR-014/015 convirtiendo un estado en
> una acción.

## Propósito

`<aegis-badge>` etiqueta un elemento con una **palabra o dos** que comunican su
estado o categoría ("Activo", "Beta", "3 pendientes", "Pro").

**Cuándo NO usarlo:**

- Para una **acción** ("Eliminar", "Actualizar plan") → un `<aegis-button>`. Un
  badge no es pulsable (§Fuera de alcance), y estilarlo como si lo fuera es la
  confusión que ADR-014 existe para prevenir.
- Para un **mensaje de estado que el usuario debe leer** ("No se pudo guardar el
  documento") → un componente de alerta con `role="alert"` y anuncio. Un badge
  no anuncia nada.
- Para **texto largo** o una frase → un párrafo con su propio color de estado.
  Un badge de doce palabras es un párrafo con fondo, y su `border-radius` y su
  altura compacta dejan de tener sentido.
- Para **filtrar o quitar** ("chip" con una ✕) → un componente `chip`
  interactivo, fuera de alcance.

## Selector

`<aegis-badge>`

Renderiza un **`<span>`** con el tinte, el radio y el padding, y proyecta el
texto dentro. Un `<span>` y no un `<div>` porque un badge es contenido en
línea, que fluye junto al texto o al encabezado que acompaña; y no un `<mark>`,
que tiene semántica propia de "resaltado por relevancia para el usuario" y que
algunos lectores anuncian ("resaltado") — semántica que el consumidor no ha
pedido.

## Inputs (signals)

| Nombre | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `variant` | `'neutral' \| 'accent' \| 'success' \| 'warning' \| 'danger'` | `'neutral'` | no | Familia de color del tinte. **Solo comunica junto al texto proyectado, nunca en su lugar** (ver §Accesibilidad, 1.4.1). |
| `size` | `'sm' \| 'md'` | `'md'` | no | Escala de tipografía y padding. Solo dos tamaños: un badge más grande que `md` compite con el texto que etiqueta. |

**No hay input `icon`, `dot` ni `removable`** — ver §Fuera de alcance.

## Outputs

**Ninguno.** El Badge no es interactivo.

## Content projection

**Un único slot por defecto** (`<ng-content>`), para el texto.

Es un slot y no un input `text: string` — decisión **opuesta** a la de `label`
en Input y Switch, y merece justificación porque diverge:

- En Input/Switch, `label` es un input de texto porque el componente necesita
  **poseer el `<label>` y su relación `for`/`id`** con el control, para que esa
  relación sea verificable en CI. Un slot dejaría el nombre accesible a merced
  del consumidor.
- En el Badge **no hay control, no hay relación que garantizar y no hay nombre
  accesible que computar**. El contenido es texto plano que se pinta. Un slot
  permite lo que un `string` impediría sin ganar nada a cambio: interpolar un
  contador (`{{ n }} pendientes`), un `<time>`, o texto ya localizado con su
  propio marcado.

## Tokens que consume

Lista **exhaustiva** de capa 3 (ADR-016: local al componente; dos rieles —
color→capa 2, estructura→capa 1). Cero literales.

- `--aegis-badge-bg`
- `--aegis-badge-fg`
- `--aegis-badge-border-color`
- `--aegis-badge-border-width`
- `--aegis-badge-radius`
- `--aegis-badge-padding-inline`
- `--aegis-badge-padding-block`
- `--aegis-badge-font-size`
- `--aegis-badge-font-weight`
- `--aegis-badge-line-height`

### Riel de COLOR → capa 2 (`--aegis-color-*`)

**La decisión central del contrato, y la que ADR-014/015 vigilan.** Un badge es
**estado, no acción**: _jade es lo que pulsas, el estado es lo que lees_
(ADR-014). Por tanto **todas** las variantes son **tinte de fondo + texto
oscuro**, nunca sólido saturado con texto blanco.

| `variant` | `--aegis-badge-bg` | `--aegis-badge-fg` | `--aegis-badge-border-color` |
|---|---|---|---|
| `neutral` | `--aegis-color-surface-sunken` | `--aegis-color-text-strong` | `--aegis-color-border-separator` |
| `accent` | `--aegis-color-accent-bg` | `--aegis-color-accent-text` | `--aegis-color-accent-bg` |
| `success` | `--aegis-color-state-success-bg` | `--aegis-color-state-success-text` | `--aegis-color-state-success-border` |
| `warning` | `--aegis-color-state-warning-bg` | `--aegis-color-state-warning-text` | `--aegis-color-state-warning-border` |
| `danger` | `--aegis-color-state-danger-bg` | `--aegis-color-state-danger-text` | `--aegis-color-state-danger-border` |

#### Lo que este contrato NO usa, y por qué (el raíl de ADR-014/015)

- **`destructive.*` — jamás.** `destructive.solid`/`on-solid` es una superficie
  de **acción** destructiva (ADR-015: el botón que *borra*). Un badge `danger`
  no borra nada: **describe** que algo está en estado de error. Mapear
  `badge --danger` a `destructive.solid` produciría una píldora roja sólida con
  texto blanco, indistinguible de un botón de borrar — exactamente el fallo que
  ADR-015 separó por nombre. `danger` aquí es `state.danger.*`, punto.
- **`accent.solid` / `accent.on-solid` — tampoco.** Misma razón simétrica: es
  la superficie del botón primario. La variante `accent` del badge usa
  `accent.bg` + `accent.text` (el par de tinte), no el par sólido. Un badge no
  debe parecer un botón primario.
- **No existe un `state.*.solid`**, así que para `success`/`warning`/`danger`
  el error ni siquiera es expresable: ADR-014 lo previene **por ausencia de
  token**. Este contrato es la primera confirmación de que ese raíl estructural
  funciona: al escribirlo, la opción incorrecta no estaba disponible.
- **Sin variante `info`** aunque `state.info.*` existe: la landing no la usa, y
  sembrar una variante sin consumidor sería un token muerto que
  `tokens-declared-in-contract` cazaría. Añadirla luego es aditivo y no rompe
  nada.

#### Verificación de contraste (mismo `contrastRatio` que el gate `contrast`)

Texto sobre su propio tinte, ≥ 4.5:1 (es **texto**, no UI):

| `variant` | Par | light | dark | umbral |
|---|---|---|---|---|
| `neutral` | `text.strong` / `surface.sunken` | 14.27:1 | 12.70:1 | ≥ 4.5:1 |
| `accent` | `accent.text` / `accent.bg` | 6.34:1 | 6.07:1 | ≥ 4.5:1 |
| `success` | `state.success.text` / `state.success.bg` | 5.82:1 | 8.84:1 | ≥ 4.5:1 |
| `warning` | `state.warning.text` / `state.warning.bg` | 6.67:1 | 10.07:1 | ≥ 4.5:1 |
| `danger` | `state.danger.text` / `state.danger.bg` | 6.46:1 | 8.63:1 | ≥ 4.5:1 |

**Las cinco pasan en ambos temas, con margen.** Ninguna variante se propuso sin
cruzar el umbral antes (mismo criterio que ADR-014/015/018).

#### El borde del Badge es DECORATIVO — verificado, no asumido (ADR-018)

`--aegis-badge-border-color` mapea a los `state.*.border` (y a
`border-separator` en `neutral`), que **no** llegan a 3:1 contra el lienzo:

| Borde | vs `surface.canvas` light | dark |
|---|---|---|
| `state.success.border` | 1.37:1 | 1.77:1 |
| `state.warning.border` | 1.51:1 | 2.48:1 |
| `state.danger.border` | 1.80:1 | 1.77:1 |
| `border.separator` (neutral) | 1.37:1 | 1.25:1 |

**Correcto, y no un fallo.** ADR-018 exige 3:1 solo cuando el borde es la
**única señal de límite de un control interactivo**. El Badge no es un control,
y su borde no es su señal de límite: el **tinte de fondo** lo es, y el
**texto** es lo que comunica. El borde solo define el canto del tinte. Si
desapareciera por completo, no se perdería ninguna información.

**Contraste con el Switch, para que la diferencia quede clara:** allí la pista
apagada **sí** exige borde `border.strong` a 3:1, porque su relleno
(`surface.sunken`, 1.16:1) es invisible sobre el lienzo y **es un control cuyo
estado hay que percibir**. Mismo tono de relleno, veredicto opuesto — porque
1.4.11 pregunta por la **función**, no por el color.

La variante `accent` usa `accent.bg` como su propio color de borde (borde
efectivamente invisible): tiene el tinte más claro y un borde `accent.border`
(5.09:1) resultaría un contorno duro incoherente con las otras cuatro
variantes.

### Riel de ESTRUCTURA → capa 1 (primitivos)

| Token de componente | Primitivo(s) de capa 1 |
|---|---|
| `--aegis-badge-border-width` | `--aegis-border-width-hairline` |
| `--aegis-badge-radius` | `--aegis-radius-sm` |
| `--aegis-badge-padding-inline` | `--aegis-space-2` (sm) · `--aegis-space-3` (md) |
| `--aegis-badge-padding-block` | `--aegis-space-1` (sm y md) |
| `--aegis-badge-font-size` | `--aegis-font-size-xs` (sm) · `--aegis-font-size-sm` (md) |
| `--aegis-badge-font-weight` | `--aegis-font-weight-medium` |
| `--aegis-badge-line-height` | `--aegis-font-leading-tight` |

Toda la geometría cae en la escala existente: **ningún primitivo nuevo**.
`radius-sm` (no `radius-full`) a propósito: una píldora completamente redonda
se lee como un contador o un botón; el radio pequeño la mantiene como etiqueta.

## Estados

**Ninguno.** Sin `hover`, `focus`, `active` ni `disabled`: el Badge no es
interactivo, así que no tiene nada a lo que responder. Igual que en la Card, un
`hover` sería una promesa falsa de interactividad.

`variant` y `size` son **inputs**, no estados.

## Accesibilidad (WCAG 2.2 AA — SPEC §8)

### Rol ARIA — ninguno

El Badge no aplica rol. Es un `<span>` con texto: el AT lo lee como parte del
flujo de contenido, que es exactamente lo correcto.

- **Nada de `role="status"` ni `aria-live`.** ADR-019 es explícito sobre cuándo
  procede una región live, y **ninguna de sus dos reglas aplica aquí**: el
  Badge no es una descripción asociada a un control (Regla 1) ni una
  notificación transitoria de estado de un control (Regla 2). Es contenido
  estático. Si el valor de un badge cambia y **eso** debe anunciarse, el
  anuncio es responsabilidad del contenedor que gestiona el cambio, no del
  badge — un badge que se auto-anuncia convertiría cada contador de la página
  en una interrupción.
- **Nada de `title`:** el atributo `title` no es accesible por teclado ni fiable
  en móvil. Si el texto del badge necesita explicación, va en el texto visible.

### El color NO comunica solo (1.4.1) — la regla de uso del componente

**Un badge cuya única diferencia con otro sea el color viola 1.4.1.** El
componente no puede impedirlo (no sabe qué texto se le proyecta), así que se
documenta como **regla de uso obligatoria**, con ejemplo:

- ❌ Cinco badges con el texto "Estado" y distinto `variant`.
- ✅ "Activo" (`success`), "Caducado" (`danger`), "Beta" (`accent`) — el texto
  ya distingue; el color **refuerza**.

`variant` es un **refuerzo visual redundante**, nunca el portador del
significado. Se documenta en la story de Storybook y en el README del
componente.

### Uso decorativo: cómo lo oculta el consumidor (sin que el componente lo imponga)

A veces el badge **duplica** información ya presente en el texto adyacente
("Plan Pro — [Pro]"). En ese caso el consumidor puede ocultarlo al AT:

```html
<aegis-badge variant="accent" aria-hidden="true">Pro</aegis-badge>
```

`aria-hidden="true"` sobre el host funciona sin ayuda del componente: **el
Badge no es enfocable ni tiene descendientes enfocables**, así que ocultarlo no
crea el fallo clásico de `aria-hidden` (dejar accesible por teclado algo
invisible para el AT). Esta propiedad es una **consecuencia directa** de que el
Badge no sea interactivo, y es la razón por la que se documenta este patrón
aquí y no en, por ejemplo, la Card (que sí puede contener controles).

**No se expone un input `decorative`** que aplique `aria-hidden` internamente:
sería una segunda forma de hacer lo que un atributo HTML estándar ya hace, y el
componente no puede saber si el texto está duplicado en el contexto — solo el
consumidor lo sabe. **La decisión es suya y la herramienta ya existe.**

**Advertencia documentada:** ocultar un badge que aporta información **única**
la elimina para el usuario de lector de pantalla. `aria-hidden` es para
redundancia, no para reducir verbosidad.

### Navegación por teclado

**No aplica.** El Badge no es enfocable, no lleva `tabindex` y no escucha
ninguna tecla. Como en la Card, **no hay sección `## Teclado`** a propósito:
una sección vacía sería un objetivo vacío para el gate `keyboard` (verde falso,
SPEC §13).

### Gestión y orden de foco

No aplica: no recibe foco, no lo mueve y no lo obscurece (2.4.11). No altera el
orden de tabulación de la página.

### Target size (2.5.7 / 2.5.8)

**No aplica:** no hay objetivo. 2.5.8 dimensiona *objetivos de puntero*, y el
Badge no lo es. Por eso —y solo por eso— puede ser más pequeño que 24 px sin
incumplir nada. **Si algún día se hiciera interactivo, 2.5.8 pasaría a aplicar
y el tamaño `sm` actual no lo cumpliría** — anotado como consecuencia directa
del §Fuera de alcance.

### Contraste (1.4.3)

Ver tabla en §Riel de color: las cinco variantes ≥ 4.5:1 en light y dark. El
texto del badge es **texto normal**, no "texto grande": `font-size-xs`
(0.64 rem) y `sm` (0.8 rem) están por debajo del umbral de texto grande, así
que **4.5:1 es el umbral correcto** — no 3:1. Se hace explícito porque
confundirse aquí sería el error fácil.

### Espaciado de texto (1.4.12)

Sin altura fija en px (`no-fixed-text-height`): el Badge crece con su texto.
Sin `overflow: hidden` ni truncado — un badge no oculta su propio texto.

### Criterios WCAG que aplican

1.3.1, **1.4.1 (uso del color — el criterio central de este componente)**,
1.4.3, 1.4.12. **No aplican:** 1.4.11 (borde decorativo, argumentado), 2.1.1,
2.1.2, 2.4.7, 2.4.11, 2.5.7, 2.5.8, 4.1.2, 4.1.3 — sin control, sin foco, sin
estado, sin anuncio.

## Casos límite

- **Texto largo:** el Badge **envuelve** en varias líneas y crece (no trunca,
  no aplica `white-space: nowrap`, no pone ellipsis). Truncar ocultaría el
  único contenido que el badge tiene. La solución a un badge largo es un texto
  más corto, no un componente que lo esconda.
- **Badge vacío** (sin contenido proyectado): renderiza una píldora vacía. **Es
  un defecto de uso** —un badge sin texto solo comunica por color, violando
  1.4.1— y se documenta como tal, pero **no se bloquea por código** (el
  componente no puede distinguir "vacío" de "aún cargando"). Se testea que no
  rompe el layout.
- **Alineación con el texto adyacente:** `vertical-align` coherente para que un
  badge junto a un `<h3>` no descoloque la línea base. `display: inline-flex`
  con `align-items: center`.
- **RTL:** propiedades lógicas (`padding-inline`). El texto se alinea según
  `dir` automáticamente. Sin `left`/`right` físicos.
- **Dentro de una Card:** el fondo pasa de `canvas` a `raised`. **No afecta a
  ninguna cifra de contraste**: el texto del badge se mide contra el tinte del
  **propio badge**, no contra el fondo de la página. Es la ventaja de que cada
  variante traiga su propia superficie.
- **Varios badges seguidos:** el espaciado entre ellos lo aporta el contenedor
  del consumidor (`gap`), no un margen del propio badge — un componente que
  trae margen propio es imposible de componer.

## Criterios de aceptación (se convierten en tests 1:1)

Unitarios (Vitest + Testing Library):

- [ ] Renderiza un `<span>` con el texto proyectado.
- [ ] `variant` por defecto es `neutral`; cada uno de los 5 aplica su par
      bg/fg.
- [ ] `size` por defecto es `md`; ambos aplican su escala.
- [ ] **No expone rol ARIA**, ni `aria-live`, ni `role="status"`, ni
      `role="alert"` (raíl de ADR-019: nadie añade una región live "por si
      acaso").
- [ ] **No es enfocable:** sin `tabindex`; `Tab` no se detiene en él.
- [ ] No registra ningún listener de clic ni de teclado.
- [ ] Badge vacío: renderiza sin romper el layout.
- [ ] Con `aria-hidden="true"` en el host, el texto no aparece en el árbol de
      accesibilidad (verifica el patrón decorativo documentado).

Raíl de tokens (ADR-014/015) — el test que protege la decisión central:

- [ ] El CSS del componente **no referencia** `--aegis-color-destructive-*` en
      ninguna variante.
- [ ] El CSS del componente **no referencia** `--aegis-color-accent-solid` ni
      `--aegis-color-accent-on-solid`.
- [ ] Cada variante de estado referencia **solo** claves del conjunto
      `{bg, text, border, point}` de su `state.*`.

Accesibilidad (axe — gate `a11y`):

- [ ] 0 violaciones en las 5 variantes × 2 tamaños, en light y dark.

Contraste (gate `contrast`):

- [ ] Las 5 variantes cumplen ≥ **4.5:1** (umbral de texto, no 3:1) en light y
      dark.
- [ ] El borde **no** se verifica contra 3:1 (decorativo, ADR-018).

Visual (gate `visual`):

- [ ] Snapshot de 5 variantes × 2 tamaños, en light y dark, sin diffs no
      aprobados.

Espaciado de texto (1.4.12):

- [ ] Con interlineado forzado, el Badge crece y no recorta el texto.

## Fuera de alcance

- **Badge interactivo / clicable** (filtro, "chip" con ✕ para quitar): en el
  momento en que se pulsa deja de ser un badge y pasa a necesitar rol, foco,
  teclado y **objetivo ≥ 24×24 px** (2.5.8, que hoy no aplica). Es un
  componente `chip` aparte, no una variante.
- **Icono dentro del badge** (punto de estado, ✓): añade pares de contraste
  y decisiones de alineación sin aportar información que el texto no dé ya. Si
  llega, será con su propio contrato.
- **Variante `dot`** (solo un punto de color, sin texto): **comunica únicamente
  por color** — violación directa de 1.4.1. No se implementa sin una solución
  de texto alternativo, y esa solución es… poner texto, es decir, un badge
  normal.
- **Variante `info`:** ver §Riel de color. Aditiva y sin ruptura cuando haga
  falta.
- **Variante `outline`** (sin relleno, solo borde): el borde pasaría a ser la
  única señal de límite y exigiría 3:1, que los `state.*.border` **no cumplen**
  (ver tabla). Requeriría tokens de borde de estado nuevos — precisamente el
  tipo de expansión de alcance que este contrato evita.
- **Badge posicionado sobre otro elemento** (contador sobre el icono de una
  campana): es un patrón de posicionamiento (`cdk`), no un cambio en este
  componente.
