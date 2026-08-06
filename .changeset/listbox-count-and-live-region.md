---
'@aegisui/ui': patch
---

Corrige dos defectos de accesibilidad de `<aegis-select>` y `<aegis-combobox>`
encontrados en el pase manual con NVDA.

**El lector contaba mal los items.** La fila de estado ("Sin resultados.",
"Mostrando los primeros 100 de N") era hija del `role="listbox"`, y un lector
cuenta hijos del listbox, no `role="option"`: anunciaba "1 item" con cero
resultados y "101 items" con cien. Ahora el overlay y el listbox van en elementos
separados, y la fila es **hermana** del listbox — visible donde el usuario mira,
sin contar como opción.

**El vacío y el truncado no se anunciaban.** Ninguna de las dos pieles renderizaba
región `aria-live`: el mensaje solo existía como fila visual. Ahora las dos traen
su región, presente desde el primer render, vacía en reposo y fuera del popover
(dentro saldría del árbol de accesibilidad al cerrarse). La fila visible va con
`aria-hidden` para que un solo canal anuncie (ADR-019 Regla 3).
