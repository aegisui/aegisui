# ADR-016: La capa 3 es local al componente, y el theming tiene dos rieles (color→capa 2, estructura→capa 1)

## Contexto

El sistema de tokens tiene tres capas (SPEC §5.1): 1 primitivos, 2 semánticos
(donde vive el dark mode, ADR-014), 3 de componente. Al implementar el primer
componente real (Button, Fase 3) hubo que decidir dos cosas que el SPEC dejaba
implícitas y que **plantean el theming de toda la librería**:

1. **¿Dónde vive la capa 3?** El contrato del Button decía «en `packages/tokens`».
2. **¿Contra qué se define la capa 3?** La intuición inicial era «capa 3 siempre en
   términos de capa 2, nunca capa 1». Encaja para color, pero choca con la
   estructura (padding, radio, tipografía, anchos de borde/ring), que no tiene
   capa 2 porque no varía con el tema.

## Decisión

### 1. La capa 3 es LOCAL al componente

Los tokens `--aegis-<cmp>-*` se **definen en el CSS del propio componente**, no en
`packages/tokens`. `packages/tokens` expone **solo capas 1 y 2** (el sistema
compartido). El valor de `--aegis-btn-bg` por variante **es la definición visual
del Button**, tan suya como su HTML: mapear capa 2 → su propia capa 3 es trabajo
del componente.

**Por qué:**

- **Naturaleza:** la capa 3 es local por definición (SPEC §5.1: «de componente»).
  Centralizarla en `packages/tokens` acoplaría el sistema compartido a cada
  componente.
- **Distribución dual (ADR-003):** con la capa 3 en la carpeta del componente,
  `npx aegisui add button` copia esa carpeta y se lleva sus remapeos —
  autocontenido, sin arrastrar un fichero global ni duplicar nada. El build npm y
  el CLI copia-fuente comparten exactamente la misma capa 3.

### 2. Dos rieles: color→capa 2, estructura→capa 1

La regla «capa 3 nunca sobre capa 1» **solo aplica al color**, y existe por una
razón concreta: saltarse la capa 2 en el color **se salta el dark mode**. Ese
peligro **no existe en la estructura** (el padding no tiene modo oscuro). Aplicar
la prohibición a la estructura sería inercia: obligaría a inventar una capa 2 de
mapeos identidad vacíos.

| Riel | Qué | Capa 3 se define sobre… | Motivo |
|---|---|---|---|
| **Color** | bg, fg, border-color, ring-color | **capa 2** (`--aegis-color-*`) | ahí vive el dark mode (ADR-014) |
| **Estructura** | padding, radio, tipografía, gap, motion, ancho de borde, ancho/offset de ring, trazo | **capa 1** (`--aegis-space-*`, `--aegis-radius-*`, `--aegis-font-*`, `--aegis-motion-*`, `--aegis-border-width-*`, `--aegis-focus-ring-*`) | no varía con el tema; una capa 2 sería identidad |

### 3. Cero literales sigue intacto: la respuesta a un literal es un PRIMITIVO

`no-literal-design-values` sigue vigente **palabra por palabra**: ningún valor
crudo en el CSS de un componente, ni de color ni estructural. Lo que antes habría
sido un literal estructural (borde `1px`, ring `2px`, trazo del spinner) **no se
convierte en excepción**: se **crea como primitivo de capa 1**. Por eso este ADR
añade a `packages/tokens` las escalas que faltaban:

- `border.width` → `--aegis-border-width-{none,hairline,thin}`
- `focus.ring` → `--aegis-focus-ring-{width,offset}`

La regla del fixture `bad/` lo verifica en las dos direcciones: `border-radius: 4px`
(literal estructural) sigue cazado; la respuesta correcta a ese fallo es tokenizar,
no relajar la regla.

### 4. Foco compartido: sin global de capa 3

No existe un global de capa 3 para el foco. La parte compartida del anillo vive ya
en las capas comunes: **color** en capa 2 (`--aegis-color-accent-ring`, con su
dark), **ancho/offset** en capa 1 (`--aegis-focus-ring-*`). La consistencia entre
componentes sale de que **todos mapean a las mismas fuentes**, no de un token
compartido de capa 3. Si algún día emerge un *tratamiento* de foco compartido de
verdad, se promueve a capa 2 con su propio ADR — nunca un global preventivo.

## Consecuencias

- **Patrón para TODOS los componentes futuros:** la capa 3 se escribe en el CSS del
  componente; color sobre capa 2, estructura sobre capa 1; cero literales.
- `packages/tokens` gana las escalas estructurales que faltaban (border-width,
  focus-ring); la capa 3 **sigue naciendo vacía en `packages/tokens`** (no hay
  `component.json`): ahora se entiende por qué — nunca vivirá ahí.
- `tokens-declared-in-contract` reconcilia el CSS del componente (que ahora
  **define y consume** su capa 3) contra el contrato: el contrato lista tanto los
  `--aegis-<cmp>-*` como las fuentes de capa 1/2 que referencian.
- El contrato del Button se actualiza para reflejar los dos rieles en su tabla de
  tokens.
