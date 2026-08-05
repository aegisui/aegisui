---
'@aegisui/ui': minor
---

Añade `<aegis-select>`: elegir una opción de una lista cerrada.

Es **configuración fina** sobre `AegisOverlay` y `AegisListbox`, no lógica nueva:
el foco virtual, el teclado de la lista, el cap de 100 resultados y el
posicionamiento viven en `@aegisui/cdk`. La piel solo decide cuándo abrir y
cerrar — y pesa **0.70 kB** de los 15.43 que mide su marginal; el resto son los
primitivos y Floating UI.

El foco DOM se queda en el disparador y la opción activa viaja por
`aria-activedescendant`. El disparador es un `<button>` propio y no reutiliza
`<aegis-button>`: un disparador de select se lee como campo de formulario, no
como CTA.

`Space` selecciona porque el listbox va con `editable=false` — explícito, nunca
inferido del estado de `typeahead`.
