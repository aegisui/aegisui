# ADR-019: Errores/estado de un control enfocable — solo `aria-describedby` + `aria-invalid`, sin región live

## Contexto

Los controles de formulario tienen que comunicar a un lector de pantalla un
mensaje asociado que puede aparecer o cambiar **mientras el control ya tiene
foco**: el error de validación de un Input, el "Cargando…" de un Button. El
punto frágil (SPEC §8.5) es que ese mensaje se anuncie **una sola vez** al
aparecer, **con el texto actualizado**, y siga estando disponible al reenfocar
— sin duplicados, sin silencios. Ni axe ni ningún gate automático lo detectan;
solo se confirma con un pase manual real.

## Decisión

**Un mensaje asociado a UN control enfocable (error de campo, estado del
control) se comunica SOLO con `aria-describedby` + `aria-invalid`. Sin
`aria-live`, sin `role="alert"`, sin `role="status"`.**

Concretamente:

- Un **único `<span>`**, enlazado por `aria-describedby` desde el control, con
  su `id` **siempre presente** en `aria-describedby` (vacío cuando no hay
  mensaje). La relación no se crea ni se destruye en caliente; solo cambia el
  texto del span, mutándolo in situ (interpolación plana, no `@if` que recrea
  el nodo).
- El control refleja `aria-invalid="true"` cuando corresponde (Input) o
  `aria-busy` (Button).
- El `<span>` es **hermano** del control, no anidado dentro: una descripción
  anidada en un control con nombre-por-contenido (button/link) se computa como
  parte del *nombre* accesible, no como descripción independiente.

**Por qué no una región live.** NVDA y JAWS reannuncian **nativamente** la
descripción de un control enfocado cuando su texto cambia — se comportan como
si fuera una región live, sin que se declare. Añadir `aria-live`/`role="alert"`
encima:

- **duplica** el anuncio en NVDA y JAWS (una vez por la región live, otra por
  la relectura nativa de la descripción), y
- **rompe** la relación `aria-describedby` en VoiceOver (deja de exponer la
  descripción al enfocar/reenfocar).

Cuatro fuentes independientes convergen en la misma conclusión:

- **GOV.UK Design System** — su componente de error usa solo `aria-describedby`
  + `aria-invalid`; ni `aria-live` ni `role`.
- **Adrian Roselli**, "Exposing Field Errors" (testing extensivo): `aria-describedby`
  sin región live es lo más consistente; se anuncia al enfocar/reenfocar, y
  añadir `aria-live` recorta o pierde el nombre del siguiente campo enfocado.
- **David MacDonald**, test dedicado a esta combinación: con `aria-live` en el
  error, NVDA/JAWS lo leen dos veces al salir del campo; "funcionan
  perfectamente solo con `aria-describedby`". Con `aria-live` presente,
  VoiceOver deja de respetar el `aria-describedby`.
- **React Aria (Adobe)** usa `aria-describedby` para el error, no una región
  live separada.

### Toast / notificación espontánea es OTRO caso — SÍ necesita región live

Esta decisión aplica **solo** a un mensaje asociado a un control enfocable vía
`aria-describedby`. Una notificación que **no** está asociada a ningún control
y aparece de forma espontánea (un Toast, una alerta global) **no** tiene un
elemento enfocado cuya descripción releer — ahí una región live
(`aria-live`/`role="status"`/`role="alert"`) es la herramienta correcta y
necesaria. **No matar el `aria-live` de un Toast citando este ADR.** La regla
de arriba distingue por el vínculo con el foco, no por "las regiones live son
malas".

### Aplicación

- **Input** (`packages/ui/src/lib/input/input.component.ts`): un `<span
  class="aegis-input__error" [id]="errorId()">{{ errorText() }}</span>` visible,
  siempre presente, en `aria-describedby`; `aria-invalid` desde el brain. Sin
  nodo oculto, sin `role`, sin `aria-live`.
- **Button** (`packages/ui/src/lib/button/button.component.ts`): el `<span
  class="aegis-btn__sr" [id]="srId">` (visualmente oculto, el spinner es la
  señal visual) en `aria-describedby`; `aria-busy` desde el brain. Se le
  **quitó** el `aria-live="polite"` que tenía.

En ambos, `errorId`/`srId` son estables desde el primer render y el texto se
interpola plano (muta in situ). El brain (`AegisInput`, `AegisButton`) no
necesita conocer el estado de foco: se eliminó el signal `focused` que una
iteración anterior había añadido.

## El camino recorrido (apéndice, para que nadie reabra esto)

Se llegó aquí tras cuatro intentos fallidos, **todos** partiendo de la premisa
falsa de que hacía falta una región live para anunciar el error con el campo
enfocado. Cada uno resolvía el síntoma del anterior y descubría una causa
nueva; ninguno cuestionó la premisa hasta ir a la literatura.

| # | Arquitectura | Resultado (pase manual real) |
|---|---|---|
| 1 | Un nodo: `role="alert"` + `aria-describedby` juntos, condicional | VoiceOver: una vez ✓. **NVDA: dos veces** (región alert + relectura de la descripción recién creada). |
| 2 | Dos nodos (describedby estable + alert separado), texto con `@if` | **NVDA: dos veces seguidas** — `@if` recrea el nodo de texto (`childList`, no `characterData`); una región live que recrea su nodo redispara. |
| 3 | Dos nodos + interpolación plana (sin `@if`) | **NVDA: seguía duplicando.** El atributo `aria-describedby` no cambiaba, pero el nodo referenciado sí mutaba con el foco dentro — la relectura nativa de la descripción, un canal aparte del `role="alert"`. |
| 4 | + `describedby` congelado mientras hay foco (signal `focused` en cdk) | Estructura correcta, pero **regresión de UX**: el mensaje visible no aparecía hasta el blur — el usuario ve el campo en rojo sin saber qué corregir mientras escribe. Un mensaje ausente-cuando-lo-necesitas es peor que uno duplicado. |

**La realización** (intento 5, este ADR): las cuatro arquitecturas compartían
el error que la literatura señala — una región live que sobra. El propio NVDA
ya reanuncia la descripción de un campo enfocado; toda la maquinaria
(nodo oculto separado, `focused` en el cdk, congelado con `effect`, el raíl
`expectLiveRegionMutatesInPlace`) existía para gestionar una región live que no
debía existir. Quitándola, `aria-describedby` solo cumple los cuatro criterios
a la vez: visible al aparecer, una lectura, reanuncio actualizado al reenfocar,
y VoiceOver correcto.

**Lección de proceso, no solo de código.** El pase manual original del Button
(Fase 3) certificó su patrón con un solo lector (VoiceOver+Safari), donde el
doble anuncio de NVDA no se manifiesta; ese "verde" se tomó como "el patrón
está bien" y sirvió de referencia ("copia el `srId` del Button") para el Input
— cuando en realidad el Button nunca cumplió el patrón. **Un pase manual
limitado a un lector no certifica el patrón, solo lo verificado en ese lector.**
Y: cuando cuatro intentos seguidos fallan, la respuesta correcta es parar y
buscar cómo lo resuelve el estándar de facto, no un quinto intento a ciegas.

### El raíl `expectLiveRegionMutatesInPlace`, retirado

Un helper de test (`packages/ui/src/testing/live-region.ts`) cazaba
automáticamente la regresión del intento 2 (`childList` en una región live). Se
**eliminó**: la Solución 5 no deja ninguna región live en la librería, así que
el helper quedaba sin consumidor, y este repo no mantiene infraestructura de
test sin nada real que verificar (anti-verde-falso, SPEC §13). Cuando llegue el
**Toast** — una región live legítima — el `childList`-vs-`characterData`
volverá a importar y el helper debe reintroducirse entonces, contra ese
componente real.

## Consecuencias

- **Patrón canónico** para todo componente con un mensaje asociado a un control
  enfocable (Input hecho, Button hecho, Switch/Select por venir): solo
  `aria-describedby` + `aria-invalid`/`aria-busy`, nodo estable, texto plano,
  cero región live. El siguiente componente debe encontrar **esta** decisión,
  no las cuatro iteraciones fallidas (por eso viven en el apéndice, no en la
  regla).
- **Toast/notificaciones espontáneas** conservan su región live — caso
  distinto, explícitamente fuera de esta regla.
- Menos maquinaria: se eliminaron el nodo oculto del Input, el signal `focused`
  del brain, el `effect` de congelado, el helper de test y su spec, y el ignore
  de eslint que el helper necesitaba. El código queda más simple que en
  cualquiera de los cuatro intentos.
- **Pendiente**: el pase manual de Input **y** Button sobre la Solución 5
  (NVDA+Firefox y VoiceOver+Safari), los cuatro casos. La estructura está
  verificada con `MutationObserver` en Chromium real; falta el oído. Ningún
  resultado de los pases anteriores se hereda: cada uno era otra arquitectura.
