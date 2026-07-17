# ADR-019: Anuncio de estado dinámico — `describedby` estable + `alert` separado + mutación in situ + congelado con foco

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

**Tercer pase manual — el `childList` no era la única causa.** Con las reglas
1-3 aplicadas, NVDA seguía duplicando el caso frágil. Antes de tocar más
código, diagnóstico con evidencia (no de oído):

1. `MutationObserver` con `attributeFilter: ['aria-describedby']` sobre el
   `<input>`: el valor del atributo **no cambiaba** al aparecer el error (era
   `"aegis-input-N-error"` antes y después, idéntico) — la regla 1 ya lo
   garantizaba. Pero el **nodo al que ese id apunta** sí mutaba su texto
   (`characterData`) en el mismo instante, con el campo enfocado.
2. **Prueba diagnóstica**: se sacó temporalmente el id del error de
   `aria-describedby` (dejando solo la región `alert`) y se reescuchó. **El
   doble anuncio desapareció.**

Conclusión: NVDA relee la descripción del elemento **enfocado** cuando el
nodo que ella referencia cambia de texto — un tercer canal, distinto de la
recreación de nodo (regla 3) y del "un nodo, dos papeles" original (regla 1).
Ni el valor del atributo `aria-describedby` ni el `role="alert"` tienen que
ver: basta con que el contenido descrito de un elemento ya enfocado cambie.

**El caso límite que casi rompe la solución obvia.** "No tocar el nodo de
`describedby` mientras hay foco" es la respuesta directa — pero si el error
cambia de texto **varias veces sin que el foco salga nunca** (validación en
vivo que corrige su propio mensaje: "Email inválido" → "Ya está registrado"),
congelar sin más deja el nodo con el **primer** valor visto en esa sesión de
foco, no el último. Al reenfocar después, se leería un mensaje obsoleto —
peor que el doble anuncio: información incorrecta, no repetida.

Resuelto con un signal de foco real en el brain (`AegisInput.focused`,
`(focus)`/`(blur)` nativos — territorio de foco, cdk, no `ui`) y, en `ui`, un
`effect()` que solo *comete* el texto en vivo al signal de `describedby`
cuando `!focused()`. Mientras hay foco, el signal de `describedby` no se
toca pase lo que pase con el texto en vivo; en cuanto se pierde el foco (o si
nunca lo hubo), se pone al día con el valor **más reciente** en ese momento —
nunca uno intermedio, porque el `effect()` lee el valor actual, no el primero
que vio.

Verificado con `MutationObserver` en Chromium real (no jsdom, no simulado):
foco real vía teclado, error cambia dos veces con el campo enfocado — el
nodo de `describedby` no muta ninguna de las dos veces (queda `""`); al
perder el foco, muta UNA vez, al **último** valor ("Ya está registrado.", no
"Email inválido."). La región `alert` mutó las dos veces, en vivo, como debía.

## Decisión

**Todo anuncio de estado dinámico (validación, progreso, cualquier cosa que
aparezca con el control ya enfocado) sigue CUATRO reglas:**

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
4. **El nodo de descripción no muta mientras el elemento tiene foco.**
   Aunque las reglas 1-3 se cumplan, NVDA relee la descripción de un elemento
   ENFOCADO si el nodo que ella referencia cambia de texto — un canal más,
   independiente de `role="alert"` y de si la relación `describedby` cambió.
   El nodo de anuncio (regla 2) sigue reflejando el valor en vivo siempre; el
   de descripción (regla 1) solo se actualiza a partir de ese valor en vivo
   cuando el elemento **no** tiene foco — y toma el valor **más reciente** en
   ese momento, nunca uno intermedio de los vistos mientras estuvo enfocado.
   Requiere que el componente conozca su propio estado de foco real
   (`focused`, expuesto por el brain — territorio de foco, cdk, no `ui`).

Aplicado al Input (`packages/ui/src/lib/input/input.component.ts`):

```html
<span class="aegis-input__error" [id]="errorId()">{{ describedErrorText() }}</span>
<span class="aegis-input__error-live" role="alert">{{ errorText() }}</span>
```

```ts
// cdk: AegisInput expone el foco real (regla 4).
readonly focused = signal(false);
// host: { '(focus)': 'focused.set(true)', '(blur)': 'focused.set(false)' }

// ui: valor en vivo (región alert, regla 2) vs. valor "comprometido"
// (región describedby, reglas 1 y 4).
protected readonly errorText = computed(() =>
  this.invalid() && this.errorMessage() ? this.errorMessage()! : '',
);
protected readonly describedErrorText = signal('');
private readonly syncDescribedErrorText = effect(() => {
  const current = this.errorText();
  if (!this.brain().focused()) {
    this.describedErrorText.set(current);
  }
});
```

`errorId()` pasa de condicional a **siempre definido**
(`${resolvedId()}-error`). El brain (`AegisInput`, `@aegisui/cdk`) no cambia
su composición de `aria-describedby` (ya filtraba solo ids truthy) — solo
gana el signal `focused`.

Aplicado al Button (`packages/ui/src/lib/button/button.component.ts`), por
ahora solo regla 3:

```html
<span class="aegis-btn__sr" [id]="srId" aria-live="polite"
  >{{ brain.busy() ? loadingLabel() : '' }}</span
>
```

**Corrección sobre este mismo ADR:** una versión anterior de este documento
afirmaba que el Button ya cumplía las reglas 1 y 2. Es falso — revisado el
código: `srId` es **un único nodo** que es a la vez el objetivo de
`aria-describedby` (`[attr.aria-describedby]="srId"` en el `<button>`) y la
región `aria-live="polite"`. Es exactamente el patrón "un nodo, dos papeles"
que causó el bug original del Input (regla 1), solo que aquí la relación
`describedby` sí es estable desde el principio (no se crea en caliente), así
que la manifestación sería distinta — pero el riesgo de doble anuncio con el
botón ya enfocado (regla 4) no está descartado, solo sin probar. **Pendiente**
de decidir si el Button necesita el mismo split en dos nodos + `focused`
antes de dar el pase manual de Button por bueno — no se ha tocado su
estructura de nodos en este ADR, solo la regla 3 (interpolación plana).

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
  CUATRO reglas juntas, no menos. El siguiente componente enfocable debe
  **encontrar** este ADR y el raíl automático, no volver a descubrirlo con un
  lector de pantalla — incluida la regla 4, la más fácil de pasar por alto
  porque solo se manifiesta cuando el estado cambia **varias veces** con el
  foco dentro.
- Coste: un `<span>` oculto más por instancia (casi siempre vacío) y un
  `effect()` en `ui` con su signal de foco en el brain. Barato, pero regla 4
  es la más fácil de olvidar copiando el patrón sin leer el porqué.
- El contrato del Input se actualiza: "`invalid=true` sin `errorMessage`: …
  sin entrada nueva en `aria-describedby`" pasa a "hay una entrada estable en
  `aria-describedby`, vacía cuando no hay error, congelada mientras el campo
  tiene foco" (mismo patrón `srId`, más la regla 4).
- El Button queda corregido de la regla 3 en el mismo cambio (no como una
  tarea aparte). **No** queda corregido de las reglas 1/2/4: su `srId` sigue
  siendo un único nodo con doble papel (`aria-describedby` + `aria-live`), el
  mismo patrón que causó el bug original del Input. No se ha tocado su
  estructura de nodos — es una decisión pendiente, a tomar cuando se haga el
  pase manual de Button sobre este escenario concreto (estado que cambia con
  el botón ya enfocado), no antes.
- El agujero de **proceso**, no solo de código: el pase manual original del
  Button (Fase 3) certificó el patrón con un solo lector/navegador
  (VoiceOver+Safari) y ese resultado se tomó como "el patrón está bien" sin
  acotar el alcance de esa afirmación. La lección no es "probar más
  combinaciones a ciegas" — es que **un pase manual limitado a un lector no
  certifica el patrón en general**, solo lo verificado. El raíl automático de
  esta ADR reduce cuánto depende esa certificación de la suerte de qué lector
  se probó primero, para este tipo concreto de defecto.
- Sigue habiendo un límite honesto: `axe` y el raíl automático no evalúan si
  un lector de pantalla anuncia una vez, dos, o de forma coherente entre sí,
  ni si el texto reanunciado está actualizado. La verificación **manual**
  sigue siendo obligatoria antes de release (SPEC §8.4/§8.5) para todo
  componente con anuncio dinámico — este ADR no la sustituye, documenta el
  patrón que la hace pasar y cachea automáticamente una clase de regresión
  conocida (regla 3) sobre ese patrón. Las reglas 1, 2 y 4 no tienen (todavía)
  raíl automático — dependen enteramente del pase manual.
