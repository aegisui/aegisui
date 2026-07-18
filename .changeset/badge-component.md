---
'@aegisui/ui': minor
---

Quinto y último componente del set mínimo (Fase 4): **Badge**.

- `<aegis-badge>`, etiqueta corta de estado o categoría. `variant`
  (`neutral`/`accent`/`success`/`warning`/`danger`) y `size` (`sm`/`md`).
  Sin brain en `@aegisui/cdk`, igual que la Card: es texto estilado.
- **Todas las variantes son TINTE + texto oscuro**, jamás sólido saturado con
  texto blanco (ADR-014/015). Un badge es ESTADO, no acción: `danger` mapea a
  `state.danger.*` y **nunca** a `destructive.*` (la acción que borra), y
  `accent` usa el par de tinte, no el par sólido del botón primario. Tres tests
  de raíl verifican el CSS: sin `destructive-*`, sin `accent-solid`/`on-solid`,
  y cada `state.*` limitado a `{bg, text, border, point}`.
- Para `success`/`warning`/`danger` el error ni siquiera era expresable: no
  existe un `state.*.solid` (ADR-014 lo previene por AUSENCIA de token). Es la
  primera confirmación práctica de que ese raíl estructural funciona — al
  escribir el componente, la opción incorrecta no estaba disponible.
- Contraste verificado en Chromium con umbral de **texto** (4.5:1), no de UI
  (3:1): `font-size-xs`/`sm` están por debajo del umbral de "texto grande", así
  que 3:1 habría sido el error fácil. Las 5 variantes pasan en light y dark.
- Borde **decorativo** (ADR-018): los `state.*.border` no llegan a 3:1 y no
  tienen por qué — el Badge no es un control, su señal es el tinte y su
  contenido es el texto.
- **El color no comunica solo** (1.4.1): `variant` es refuerzo redundante. El
  componente no puede impedir el mal uso, así que se documenta como regla en la
  story (ejemplo ❌/✅) y el gate exige que los textos de la galería difieran.
- Uso decorativo documentado: el consumidor oculta el badge con
  `aria-hidden="true"` en el host. Funciona sin ayuda del componente porque no
  hay nada enfocable dentro — no se expone un input `decorative` (sería una
  segunda forma de hacer lo que un atributo estándar ya hace).
