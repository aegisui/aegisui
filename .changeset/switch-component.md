---
'@aegisui/cdk': minor
'@aegisui/ui': minor
---

Tercer componente end-to-end del set mínimo (Fase 4): **Switch**.

- `@aegisui/cdk`: `AegisSwitch`, brain headless sobre `button[aegisSwitch]` —
  un `<button type="button" role="switch">` NATIVO, no un `<input
  type="checkbox">` disfrazado ni un `<div>` con `tabindex`. `aria-checked`
  siempre explícito (`"true"`/`"false"`, nunca ausente: lo exige
  `role="switch"`), `toggle()` con guarda de `disabled`, id auto-generado y
  `focus()`. **No intercepta `keydown`**: `Enter` y `Space` llegan por el
  `click` que el navegador ya sintetiza para un `<button>`.
- `@aegisui/ui`: `<aegis-switch>`, piel estilada. Igual que el Input, el
  componente **posee** la relación `<label for>`/`id`. El texto de la etiqueta
  no incluye el estado (lo aporta `aria-checked`; meterlo en el nombre lo
  anunciaría dos veces y rompería 2.5.3).
- **Sin región live, y es la decisión correcta (ADR-019):** `aria-checked` es
  un cambio de estado ARIA sobre un control enfocado, que los lectores anuncian
  nativamente. Añadir `aria-live` encima sería la Regla 3 (doble anuncio en
  NVDA/JAWS). Un test verifica que no exista ningún `aria-live`/`role="alert"`/
  `role="status"` en el DOM, para que nadie añada uno "por si acaso". A
  diferencia del Button y del Input, **este componente no requiere pase manual
  con lector**: su anuncio es el nativo del rol, no un patrón nuestro.
- Tokens de capa 3 `--aegis-switch-*` (dos rieles, ADR-016), mapeados a
  `accent.*` — es una superficie de ACCIÓN, nunca `state.*` (ADR-014) ni
  `destructive.*` (ADR-015).
- **El pulgar es bicolor y la pista apagada lleva borde obligatorio**, y las dos
  cosas salieron de verificar contraste, no de estilo: un pulgar blanco sobre la
  pista apagada da 1.16:1 (claro) / 1.25:1 (oscuro) y falla 1.4.11; el relleno
  de la pista apagada da 1.16:1 contra el lienzo, así que su señal de límite es
  el borde. Verificado en Chromium en light y dark: pulgar vs pista y límite de
  pista ≥ 3:1, etiqueta ≥ 4.5:1, target-size ≥ 24×24 en los tres tamaños
  (medido sobre el `<button>`, no sobre la pista, que en `sm` es menor).
