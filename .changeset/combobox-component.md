---
'@aegisui/ui': minor
'@aegisui/cdk': minor
---

Añade `<aegis-combobox>` y el passthrough `controlAttrs` del Input que lo hace
posible.

**`controlAttrs` (`@aegisui/cdk`, `AegisInput`)** — canal genérico para que un
envoltorio deposite atributos en el `<input>` REAL. El Input **no gana
conocimiento de combobox**: gana la capacidad "un envoltorio puede gobernar mi
control interno". Siete atributos (`id`, `disabled`, `readonly`, `required`,
`aria-required`, `aria-invalid`, `aria-describedby`) quedan **estructuralmente
protegidos**: intentar escribirlos lanza en desarrollo y el valor del Input gana
en producción. `null` retira el atributo.

**`<aegis-combobox>` (`@aegisui/ui`)** — elegir una opción escribiendo para
filtrar. Reutiliza el `<aegis-input>` real como campo: no reimplementa etiqueta,
etiqueta flotante, ayuda, error ni tamaños. El foco DOM se queda en el campo y la
opción activa viaja por `aria-activedescendant`. `Space` escribe un espacio y no
selecciona, porque el listbox va con `editable=true`.

Se soportan los dos `labelMode`, incluido `floating`, con `autocomplete="off"`
por defecto.
