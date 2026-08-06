---
'@aegisui/cdk': patch
---

Corrige el posicionamiento de `AegisOverlay`: `computePosition` se llama ahora con
`strategy: 'fixed'`.

Un elemento con `popover` vive en la capa superior, cuyo bloque contenedor es el
viewport. La estrategia por defecto de Floating UI (`absolute`) devuelve
coordenadas relativas al documento, y aplicadas al `position: fixed` que la capa
superior exige colocaban el panel a la altura que el ancla ocupa en la página
entera — fuera de la pantalla en cualquier página larga.

El síntoma era "el desplegable no se abre": el panel **sí** se abría
(`:popover-open` casaba, tenía caja y opciones dentro) pero quedaba a miles de
píxeles de distancia.
