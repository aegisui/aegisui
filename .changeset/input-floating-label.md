---
'@aegisui/ui': minor
---

**Etiqueta flotante en el Input**: `labelMode='floating'` con dos estilos,
`labelFloatStyle='inset'` (default) y `'notched'`.

- **Retrocompatible**: `labelMode` es `'stacked'` por defecto y ningún consumidor
  existente cambia de comportamiento. La relación `label`/`input` no varía entre
  modos — el lector de pantalla no percibe ninguna diferencia.
- **Puramente CSS**, sin estado en TS: la etiqueta flota con `:focus-within`,
  `:not(:placeholder-shown)` y `:autofill`/`:-webkit-autofill`. Ese último es el
  bug canónico del patrón (el gestor de contraseñas rellena el campo sin
  disparar eventos y la etiqueta se queda encima del texto) y se resuelve sin
  una línea de JavaScript.
- **El chip del `notched` lleva DOS colores, no uno.** Medido sobre el render
  real: la etiqueta cabalga el borde, mitad sobre el fondo de la página
  (`surface-canvas`) y mitad sobre el relleno del campo (`surface-raised`). Un
  color plano no puede ser invisible sobre dos superficies — de ahí el efecto
  "pegatina" que tenía la primera versión. Son dos **alias de capa 2**, sin
  tintes nuevos, así que no introducen ningún par de contraste que validar. El
  punto de corte es estructural: el 50% del chip cae en la arista exterior del
  borde, con desvío `0` en `sm`, `md` y `lg`.
- **Alto contraste robusto.** El chip pinta un `background-image`, y una imagen
  de fondo se dibuja POR ENCIMA del `background-color`: sin anularla, el
  degradado de marca tapaba el `Canvas` del sistema en pleno `forced-colors`. Con
  `background-image: none` añadido **se pudo retirar `forced-color-adjust: none`**
  — y con él la limitación de WebKit que el contrato documentaba para la
  etiqueta deja de aplicar.
- **La mitad exterior del chip es ajustable de verdad.** El contrato prometía que
  el consumidor puede adaptarla cuando la superficie padre no es el lienzo; la
  promesa era falsa porque el componente redeclaraba el token en un descendiente
  y pisaba el valor heredado del host. Ahora se consume con fallback, sin
  declararlo dentro, y hay test de regresión sobre `surface-raised`.
- **Dos raíles nuevos** en `apps/sandbox/e2e/`: `gate-forced-colors` (el CSS
  responde al contraste forzado) y `gate-notch-alignment` (la costura del chip
  cae en el borde, y el override llega). Ambos con su dirección de fallo
  demostrada, no solo su dirección verde.

Sigue pendiente el pase manual en Windows High Contrast real
(`docs/pase-manual-set-minimo.md` §8): el gate es de regresión y Chromium emula
un juego de colores por defecto, no los temas del sistema operativo.
