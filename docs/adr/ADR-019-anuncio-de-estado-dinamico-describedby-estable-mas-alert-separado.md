# ADR-019: Anuncio de estado dinámico — dos reglas por naturaleza del mensaje

## Contexto

Los controles de formulario necesitan comunicar mensajes que pueden aparecer o
cambiar mientras el control tiene foco: el error de un Input, el "Cargando…" de
un Button. El criterio (SPEC §8.5): visible al aparecer, UNA lectura, reanuncio
actualizado al reenfocar. Ni axe ni ningún gate automático lo detectan; solo se
confirma con pase manual real.

## Decisión — dos reglas acotadas por la naturaleza del mensaje

La naturaleza del mensaje determina el canal. **Nunca los dos a la vez sobre el
mismo contenido**: esa es la causa invariable del doble anuncio.

---

### Regla 1 — Descripción persistente asociada a un control

*Ejemplos: error de validación, texto de ayuda.*

→ **SOLO `aria-describedby` + `aria-invalid`. Sin región live.**

Un `<span>` con `id` estable, siempre presente en `aria-describedby` (vacío
cuando no hay mensaje). Texto en interpolación plana (muta in situ). Sin
`aria-live`, sin `role="alert"`, sin `role="status"`.

**Por qué:** NVDA y JAWS reannuncian **nativamente** la descripción de un control
enfocado cuando su texto cambia — se comportan como región live sin que se
declare. Añadir `aria-live`/`role="alert"` encima:

- duplica el anuncio en NVDA/JAWS (una vez por live, otra por relectura nativa), y
- rompe la relación `aria-describedby` en VoiceOver (deja de exponer la descripción
  al enfocar/reenfocar).

**Componente:** `<aegis-input>` — `<span class="aegis-input__error">`, `errorId()`
estable, `aria-invalid` desde el brain.

---

### Regla 2 — Notificación transitoria de estado

*Ejemplos: carga de un botón, Toast espontáneo.*

→ **SOLO `aria-live`. Sin `aria-describedby` sobre el mismo nodo.**

Un `<span>` hermano con `aria-live="polite"` (o la política adecuada). Texto en
interpolación plana (muta in situ). El control **no** apunta a ese span con
`aria-describedby`.

**Por qué:** VoiceOver **no** reanuncía `aria-describedby` cuando el nodo descrito
cambia mientras el control está enfocado — solo lo lee al enfocar. `aria-live` es
el único canal que VoiceOver honra para notificaciones live. Si el span estuviera
también en `aria-describedby`, NVDA lo anunciaría dos veces (live + relectura
nativa de la descripción).

**Componente:** `<aegis-button>` — `<span class="aegis-btn__sr" aria-live="polite">`,
`srId` estable. El `<button>` no tiene `aria-describedby`. El `<span>` es hermano,
no anidado: una descripción anidada en un control nombre-por-contenido se computa
como parte del nombre accesible, no como descripción independiente.

---

### Regla 3 — Nunca dos canales sobre el mismo contenido

La causa invariable del doble anuncio: activar `aria-live` y tener `aria-describedby`
apuntando al mismo nodo, con el control enfocado. NVDA anuncia por ambos canales.
Elegir uno exclusivamente (según la naturaleza del mensaje) elimina el doble.

---

### Regla 4 — Interpolación plana, nunca `@if` alrededor del texto

`@if` es estructural: recrea el nodo de texto (`childList`). Una región `aria-live`
que recrea su nodo dispara el anuncio por la inserción Y por la mutación de texto
siguiente — dos disparos de la misma fuente. Interpolación plana
(`{{ expresión }}`) muta el nodo de texto existente (`characterData`) — un
solo disparo.

Esta regla aplica a ambas reglas: al span de `aria-describedby` y al span de
`aria-live`.

**Raíl automático (ADR-019 Regla 4):** el spec del Button verifica con
`MutationObserver` que la transición `loading=false→true` produce solo mutaciones
`characterData`, sin ninguna `childList`. Si alguien reintroduce `@if`, el test
falla. Cuando llegue el Toast (la próxima región live legítima), el mismo raíl
debe copiarse ahí.

---

## Aplicación en la librería

| Componente | Canal | Elemento | Notas |
|---|---|---|---|
| `<aegis-input>` | `aria-describedby` | `aegis-input__error`, `errorId()` | Visible; siempre en DOM; vacío si no hay error |
| `<aegis-button>` | `aria-live="polite"` | `aegis-btn__sr`, `srId` | Oculto visualmente; hermano del `<button>`; sin describedby en el botón |
| Toast (futuro) | `aria-live` | A definir | Notificación espontánea sin control asociado |

---

## Limitaciones conocidas por lector de pantalla

### VoiceOver — Input, cambio sucesivo del mensaje con foco dentro (opción 4)

VoiceOver anuncia el **primer** mensaje cuando `aria-invalid` cambia de `null` a
`"true"` (transición de estado que dispara re-lectura del campo). Cambios
posteriores del texto del error **sin nueva transición de `aria-invalid`** no se
anuncian en directo. Al reenfocar, VoiceOver puede leer el primer valor cacheado
en lugar del actual.

Sin solución limpia: cualquier mecanismo para forzar a VoiceOver a re-leer
(aria-live, cambio de `aria-describedby` en caliente) reactiva el doble anuncio
en NVDA. El mensaje correcto se lee al reenfocar. NVDA anuncia todos los cambios
correctamente. Documentado en el contrato del Input.

### NVDA — Button: "no disponible" + "procesando" durante la carga

`aria-disabled="true"` → NVDA anuncia "no disponible"; `aria-busy="true"` → NVDA
anuncia "procesando". Son el comportamiento estándar de NVDA con esos atributos en
un botón enfocado, no un defecto de la librería. El usuario recibe información
correcta: el botón está ocupado y temporalmente no disponible.

---

## El camino recorrido (para que nadie lo reabra)

Se llegó aquí tras cuatro intentos fallidos con región live para el Input y un
retroceso posterior en el Button (que extrapoló la Regla 1 donde correspondía la
Regla 2). La lección central: **las naturalezas son distintas; la regla no es
una sola**.

### Input — cuatro intentos fallidos

Todos partían de la premisa falsa de que hacía falta una región live para anunciar
el error con el campo enfocado. Cada uno resolvía el síntoma del anterior y
descubría una causa nueva; ninguno cuestionó la premisa hasta ir a la literatura.

| # | Arquitectura | Resultado (pase manual real) |
|---|---|---|
| 1 | Un nodo: `role="alert"` + `aria-describedby` juntos, condicional | VoiceOver: una vez ✓. **NVDA: dos veces** (alert + relectura de describedby recién creado). |
| 2 | Dos nodos (describedby estable + alert separado), texto con `@if` | **NVDA: dos veces seguidas** — `@if` recrea el nodo de texto (`childList`); una live que recrea su nodo redispara. |
| 3 | Dos nodos + interpolación plana | **NVDA: seguía duplicando.** `aria-describedby` estable pero su nodo mutaba con foco dentro — canal aparte del `role="alert"`. |
| 4 | + `describedby` congelado con foco (signal `focused` en cdk) | Estructura correcta, pero regresión de UX: el mensaje visible no aparecía hasta el blur. Un mensaje ausente-cuando-lo-necesitas es peor que uno duplicado. |

La realización (Solución 5, Regla 1 de este ADR): las cuatro arquitecturas
compartían el error que la literatura señala — una región live que sobra. Quitándola,
`aria-describedby` solo cumple los cuatro criterios a la vez. Cuatro fuentes
independientes convergen: **GOV.UK Design System**, **Adrian Roselli**
("Exposing Field Errors"), **David MacDonald** (test de la combinación aria-live +
describedby) y **React Aria (Adobe)** — todas usan solo `aria-describedby` para el
error, sin región live.

### Button — la extrapolación errónea

La Solución 5 del Input se aplicó al Button con la premisa de que "describedby-solo
basta para todo". El pase manual reveló que es falsa para notificaciones transitorias:
VoiceOver no reanuncía `aria-describedby` en caliente, así que eliminar `aria-live`
del Button silenció VoiceOver para el estado de carga.

El `aria-live` del Button era correcto desde el principio. El problema original
(doble anuncio en NVDA) no venía del `aria-live` sino del `@if` que recreaba el
nodo de texto (Regla 4, intento 2 del Input). Corregido `@if` → interpolación
plana (Regla 4), `aria-live` puede convivir con un span sin `aria-describedby`
sin producir ningún doble.

### El raíl `expectLiveRegionMutatesInPlace`, retirado y reinstaurado

Un helper de test cazaba la regresión del intento 2 (`childList` en una región
live). Se eliminó cuando se creyó que la librería no tendría más live regions.
Reinstaurado directamente en el spec del Button (que ahora sí tiene `aria-live`)
como verificación de Regla 4. Se moverá a un helper compartido cuando el Toast
sume un segundo consumidor.

### Lección de proceso

Un pase manual limitado a un lector no certifica el patrón — solo lo verificado
en ese lector. Cuando cuatro intentos seguidos fallan, parar y buscar cómo lo
resuelve el estándar de facto es la respuesta correcta, no un quinto intento a
ciegas.
