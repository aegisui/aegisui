# ADR-019: Anuncio de estado dinámico — `describedby` estable + `alert` separado + mutación in situ

## Contexto

Pase manual con lector de pantalla del Input (Fase 4, contrato §Accesibilidad).
El mensaje de error usaba un único `<span role="alert" [id]="errorId()">`,
enlazado por `aria-describedby` del `<input>` **solo cuando** `invalid() &&
errorMessage()` eran verdaderos (el span, su `id` y la entrada en
`aria-describedby` aparecían y desaparecían juntos).

**Primer pase manual** (los dos casos que el contrato marca como frágiles,
SPEC §8.5 — axe no los detecta, ninguno):

- **VoiceOver + Safari:** el error se anuncia una vez, tanto al enfocar por
  primera vez un campo ya inválido como al aparecer con el campo ya enfocado
  (validación en vivo). Correcto.
- **NVDA + Firefox:** el mismo caso de validación en vivo se anuncia **dos
  veces**: una por la región `alert`, otra al releer la descripción del campo.

Dos causas contribuían, no una:

1. **Un nodo, dos papeles.** El span era simultáneamente región live
   (`role="alert"`) y objetivo de `aria-describedby`. NVDA anuncia por los dos
   canales; VoiceOver los colapsa (comportamiento de implementación, no
   garantía de la spec ARIA).
2. **La relación `describedby` se creaba en caliente.** El `id` del span solo
   existía cuando había error, así que `aria-describedby` **ganaba una
   entrada nueva** en el instante en que aparecía el error — con el campo ya
   enfocado. Disparador de re-anuncio conocido en NVDA, independiente de
   `role="alert"`.

Prueba de que la causa 2 era real: el Button **ya** la evitaba. Su región de
`aria-live` para `loading` está en `aria-describedby` **siempre**
(`[attr.aria-describedby]="srId"`, sin condición) — solo cambia el *texto*.
El Input no había copiado esa parte del patrón.

**Primera corrección — insuficiente.** Se separaron los dos papeles en dos
`<span>` y se hizo estable el `id` de `aria-describedby` (ver Decisión, reglas
1 y 2). Reescuchado: **NVDA empeoró** — anunciaba el caso frágil **dos veces
seguidas e idénticas** (antes eran dos anuncios distintos por dos causas; ahora
era la misma fuente disparando dos veces). Señal de que la corrección había
separado las dos causas originales pero introducido, o dejado sin resolver,
una tercera.

**Diagnóstico con `MutationObserver` sobre DOM real** (no se asumió, se
observó) — contrato: al disparar el error con el campo enfocado, ¿qué
mutaciones ve el nodo `role="alert"`?

```json
{ "type": "childList", "target": "aegis-input__error", "addedNodes": ["#text: Este correo ya está registrado. "] },
{ "type": "childList", "target": "aegis-input__error-live", "addedNodes": ["#text: Este correo ya está registrado. "] },
{ "type": "characterData", "oldValue": "" },
{ "type": "characterData", "oldValue": "" }
```

El texto no mutaba un nodo existente: se **insertaba un nodo de texto nuevo**
(`childList`, no `characterData`) porque la interpolación estaba envuelta en
`@if` dentro del `<span>`. `@if` es una directiva **estructural**: aunque el
`<span>` contenedor sea permanente, su contenido se crea/destruye como vista
embebida en cada transición, no como un cambio de valor. Una región
`role="alert"` que **recrea** su nodo dispara el anuncio por la inserción, y
otra vez por la mutación de texto que sigue — dos disparos de la misma fuente.

Corregido (quitar el `@if`, interpolar el texto directamente —
`{{ errorText() }}`, con `errorText` devolviendo `''` cuando no aplica) y
reverificado con el mismo `MutationObserver`: la región solo produce
`characterData`, cero `childList`.

**El Button tiene el mismo defecto latente**, sin corregir hasta este ADR: su
`.aegis-btn__sr` envuelve el texto en `@if (brain.busy()) { {{ loadingLabel()
}} }` — la misma recreación de nodo. Su pase manual original solo cubrió
VoiceOver+Safari, donde el defecto no se manifestaba (igual que con el Input);
nunca se probó con NVDA en este escenario exacto. **Es un bug de
accesibilidad real en producción**, no una nota aparte: se corrige en el mismo
cambio, con el mismo patrón.

## Decisión

**Todo anuncio de estado dinámico (validación, progreso, cualquier cosa que
aparezca con el control ya enfocado) sigue TRES reglas:**

1. **Nodo de descripción — estable.** El `id` que entra en
   `aria-describedby` existe **siempre**, desde el primer render, tenga o no
   contenido. Vacío cuando no aplica. La relación `describedby` nunca se crea
   ni se destruye con el foco dentro: solo cambia el texto. Sin `role="alert"`
   ni `aria-live` — es descripción bajo demanda, no un anuncio.
2. **Nodo de anuncio — separado, oculto, fuera de `describedby`.** Un segundo
   `<span>`, visualmente oculto (`clip-path: inset(50%)`, no `display:none`,
   para seguir en el árbol de accesibilidad), con `role="alert"` (o
   `aria-live`, no los dos a la vez en el mismo nodo — son redundantes).
   Espeja el mismo texto que el nodo de descripción. Su único trabajo es
   disparar el anuncio cuando el texto cambia.
3. **Mutación del texto SIEMPRE por interpolación plana, nunca por
   `@if`/control de flujo estructural alrededor del contenido.** `@if` recrea
   el nodo (`childList`); una región live que recrea su nodo dispara un
   anuncio doble en NVDA aunque el `<span>` contenedor ya sea permanente
   (reglas 1 y 2 no bastan sin esta). El nodo de anuncio y el de descripción
   deben mostrar/ocultar su texto con una expresión condicional que devuelva
   `''` (`{{ cond() ? texto() : '' }}`), no con `@if` envolviendo la
   interpolación.

Aplicado al Input (`packages/ui/src/lib/input/input.component.ts`):

```html
<span class="aegis-input__error" [id]="errorId()">{{ errorText() }}</span>
<span class="aegis-input__error-live" role="alert">{{ errorText() }}</span>
```

con `errorText = computed(() => invalid() && errorMessage() ? errorMessage()! : '')`.

`errorId()` pasa de condicional a **siempre definido**
(`${resolvedId()}-error`). El brain (`AegisInput`, `@aegisui/cdk`) no cambia:
su composición de `aria-describedby` ya filtraba solo ids truthy.

Aplicado al Button (`packages/ui/src/lib/button/button.component.ts`), regla 3
únicamente (ya cumplía 1 y 2):

```html
<span class="aegis-btn__sr" [id]="srId" aria-live="polite"
  >{{ brain.busy() ? loadingLabel() : '' }}</span
>
```

El span vacío no debe dejar un hueco visual: en el Input, el margen va bajo
`:not(:empty)` en CSS — verificado empíricamente que un nodo de texto con
cadena vacía (`''`) sigue contando como `:empty` para el selector CSS, así que
no hace falta ningún cambio de estilo adicional al quitar el `@if`.

`helpText` del Input **no** cambia — se queda condicional (con `@if`, que
para él es correcto: no tiene región live ni problema de re-anuncio). Sin
región live, la regla 3 no aplica.

### Raíl automático (no sustituye el pase manual)

`packages/ui/src/testing/live-region.ts` exporta
`expectLiveRegionMutatesInPlace(liveRegion, triggerChange)`: arma un
`MutationObserver` sobre el nodo, ejecuta `triggerChange`, y falla si observa
alguna mutación `childList` (nodo recreado) en vez de solo `characterData`
(texto mutado). Cazaría automáticamente la regresión que el pase manual
encontró la primera vez, sin depender de tener el lector de pantalla
correcto a mano.

Es una condición **necesaria, no suficiente**: prueba que la estructura del
patrón es correcta (regla 3), pero no prueba que el anuncio suene bien en
ningún AT real — eso lo sigue exigiendo el pase manual (SPEC §8.4/§8.5). Un
test que pasa aquí y sigue sonando mal en NVDA/VoiceOver sigue siendo un
defecto; este raíl reduce la superficie de un tipo de defecto conocido, no
todos.

Usado en `button.component.spec.ts` (región `.aegis-btn__sr`) y
`input.component.spec.ts` (región `.aegis-input__error-live`).

## Consecuencias

- **Patrón canónico de la librería para cualquier componente enfocable**
  (Switch, Select, Toast futuro, y el resto de la Fase 4 en adelante): las
  tres reglas juntas, no dos. El siguiente componente enfocable debe
  **encontrar** este ADR y el raíl automático, no volver a descubrirlo con un
  lector de pantalla.
- Coste: un `<span>` oculto más por instancia, casi siempre vacío. Barato.
- El contrato del Input se actualiza: "`invalid=true` sin `errorMessage`: …
  sin entrada nueva en `aria-describedby`" pasa a "hay una entrada estable en
  `aria-describedby`, vacía cuando no hay error" (mismo patrón `srId`).
- El Button queda corregido en el mismo cambio (no como una tarea aparte):
  mismo bug, mismo commit, mismo patrón.
- El agujero de **proceso**, no solo de código: el pase manual original del
  Button (Fase 3) certificó el patrón con un solo lector/navegador
  (VoiceOver+Safari) y ese resultado se tomó como "el patrón está bien" sin
  acotar el alcance de esa afirmación. La lección no es "probar más
  combinaciones a ciegas" — es que **un pase manual limitado a un lector no
  certifica el patrón en general**, solo lo verificado. El raíl automático de
  esta ADR reduce cuánto depende esa certificación de la suerte de qué lector
  se probó primero, para este tipo concreto de defecto.
- Sigue habiendo un límite honesto: `axe` y el raíl automático no evalúan si
  un lector de pantalla anuncia una vez, dos, o de forma coherente entre sí.
  La verificación **manual** sigue siendo obligatoria antes de release (SPEC
  §8.4/§8.5) para todo componente con anuncio dinámico — este ADR no la
  sustituye, documenta el patrón que la hace pasar y cachea automáticamente
  una clase de regresión conocida sobre ese patrón.
