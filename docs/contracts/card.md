# Contrato: Card

**Estado:** implementación pendiente

> Cuarto del set mínimo de la landing. Es el componente **más simple de los
> cinco en accesibilidad**: no tiene rol, ni estado, ni teclado, ni foco. Su
> contrato es corto **a propósito** — inflarlo con secciones ceremoniales de
> a11y que no aplican sería ruido, no rigor. Cada apartado de WCAG que no aplica
> se declara explícitamente como "no aplica, y por qué".

## Propósito

`<aegis-card>` agrupa contenido relacionado sobre una **superficie elevada**,
con borde, radio y padding coherentes con el sistema.

**Cuándo NO usarlo:**

- Para una **región navegable** de la página (`<section>` con encabezado, un
  `<aside>`, un `<nav>`) → esos elementos aportan la semántica; la Card no.
  Puedes envolverlos o anidarlos, pero la Card no los sustituye.
- Para un **contenedor clicable entero** ("card que navega a un detalle") →
  fuera de alcance v1 (ver §Fuera de alcance) por sus trampas de a11y.
- Para **separar visualmente sin agrupar semánticamente** → un divisor
  (`border-separator`) o simple espaciado: no metas una superficie donde solo
  hace falta aire.
- Como **panel de diálogo o popover** → esos llevan foco atrapado y capa de
  overlay: componentes propios, no una Card con `position: fixed`.

## Selector

`<aegis-card>`

El componente renderiza **un único `<div>`** con la superficie y el padding, y
proyecta el contenido dentro. No renderiza `<section>`, `<article>` ni ningún
elemento con semántica implícita: elegir por el consumidor qué *significa* el
grupo sería una decisión que el componente no puede tomar (ver §Rol ARIA).

## Inputs (signals)

| Nombre | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | no | Espaciado interior. `'none'` existe para contenido que debe llegar al borde (una imagen de cabecera a sangre); el consumidor aporta entonces su propio padding al texto. |
| `elevation` | `'flat' \| 'raised'` | `'flat'` | no | `'flat'`: superficie + borde, sin sombra (el default; el borde es la señal de límite). `'raised'`: añade sombra de capa 1 para separar del fondo en composiciones densas. |

**Deliberadamente NO hay input `variant`** (`success`/`danger`/…): una Card
teñida de color de estado sería un patrón de alerta, y una alerta necesita rol
(`role="alert"`/`role="status"`) y anuncio — es otro componente. Teñir la Card
sin ese rol produciría un mensaje que solo perciben los usuarios videntes
(1.4.1). Si hace falta señalar estado dentro de una Card, se compone un
`<aegis-badge>` dentro.

## Outputs

**Ninguno.** La Card no es interactiva (§Fuera de alcance). No expone
`(click)` propio: los eventos del contenido proyectado bubblean solos si el
consumidor los necesita.

## Content projection

**Un único slot por defecto** (`<ng-content>`).

### Decisión: v1 NO lleva slots nombrados `header`/`footer` — y por qué

Se evaluó añadir `<ng-content select="[card-header]">` / `[card-footer]`. **Se
descarta para v1.** El razonamiento, para que no se reabra:

- **Lo que el consumidor gana con el slot por defecto:** todo lo que la landing
  necesita. Una card de feature (icono + título + texto) y una de precio
  (título + precio + lista + CTA) se componen enteras dentro del slot por
  defecto, con la jerarquía de encabezados que el consumidor decida — que es
  precisamente la que **debe** decidir él (ver §Rol ARIA).
- **Lo único que un slot nombrado aportaría de verdad** es un separador de
  borde a borde (`border-separator`) entre secciones, imposible desde dentro de
  un contenedor con padding. Eso es real, pero es **un caso de la landing que
  se resuelve con `padding="none"`** + composición del consumidor.
- **Lo que costaría:** detectar slot vacío para no renderizar padding ni
  separadores fantasma. En Angular eso significa `contentChild`/`ngProjectAs` y
  una rama de plantilla por slot — complejidad estructural real en el
  componente **más simple de la librería**, y tres estados de render extra que
  multiplican los snapshots del gate `visual` (padding × elevation × presencia
  de cada slot).

**Criterio de reapertura (explícito):** si al construir la landing aparecen
**dos o más** composiciones que necesiten el separador a sangre, se añade
`header`/`footer` en un contrato-v2 con su ADR. Una sola no basta: se resuelve
con `padding="none"`.

## Tokens que consume

Lista **exhaustiva** de capa 3 (ADR-016: local al componente; dos rieles —
color→capa 2, estructura→capa 1). Cero literales.

- `--aegis-card-bg`
- `--aegis-card-fg`
- `--aegis-card-border-color`
- `--aegis-card-border-width`
- `--aegis-card-radius`
- `--aegis-card-padding`
- `--aegis-card-shadow`

### Riel de COLOR → capa 2 (`--aegis-color-*`)

| Token de componente | Mapeo (capa 2) |
|---|---|
| `--aegis-card-bg` | `--aegis-color-surface-raised` |
| `--aegis-card-fg` | `--aegis-color-text-strong` |
| `--aegis-card-border-color` | `--aegis-color-border-separator` |

#### El borde es DECORATIVO, y por eso es `border-separator` (ADR-018)

Esta es la única decisión con enjundia del contrato, y va argumentada porque
ADR-018 exige elegir el rol de borde a conciencia:

`--aegis-card-border-color` mapea a **`border.separator`**, no a
`border.strong`. Verificado (mismo `contrastRatio` que el gate `contrast`):

| Par | light | dark |
|---|---|---|
| `border.separator` / `surface.canvas` | 1.37:1 | 1.25:1 |
| `surface.raised` / `surface.canvas` (delta de superficie) | 1.07:1 | 1.12:1 |

Ninguno llega a 3:1 — **y no tiene por qué**. ADR-018 fija el criterio: 1.4.11
exige 3:1 para "componentes de interfaz de usuario" cuyo límite sea necesario
para **identificar el control y su estado**. La Card **no es un control**: no
se enfoca, no se activa, no tiene estado. Su borde no comunica nada que se
pierda si no se percibe — el contenido de la Card es legible por sí mismo
(`text.strong` / `surface.raised` = **15.56:1 light / 14.27:1 dark**, muy por
encima de 4.5:1) y esa legibilidad **no depende** de que se vea el borde.

Es exactamente el caso que ADR-018 nombra: _"contorno de tarjetas"_ aparece
literalmente en la definición de `border.separator` como uso decorativo.

**Lo que sí sería un error** (y el gate `contrast` debe seguir sin exigirlo
aquí): usar `border.strong` "por si acaso". Sobre-contrastar un borde
decorativo con `neutral.500` convertiría cada Card en una caja de trazo duro
que compite visualmente con los controles reales — el borde de un Input, que
**sí** es funcional, dejaría de distinguirse del contorno de una tarjeta. La
jerarquía de bordes es información: gastarla en decoración la destruye.

### Riel de ESTRUCTURA → capa 1 (primitivos)

| Token de componente | Primitivo(s) de capa 1 |
|---|---|
| `--aegis-card-border-width` | `--aegis-border-width-hairline` |
| `--aegis-card-radius` | `--aegis-radius-lg` |
| `--aegis-card-padding` | `--aegis-space-0` (none) · `--aegis-space-3` (sm) · `--aegis-space-5` (md) · `--aegis-space-6` (lg) |
| `--aegis-card-shadow` | `--aegis-elevation-0` (flat) · `--aegis-elevation-2` (raised) |

Toda la geometría cae en la escala existente; **no hace falta ningún primitivo
nuevo**. `--aegis-elevation-0` es `none`, así que `flat` no es un caso especial
del CSS: es el mismo token con otro valor.

## Estados

**Ninguno.** La Card no tiene `hover`, `focus`, `active`, `disabled` ni
`selected`. No es una omisión: es la consecuencia directa de no ser interactiva
(§Fuera de alcance). Un `hover` sobre algo que no se puede activar es una
promesa falsa de interactividad — el error de a11y más común de las "cards
clicables" mal hechas.

Las dos únicas dimensiones visuales son `padding` (4 valores) y `elevation`
(2 valores), y ambas son **inputs**, no estados: no cambian en respuesta a la
interacción del usuario.

## Accesibilidad (WCAG 2.2 AA — SPEC §8)

### Rol ARIA — deliberadamente NINGUNO

La Card **no aplica ningún rol ARIA**, ni `region`, ni `group`, ni `article`.
Es la decisión de a11y del contrato, y es una decisión de *no hacer*:

- **`role="region"` sería activamente dañino.** Una región es un *landmark*:
  aparece en la lista de landmarks del lector de pantalla y exige nombre
  accesible (`aria-label`/`aria-labelledby`). Una landing con ocho tarjetas de
  feature generaría ocho landmarks anónimos, inundando la herramienta de
  navegación que existe justamente para saltar rápido a las zonas importantes.
  Un landmark de más es peor que ninguno.
- **`role="group"` tampoco:** `group` tiene sentido para controles de formulario
  relacionados, no para contenido de lectura.
- **La semántica la aporta el consumidor**, y puede hacerlo de dos formas, las
  dos válidas: envolviendo la Card en el elemento correcto
  (`<section aria-labelledby="…"><aegis-card>…</aegis-card></section>`), o
  proyectando dentro un encabezado (`<h3>`) que sitúe el bloque en el esquema
  del documento. La segunda es la que usará la landing.

**Consecuencia documentada para el consumidor:** una Card **no** crea un nivel
en el esquema de encabezados. Si el contenido proyectado necesita título, el
consumidor proyecta el `<hN>` del nivel correcto **para su página** — el
componente no puede saber si es `h2` o `h4`, y elegir uno fijo rompería la
jerarquía de encabezados (1.3.1) en la mitad de los usos. Por eso `header` no
es un input de texto (a diferencia de `label` en Input y Switch, donde el
elemento correcto —`<label>`— **sí** es conocido de antemano).

### Navegación por teclado

**No aplica.** La Card no es enfocable y no maneja ninguna tecla: no lleva
`tabindex`, no escucha `keydown`. El contenido proyectado conserva su propio
orden de tabulación natural — la Card no lo altera de ninguna forma (sin
`tabindex` positivos, sin trampas de foco).

No hay sección `## Teclado` en este contrato **a propósito**: declarar una
sección vacía haría que el gate `keyboard` la parsease como "cero teclas
declaradas", verde sin objetivo — justo el verde-falso que SPEC §13 prohíbe. La
ausencia de sección es la declaración correcta.

### Gestión y orden de foco

- La Card **no recibe foco** ni lo mueve.
- **No obscurece el foco de otros elementos (2.4.11):** la Card no usa
  `position: fixed`/`sticky` ni se superpone a nada. Y hacia dentro: **no
  recorta el anillo de foco** del contenido proyectado — el `border-radius`
  **no** viene acompañado de `overflow: hidden`, precisamente para que el
  `outline` de un Button o un Input dentro de la Card no quede cortado en las
  esquinas. Es un fallo clásico de 2.4.11 y se testea.

### Target size (2.5.7 / 2.5.8)

**No aplica:** no hay objetivo que dimensionar (la Card no es activable). Los
controles proyectados dentro cumplen 2.5.8 por su cuenta — el Button y el Input
ya lo garantizan. La Card **no debe** reducir ese objetivo, y no lo hace: solo
aporta padding hacia fuera.

### Contraste (1.4.3 / 1.4.11)

- **Texto proyectado:** `text.strong` sobre `surface.raised` = 15.56:1 (light)
  / 14.27:1 (dark), ≥ 4.5:1 con enorme margen. La Card **cambia la superficie
  de fondo** del contenido (de `canvas` a `raised`), así que este par importa y
  se verifica — es la razón por la que las tablas de contraste de Switch y
  Badge incluyen su fila "contra `surface.raised`": los componentes acaban
  dentro de Cards.
- **Borde:** decorativo, exento de 3:1 (ver §Riel de color, con el argumento
  completo).

### Reduced motion (`prefers-reduced-motion`)

La Card **no tiene ninguna animación ni transición** en v1: nada que anular. La
regla `require-reduced-motion` se satisface trivialmente porque no hay
propiedad animada. (Si `elevation` llegara a animarse en hover en un futuro,
ese hover sería interactividad y entraría en el debate de §Fuera de alcance.)

### Espaciado de texto (1.4.12)

Sin alturas fijas en px (`no-fixed-text-height`): la Card **crece con su
contenido**. No hay `height` ni `max-height`, así que forzar interlineado o
espaciado de letras nunca recorta ni solapa texto. Esto es lo que hace que un
grid de cards con `align-items: stretch` siga funcionando con 1.4.12 aplicado.

### Criterios WCAG que aplican

1.3.1 (no romper el esquema de encabezados ni introducir landmarks espurios —
por eso no hay rol), 1.4.3 y 1.4.12 (sobre el contenido proyectado), 2.4.11 (no
recortar el anillo de foco del contenido). **No aplican:** 2.1.1, 2.1.2, 2.4.7,
2.5.7, 2.5.8, 4.1.2 — no hay control, no hay foco, no hay estado que exponer.

## Casos límite

- **Card vacía** (sin contenido proyectado): renderiza la superficie con su
  padding. No es un error (un esqueleto de carga es un uso legítimo), pero
  tampoco se le añade contenido de relleno ni se colapsa.
- **`padding="none"` con texto directo:** el texto queda pegado al borde. Es lo
  pedido; la responsabilidad del espaciado pasa al consumidor. Documentado como
  uso avanzado, no como default.
- **Contenido más ancho que la Card** (tabla, bloque de código): la Card **no**
  aplica `overflow: hidden` (rompería el anillo de foco, ver §Foco). El
  consumidor envuelve el contenido desbordante en su propio contenedor con
  `overflow-x: auto`. Documentado.
- **Cards anidadas:** técnicamente funciona, visualmente desaconsejado
  (`raised` sobre `raised` da 1:1 de delta: dos superficies idénticas sin
  separación perceptible salvo por el borde). Documentado como antipatrón, no
  bloqueado por código.
- **RTL:** propiedades lógicas (`padding-inline`/`padding-block`). El
  `border-radius` es uniforme, así que RTL no le afecta. Sin `left`/`right`
  físicos.

## Criterios de aceptación (se convierten en tests 1:1)

Unitarios (Vitest + Testing Library):

- [ ] Renderiza el contenido proyectado en el slot por defecto.
- [ ] `padding` por defecto es `md`; cada valor aplica su escala (incl. `none`).
- [ ] `elevation` por defecto es `flat`; `raised` aplica la sombra.
- [ ] **No expone ningún rol ARIA** (`role` ausente en el elemento raíz) y no
      tiene `aria-label` ni `aria-labelledby` propios.
- [ ] **No es enfocable:** sin `tabindex`; `Tab` no se detiene en la Card.
- [ ] El orden de tabulación del contenido proyectado es el del DOM, inalterado.
- [ ] La Card no registra ningún listener de teclado ni de clic propio.

Accesibilidad (axe — gate `a11y`):

- [ ] 0 violaciones en las 4 × 2 combinaciones (`padding` × `elevation`), en
      light y dark.
- [ ] 0 violaciones con contenido interactivo proyectado dentro (un
      `<aegis-button>`), verificando que la Card no rompe su semántica.

Contraste (gate `contrast`):

- [ ] `text.strong` / `surface.raised` ≥ 4.5:1 en light y dark.
- [ ] El borde **no** se verifica contra 3:1 (es `border-separator`,
      decorativo) — y el gate no debe exigirlo, coherente con ADR-018.

Foco (2.4.11) — el test que de verdad importa aquí:

- [ ] Un `<aegis-button>` proyectado **en la esquina** de la Card muestra su
      anillo de foco **completo**, sin recorte: se verifica que la Card no
      aplica `overflow: hidden`.

Target size:

- [ ] Un control proyectado conserva su objetivo ≥ 24×24 px dentro de la Card
      (la Card no lo encoge).

Visual (gate `visual`):

- [ ] Snapshot de `padding` × `elevation`, en light y dark, sin diffs no
      aprobados.

Espaciado de texto (1.4.12):

- [ ] Con interlineado/espaciado forzados, la Card crece y no recorta ni solapa
      el contenido (sin `height` fija).

## Fuera de alcance

- **Card interactiva / clicable entera** (navega a un detalle al pulsar
  cualquier punto). Excluida **a propósito**, y no por pereza: el patrón tiene
  tres trampas que no vamos a resolver en v1 — (1) un `<div>` clicable no es
  enfocable ni activable por teclado sin reconstruir a mano el rol, el
  `tabindex` y el manejo de `Enter`/`Space`; (2) la alternativa correcta
  (envolver todo en un `<a>`) hace que el nombre accesible del enlace sea
  **todo** el texto de la tarjeta, que los lectores anuncian entero; (3) el
  patrón que sí funciona ("link superpuesto" con un `<a>` en el título y un
  pseudo-elemento que cubre la card) hace **inseleccionable** el texto con el
  ratón e interfiere con los controles anidados. Cada una necesita decisión
  propia. **Mientras tanto:** un `<aegis-button>` o un enlace **dentro** de la
  Card cubre el caso de la landing sin ninguna de las tres trampas.
- **Slots `header` / `footer`:** ver §Content projection (con criterio de
  reapertura explícito).
- **`variant` de color de estado:** ver §Inputs — sería un componente de alerta.
- **Card seleccionable** (checkbox/radio card de un formulario): es un control
  de formulario disfrazado de tarjeta; componente aparte con su propia
  semántica (`role="radio"`/`checkbox`), no una variante de este.
- **Media a sangre con esquinas redondeadas automáticas** (imagen que hereda el
  `border-radius` de la Card): requiere `overflow: hidden`, que **rompe el
  anillo de foco** (§Foco). El consumidor que lo quiera aplica el radio a su
  propia imagen.
- **Skeleton / estado de carga:** un componente `skeleton` aparte, que se
  proyecta dentro.
