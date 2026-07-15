# ADR-014: Paleta "Jade & Graphite" y separación jade/estado por ausencia de token

## Contexto

Los tokens primitivos (capa 1) son la identidad visual del producto: una vez
elegidos, tiñen todo. Se descartaron dos alternativas:

- **Cobalt & Slate** (azul frío): es la zona más transitada del mercado dev-tool
  (Material, PrimeNG, Kendo, media comunidad shadcn). Un azul de acento hace que
  Aegis parezca una plantilla desde la primera captura; no hay respuesta a "¿por
  qué este color?".
- **Ink & Ember** (grafito cálido + brasa/óxido): el naranja es el semántico más
  difícil de mantener sobre 4.5:1, y ahí sería el **acento**. En una librería que
  vende accesibilidad, elegir el color más frágil como identidad es regalar
  munición.

## Decisión

La identidad de Aegis UI es **Jade & Graphite**: neutros grafito de subtono cálido
+ un acento **jade** (verde-azulado, teal). Un solo acento (un secundario
multiplicaría los pares a validar sin que ningún componente lo pida todavía).

**Por qué jade, y no es estética:**

1. **Aegis = escudo.** El jade/verde-salvaguarda es la marca hecha color: hay
   respuesta a "¿por qué este color?".
2. **Nadie lidera con teal en dev-tools:** somos reconocibles en una captura.
3. Salvaguarda / calma / confianza es literalmente la propuesta de valor.

### El riesgo y su solución: jade-acento vs. verde-success

El peligro de una identidad verde es confundir el **jade primario** (acción) con
el **verde de éxito** (estado). Se resuelve por dos vías, y la segunda es la que
manda:

- **Por HUE:** jade vive en ~166° (teal), success en ~98° (verde-pasto): **68° de
  separación**, idéntica en light y dark. Entre medias queda el amarillo-verde
  puro (~120°) que ninguno toca. No son dos tonos del mismo verde.
- **Por ROL, garantizado por AUSENCIA de token** (lo estructural, no la
  disciplina): _jade es lo que pulsas, el estado es lo que lees._
  - El **acento** existe como superficie interactiva: `accent.solid`,
    `accent.on-solid` (texto encima), `accent.text`, `accent.ring`…
  - Los **estados** (`success`/`warning`/`danger`/`info`) existen **solo** como
    tinte-de-fondo (`bg`), texto-oscuro (`text`), borde (`border`) e indicador
    puntual (`point`). **No existe un token de estado sólido con texto blanco
    encima** (`solid` / `on-solid`). Si el token no existe, nadie puede usarlo mal:
    un estado nunca puede convertirse en un botón que compita con el jade.

Este raíl se verifica en `packages/tokens/src/tokens.spec.ts`: un test falla si
algún rol de estado gana una clave `solid`/`on-solid`/`on-*`, o si sale del
conjunto `{bg, text, border, point}`.

### Verificación de contraste

Los 42 pares fg/bg de la capa semántica (texto ≥ 4.5:1, UI ≥ 3:1) pasan en light
Y dark, comprobados con la misma fórmula WCAG del gate `contrast`. Ninguna
dirección se propuso sin cruzar el gate antes. El punto de warning en light usa
`amber.600` (no el amarillo brillante) precisamente para no quedarse corto en 3:1.

## Consecuencias

- La capa 1 queda fijada (neutros, jade, y las rampas de estado green/amber/red/
  blue), más las escalas type (1.250) / space (base 4px) / radius (6·10·14) /
  elevation / motion.
- La capa 2 (semánticos) lleva el dark mode (§5.2) como pares `{ light, dark }`.
- La capa 3 (de componente) nace **vacía**: sembrarla sin componentes sería
  inventar tokens que nadie usa (y que `tokens-declared-in-contract` cazaría).
  Aparece con el Button en la Fase 3.
- La familia de fuente por defecto es **pila de sistema** (cero webfonts
  empaquetadas): una librería no impone una fuente al consumidor (peso, CLS). El
  token de familia es configurable.
