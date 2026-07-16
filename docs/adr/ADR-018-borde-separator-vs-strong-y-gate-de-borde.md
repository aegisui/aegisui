# ADR-018: `border.separator` (decorativo) vs `border.strong` (funcional, ≥3:1); el gate `contrast` empieza a verificar bordes

## Contexto

Al escribir el contrato del Input (Fase 4) hizo falta fijar el color del borde
por defecto de un control de formulario — su única señal de límite (WCAG
1.4.11: 3:1 mínimo para UI no textual). Verificando los tokens semánticos
existentes:

| Token (antes) | light vs canvas | light vs raised | dark vs canvas | dark vs raised |
|---|---|---|---|---|
| `color.border.default` (neutral.200/800) | 1.37:1 | 1.29:1 | 1.25:1 | 1.12:1 |
| `color.border.strong` (neutral.300/700) | 1.82:1 | 1.70:1 | 1.76:1 | 1.58:1 |

**Ninguno de los dos llega a 3:1, en ningún tema, contra ninguna superficie.**
El Button ya en `main` (Fase 3) usa `border.strong` para el borde de su
variante `secondary` — ese borde ya incumplía 1.4.11 en producción.

El gate `contrast` (`scripts/gates/contrast.mjs`) no lo había cazado porque
`semanticPairs()` nunca incluía ningún par de borde neutro: solo verificaba
`accent.border`, `accent.ring` y `destructive.ring` (que sí pasan). El gate
solo protege lo que se le enseña a mirar, y este par no se lo habíamos
enseñado. El agente que descubrió el hueco propuso inicialmente reusar
`--aegis-color-text-muted` como color de borde para no tocar tokens — se
descartó: mezclar el rol de texto con el de borde es semánticamente corrupto
(el día que se ajuste `text.muted` por razones tipográficas, se rompería un
borde sin relación alguna). La causa raíz son los **tokens**, no la falta de un
truco de reutilización.

## Decisión

### 1. Dos roles de borde, no uno

`color.border.default` se **renombra** a `color.border.separator`
(decorativo: divisores, contorno de tarjetas, el track de un spinner detrás
del indicador — nunca la única señal de límite de un control interactivo; no
exige 3:1). `color.border.strong` **conserva su nombre** pero cambia de
valores: pasa a ser el borde **funcional** (input, botón `secondary`) que sí
exige 3:1, en las tres superficies donde puede aparecer.

```diff
  "border": {
-   "default": { "light": "{color.neutral.200}", "dark": "{color.neutral.800}" },
-   "strong":  { "light": "{color.neutral.300}", "dark": "{color.neutral.700}" }
+   "separator": { "light": "{color.neutral.200}", "dark": "{color.neutral.800}" },
+   "strong":    { "light": "{color.neutral.500}", "dark": "{color.neutral.400}" }
  }
```

Verificado (mismo script que el gate, `contrastRatio` de `scripts/gates/lib/util.mjs`):

| `border.strong` (nuevo) | vs `surface.canvas` | vs `surface.raised` | vs `surface.sunken` |
|---|---|---|---|
| light (neutral.500, `#6a7a73`) | 4.52:1 | 4.24:1 | 3.89:1 |
| dark (neutral.400, `#93a49d`) | 7.09:1 | 6.35:1 | 5.65:1 |

Todos ≥ 3:1, con margen — no un valor límite.

### 2. El gate `contrast` empieza a verificar bordes, en sus dos objetivos

- **Capa semántica** (`realPackagesViolations()` / `tokens.spec.ts`): añade
  `border.strong` contra `surface.{canvas,raised,sunken}` a `semanticPairs()`,
  umbral `AA_UI = 3`. `border.separator` **no** se verifica — es decorativo por
  diseño, no una señal de límite.
- **Fixtures DOM** (`inspectTheme()`, objetivo 1, ADR-013): antes solo miraba
  `color`/`background`. Ahora también compara `border-color` contra el fondo
  del propio elemento cuando existe. Los 4 fixtures renderizados
  (`good`/`bad` × `light`/`dark`) ganan un `border-color`: `good` pasa 3:1
  (`#767676`/`#8a9099`, ~4.5–5.9:1), `bad` falla (`#d0d0d0`/`#232427`,
  ~1.2–1.5:1) — anti-verde-falso en las dos direcciones, como todo lo demás.
  Los snapshots de `visual` (`__snapshots__/visual.good.*.snap`) se
  actualizaron para incluir el nuevo `border-color` de `good/`.

### 3. Se corrige el Button ya mergeado, en el mismo PR

- `.aegis-btn--secondary` y `.aegis-btn--ghost`: su `--aegis-btn-spinner-track-color`
  pasa de `--aegis-color-border-default` a `--aegis-color-border-separator`
  (mismo uso decorativo, solo renombrado).
- `.aegis-btn:disabled`: su `--aegis-btn-border-color` pasa igual, de `border-default`
  a `border-separator` (un control deshabilitado está exento de 1.4.3/1.4.11,
  pero el uso sigue siendo decorativo, no funcional).
- `.aegis-btn--secondary` (estado no deshabilitado): su
  `--aegis-btn-border-color` **sigue** apuntando a `--aegis-color-border-strong`
  (mismo nombre) — ahora con los valores corregidos, sin cambiar el CSS del
  componente. El contrato del Button (`docs/contracts/button.md`) documenta la
  corrección junto a su tabla de contraste.

## Consecuencias

- **Patrón para todos los componentes futuros:** un borde que es la única
  señal de límite de un control interactivo se define sobre `border.strong`
  (o un rol de color con su propio contraste garantizado, como `accent.border`
  / `destructive.ring`); un borde puramente decorativo, sobre `border.separator`.
  Nunca al revés, y nunca reusando un token de otro rol (texto, superficie) por
  conveniencia numérica.
- El contrato del Input (Fase 4) puede fijar su borde por defecto sobre
  `--aegis-color-border-strong` con la certeza de que pasa 1.4.11, verificado
  automáticamente en CI (capa semántica) y por el canario de fixtures (DOM).
- El gate `contrast` ya no tiene un punto ciego en bordes neutros: si un futuro
  cambio de paleta (ADR-014) rompe `border.strong`, el gate lo cazará antes de
  mergear.
- Cualquier consumidor que hubiera copiado el CSS del Button vía el CLI
  copia-fuente (ADR-003) y referenciara `--aegis-color-border-default`
  directamente pierde esa variable al actualizar `packages/tokens` — el nombre
  correcto ahora es `--aegis-color-border-separator`. Documentado en cambios de
  la versión (changeset).
