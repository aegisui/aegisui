# ADR-015: Acción destructiva sólida (`color.destructive.*`), separada del estado `danger`

## Contexto

ADR-014 fijó un raíl **estructural**: los roles de **estado**
(`success`/`warning`/`danger`/`info`) existen **solo** como tinte de fondo
(`bg`), texto oscuro (`text`), borde (`border`) e indicador puntual (`point`).
**No existe** ningún `solid` / `on-solid` de estado (sólido de color saturado con
texto blanco encima). La separación jade/estado se garantiza por **ausencia de
token**: _jade es lo que pulsas; el estado es lo que lees_. Ese raíl se verifica
en `packages/tokens/src/tokens.spec.ts` (un `state.*` que gane `solid`/`on-solid`
rompe el test).

La Fase 3 (contrato del Button) necesita una variante `danger`: un **botón de
acción destructiva** de alto énfasis (borrar, revocar), relleno y con texto
claro, hermano visual del botón `primary` (que es `accent.solid` + `on-solid`).

El primer impulso —reutilizar `state.danger.*`— **choca de frente con ADR-014**:
obligaría a dar a `danger` un `solid`/`on-solid`, es decir, a convertir un estado
en superficie de acción. Eso es exactamente lo que el raíl prohíbe.

## Decisión

**Acción ≠ estado.** Se introduce un rol semántico **nuevo y ortogonal**,
`color.destructive.*`, hermano de `accent` (superficie de acción), **no** de
`state.*` (severidad de contenido):

| Token | light | dark |
|---|---|---|
| `destructive.solid` | `{color.red.600}` | `{color.red.400}` |
| `destructive.solid-hover` | `{color.red.700}` | `{color.red.300}` |
| `destructive.on-solid` | `{color.neutral.0}` | `{color.red.900}` |
| `destructive.ring` | `{color.red.600}` | `{color.red.400}` |

Espeja el patrón `accent.*` (en dark, fondo más claro + texto oscuro; el dark
vive en la capa 2, §5.2). El nombre **`destructive`** (no `danger`) marca la
diferencia en el propio identificador: es una **acción**, no un estado.

**Por qué esto NO afloja el raíl de ADR-014:**

- El raíl de ADR-014 es "un **estado** no puede volverse sólido de acción". Sigue
  intacto: `state.danger.*` no gana `solid`/`on-solid`; `destructive` es un rol
  aparte. `state.danger` (tinte para alertas) y `destructive` (acción) coexisten
  sin solaparse.
- La regla se refuerza, no se relaja: ahora hay **dos** superficies de acción con
  `solid`/`on-solid` —`accent` (primaria) y `destructive`— y **cero** estados con
  ellas. El test de `tokens.spec.ts` que afirmaba "solo el acento es superficie
  interactiva" se actualiza a "**solo roles de acción** (accent, destructive)
  tienen `solid`/`on-solid`; **ningún** estado los tiene".

### Alcance: solo la acción HABILITADA

`destructive` cubre los estados **habilitados** (default, hover) y **nada más**.
Deliberadamente **no** añade tokens de `disabled` ni de `loading`, igual que
`accent` tampoco los tiene:

- **`disabled` es agnóstico de variante.** Todas las variantes del botón
  (primary/secondary/ghost/danger) comparten **un único** aspecto deshabilitado,
  mapeado a neutros apagados (`text.muted` sobre `surface.sunken`). Un botón
  deshabilitado no comunica ya su rol (no hay acción posible), así que sembrar un
  `destructive.disabled` sería un token que nadie usa (lo cazaría
  `tokens-declared-in-contract`). Contraste verificado igualmente: **6.24:1
  (light) / 5.65:1 (dark)** — legible en ambos temas (se descartó `text.subtle`,
  que da 3.89/3.27).
- **`loading` es comportamiento, no color.** El botón destructivo conserva su
  fondo `solid` durante la carga (con `aria-busy`, foco retenido); el spinner usa
  `destructive.on-solid` como indicador sobre `destructive.solid` — es el mismo
  par de texto ya validado (**5.63:1 / 7.62:1**). No hace falta token propio.

### Verificación de contraste (misma fórmula WCAG que el gate `contrast`)

Ningún valor se propuso sin cruzar el umbral antes (como en ADR-014). Todos los
pares con significado pasan en **light Y dark**:

| Par | light | dark | umbral |
|---|---|---|---|
| `on-solid` / `solid` (texto) | 5.63:1 | 7.62:1 | ≥ 4.5:1 |
| `on-solid` / `solid-hover` (texto, hover) | 7.38:1 | 8.63:1 | ≥ 4.5:1 |
| `ring` / `surface.canvas` (UI) | 5.63:1 | 8.12:1 | ≥ 3:1 |

Se descartó `red.500` a propósito: blanco sobre `red.500` da **3.77:1**, por
debajo de 4.5:1. `red.600` es el tono más claro que pasa en light.

## Consecuencias

- La capa 2 gana un rol de acción (`destructive`); la capa 1 no cambia (reusa la
  rampa `red` ya existente).
- El gate `contrast` y `tokens.spec.ts` incorporan los pares de `destructive`
  (light y dark), **sin tocar** el canario de fixtures `good/`↔`bad/` (las dos
  direcciones de §13/ADR-013 siguen vivas: `bad/` sigue fallando).
- El raíl de estado de ADR-014 queda **reforzado**, no debilitado: se generaliza
  de "solo accent" a "solo roles de acción; ningún estado".
- Desbloquea la variante `danger` del contrato del Button (Fase 3), que mapea sus
  `--aegis-btn-*` a `--aegis-color-destructive-*`.
- `disabled` y `loading` **no** introducen tokens de rol: son tratamiento
  compartido / comportamiento (documentado arriba, contraste verificado).
