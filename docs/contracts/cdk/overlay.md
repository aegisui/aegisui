# Contrato: `AegisOverlay` (primitivo de `@aegisui/cdk`)

> **Estado:** implementación pendiente
>
> **Sin matriz visual:** primitivo headless, no renderiza
>
> **Cobertura del gate `contracts`:** este contrato vive en `docs/contracts/cdk/` y
> **el gate lo reconcilia** con su propia regla (`reconcilePrimitives()` en
> [`scripts/check-contracts.mjs`](../../../scripts/check-contracts.mjs)): un
> contrato de primitivo headless es válido contra `packages/cdk/src/lib/`, **sin**
> exigir un componente `aegis-*` que nunca existirá. El marcador de arriba caduca
> solo en cuanto exista `packages/cdk/src/lib/overlay/overlay.ts`, igual que en
> ADR-020.

Primer primitivo de la Fase 5. Es el que desbloquea [ADR-023](../../adr/ADR-023-politica-de-dependencias-runtime.md)
y la base de Select, Combobox, Popover, Tooltip y Menu.

## Propósito

`AegisOverlay` **posiciona un elemento flotante respecto de un ancla** y nada más.
Es *brain* puro: cero CSS de presentación, cero tokens, cero opinión visual.

Reparto de responsabilidades — lo que **no** hace, porque ya lo hace algo mejor:

| Responsabilidad | Quién |
|---|---|
| Capa superior, `z-index`, cierre por `Esc`, clic fuera, restauración de foco | **Popover API nativa** (`popover="auto"`), Baseline *newly available* desde 2025-01-27 — adopción decidida conscientemente en ADR-023 Hallazgo 5 |
| Colisión de viewport (flip, shift, tamaño disponible), reposicionamiento en scroll | **`@floating-ui/dom`** (ADR-023) |
| Semántica del contenido (`role`, `aria-*`, foco virtual) | El primitivo que lo use ([`listbox.md`](./listbox.md)), nunca este |
| Aspecto | La piel en `@aegisui/ui` |

**Cuándo NO usarlo:** para un diálogo modal → `<dialog>` nativo (otro primitivo);
para contenido que fluye en la página → no necesitas un overlay.

## Superficie pública

Directiva standalone, signals-only, `OnPush`, sin `NgModule`.

### Tipos propios — la frontera de ADR-023 §3

```ts
export type AegisPlacement =
  | 'top' | 'top-start' | 'top-end'
  | 'right' | 'right-start' | 'right-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end';
```

**Regla innegociable:** ningún tipo de `@floating-ui/dom` (`Placement`,
`Middleware`, `ComputePositionReturn`, `Strategy`…) aparece en la API pública, ni
directa ni indirectamente vía inferencia. `AegisPlacement` es **nuestra** unión,
aunque hoy coincida carácter a carácter con la suya.

Por qué importa, y no es purismo: es lo que permite que la dependencia sea
`dependencies` y no `peerDependency` (ADR-023 §3), y lo que hace real la
**condición de salida** del Hallazgo 5 — el día que `@position-try` sea ampliamente
disponible, Floating UI se retira **sin tocar la API pública ni romper a nadie**.
Filtrar un solo tipo suyo convierte esa retirada en un breaking change.

**Raíl automático:** un test de tipos verifica que la superficie declarada
(`.d.ts` construido) no contiene ninguna referencia a `@floating-ui/*`.

### Inputs

| Nombre | Tipo | Default | Descripción |
|---|---|---|---|
| `anchor` | `HTMLElement \| undefined` | `undefined` | Elemento respecto del que se posiciona. Si falta, el overlay no se posiciona y `open` se ignora (ver Casos límite). |
| `placement` | `AegisPlacement` | `'bottom-start'` | Posición **preferida**. Es una preferencia, no una garantía: si no cabe, `flip` elige otra. |
| `offset` | `number` | `0` | Separación en px entre ancla y flotante, en el eje principal. |
| `flip` | `boolean` | `true` | Permite voltear al lado opuesto cuando no cabe. |
| `shift` | `boolean` | `true` | Permite desplazar a lo largo del eje para mantenerlo dentro del viewport. |
| `matchAnchorWidth` | `boolean` | `false` | Fija el ancho del flotante al del ancla (el caso Select: el desplegable mide lo que el disparador). |
| `maxHeightFromViewport` | `boolean` | `true` | Expone el espacio disponible como custom property para que la piel limite su altura (ver más abajo). |

### Model

| Nombre | Tipo | Descripción |
|---|---|---|
| `open` | `boolean` | Two-way. La Popover API puede cerrar el overlay por su cuenta (Esc, clic fuera): cuando lo hace, `open` se sincroniza a `false` **desde el evento `toggle` nativo**, nunca al revés. Una sola fuente de verdad: el DOM. |

### Outputs

| Nombre | Payload | Cuándo |
|---|---|---|
| `placementChange` | `AegisPlacement` | La posición **efectiva** cambió (p. ej. `flip` volteó de `bottom-start` a `top-start`). Lo necesita la piel para orientar una flecha o invertir una animación. |

### Lo que expone al CSS (no son tokens)

Custom properties **estructurales** escritas por el primitivo, para que la piel
posicione sin leer geometría en JS. No son tokens de capa 3 ni pasan por el gate de
tokens: son valores calculados en tiempo real, no decisiones de diseño.

| Property | Contenido |
|---|---|
| `--aegis-overlay-x` / `--aegis-overlay-y` | Coordenadas calculadas, en px. |
| `--aegis-overlay-available-height` | Espacio vertical disponible (middleware `size`). La piel lo usa en `max-block-size` para que la lista scrollee en vez de desbordar. |
| `--aegis-overlay-anchor-width` | Ancho del ancla, cuando `matchAnchorWidth` está activo. |

También refleja `data-placement="<efectiva>"` en el host, para que la piel tenga un
gancho de estilo declarativo sin suscribirse a `placementChange`.

## Comportamiento

### Ciclo de vida del posicionamiento

- Al abrirse: `computePosition` una vez, **antes** del primer paint visible.
- Mientras está abierto: `autoUpdate` (scroll de cualquier ancestro, resize,
  cambios de tamaño del ancla o del flotante).
- Al cerrarse: `autoUpdate` se **desuscribe siempre**, también si el componente se
  destruye con el overlay abierto. Fuga de listeners = defecto (se testea).

### Apoyo en la Popover API

El flotante usa `popover="auto"`. De ahí salen **gratis y garantizados por el
navegador**: capa superior (sin `z-index`, sin quedar recortado por
`overflow: hidden` ni por un ancestro con `transform`), cierre con `Esc`, cierre al
clicar fuera, orden correcto de cierre entre overlays apilados y restauración del
foco al disparador.

Es la aplicación directa de SPEC §8 (no reinventar lo que la plataforma hace bien)
y de ADR-023 Hallazgo 5. **No** construimos portal propio, **no** gestionamos
`z-index`, **no** escribimos un dispatcher de clic-fuera.

## Accesibilidad (WCAG 2.2 AA — SPEC §8)

**Este primitivo no aporta semántica.** No pone `role`, ni `aria-expanded`, ni
`aria-controls`: eso pertenece al patrón que lo usa (combobox, menú, tooltip), y
ponerlo aquí produciría roles incorrectos en la mitad de los casos.

Lo que **sí** garantiza:

- **2.4.11 Focus Not Obscured** — es el criterio que este primitivo puede violar y
  el motivo por el que `flip`/`shift` están activos por defecto: un overlay que tapa
  el control enfocado es una violación. Verificado por el gate `a11y` con el ancla
  cerca de cada borde del viewport.
- **1.4.10 Reflow** — con `maxHeightFromViewport`, el contenido nunca desborda el
  viewport ni fuerza scroll en dos ejes a 320 px.
- **2.1.2 Sin trampa de teclado** — garantizado por `popover="auto"` (Esc siempre
  cierra y devuelve el foco).
- **1.4.12 Espaciado de texto** — sin alturas fijas; el espacio disponible se
  expone, no se impone.

### Teclado

| Tecla | Comportamiento |
|---|---|
| `Escape` | Cierra el overlay y devuelve el foco al ancla. **Comportamiento nativo de `popover="auto"`**, no interceptado. |

`data-handles` declara **lista vacía**: el primitivo no gestiona ninguna tecla por
su cuenta. Toda la navegación por teclado del contenido pertenece a
[`listbox.md`](./listbox.md).

### Reduced motion

El primitivo no anima. Si la piel anima la apertura, la anula bajo
`prefers-reduced-motion` (regla `require-reduced-motion`).

## Casos límite

- **Sin `anchor`:** el overlay no se posiciona y `open=true` se ignora (queda
  cerrado). Se prefiere no abrir a abrir en `0,0`.
- **Ancla eliminada del DOM con el overlay abierto:** se cierra y devuelve `open`
  a `false`. Un flotante anclado a nada es un fantasma.
- **Ancla dentro de un contenedor con scroll:** `autoUpdate` reposiciona; cuando
  el ancla sale del área visible del scroller, el overlay se oculta (evita quedar
  flotando junto a un ancla invisible).
- **No cabe en ningún sitio** (viewport minúsculo): gana `shift` — se prioriza que
  sea **visible y accesible** sobre respetar `placement`.
- **RTL:** `computePosition` resuelve `start`/`end` según la dirección computada;
  el primitivo no invierte nada a mano. Sin `left`/`right` físicos.
- **SSR / sin DOM:** `@floating-ui/dom` no toca `window` ni `document` en el
  top-level (verificado en el paquete publicado), así que importarlo es seguro en
  servidor. El posicionamiento solo corre en navegador; en servidor el overlay
  renderiza cerrado.
- **Doble apertura / apertura durante el cierre:** idempotente; nunca dos
  `autoUpdate` vivos sobre el mismo par.

## Criterios de aceptación (se convierten en tests 1:1)

Unitarios (Vitest + Testing Library):

- [ ] Con `open=true` y `anchor`, el flotante recibe coordenadas y queda visible.
- [ ] `placement` por defecto es `'bottom-start'`.
- [ ] Sin espacio abajo, `flip=true` voltea arriba y emite `placementChange`.
- [ ] `flip=false` **no** voltea aunque no quepa.
- [ ] `shift=true` mantiene el flotante dentro del viewport cerca de un borde.
- [ ] `matchAnchorWidth=true` fija `--aegis-overlay-anchor-width` al ancho del ancla.
- [ ] `maxHeightFromViewport=true` publica `--aegis-overlay-available-height`.
- [ ] `data-placement` refleja la posición **efectiva**, no la preferida.
- [ ] Cerrar por `Esc` sincroniza `open` a `false` vía el evento `toggle` nativo.
- [ ] Destruir el componente con el overlay abierto **desuscribe `autoUpdate`**
      (sin listeners huérfanos).
- [ ] Sin `anchor`, `open=true` no abre nada.
- [ ] Ancla retirada del DOM → el overlay se cierra solo.

Frontera de la dependencia (ADR-023 §3):

- [ ] El `.d.ts` construido de `@aegisui/cdk` **no contiene** ninguna referencia a
      `@floating-ui/*`. Es el raíl que mantiene la dependencia retirable.
- [ ] `@floating-ui/dom` aparece en `dependencies` de `packages/cdk/package.json`
      con **versión exacta**, y **no** en `@aegisui/ui`.

Teclado (gate `keyboard`):

- [ ] `Escape` cierra y devuelve el foco al ancla.
- [ ] `data-handles` vacío coincide con la tabla de Teclado.

Accesibilidad (gate `a11y`):

- [ ] 0 violaciones con el overlay abierto, en light y dark.
- [ ] **2.4.11:** con el ancla pegada a cada uno de los cuatro bordes del viewport,
      el overlay no obscurece el control enfocado.

Tamaño (`size-limit`):

- [ ] La entrada nueva de ADR-023 §6 (cdk **con** Floating UI incluida, Angular
      externo) se añade **en este mismo PR** y queda **≤ 12 kB**.

Manual (antes de release):

- [ ] **Pendiente** — comprobar en Safari, Firefox y Chromium reales que
      `popover="auto"` restaura el foco al ancla al cerrar y que el overlay no
      queda recortado dentro de un ancestro con `overflow: hidden` ni con
      `transform`. Es el motivo por el que existen los portales; si la plataforma no
      lo cumpliera en algún navegador soportado, este contrato cambia.

## Fuera de alcance

- **Virtual scroll**: aplazado a la tabla de datos Pro (ADR-023 §4).
- **Flecha / arrow**: el middleware `arrow` no entra en v1 (ADR-023 §Alcance exacto).
- **Diálogo modal, scroll lock, foco atrapado**: `<dialog>` nativo, otro primitivo.
- **Middleware del consumidor**: prohibido por ADR-023 §3 — expondría tipos de
  Floating UI y convertiría la dependencia en `peer`.
- **Anclaje y colisión nativos en CSS** (`anchor-name`, `@position-try`): hoy
  `baseline: false` en `web-features` (*limited availability*). Se revisan cuando
  `anchor-positioning` llegue a *widely available* — ADR-023 §Condición de salida
  trae el comando exacto que lo comprueba.
