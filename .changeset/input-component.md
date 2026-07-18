---
'@aegisui/cdk': minor
'@aegisui/ui': minor
---

Segundo componente end-to-end del set mínimo (Fase 4): **Input**.

- `@aegisui/cdk`: `AegisInput`, brain headless sobre `input[aegisInput]` — id
  auto-generado, composición de `aria-describedby` (ayuda + error, sin
  entradas vacías), reflejo de `aria-invalid`/`aria-required` (ausentes, no
  `"false"`, cuando no aplican) y `focus()`.
- `@aegisui/ui`: `<aegis-input>`, piel estilada sobre el brain. El componente
  **posee** la relación `<label for>`/`id` — no la delega al consumidor — para
  que sea verificable en CI. Mensaje de error con `role="alert"` además de
  `aria-describedby`, para que se anuncie también con el campo ya enfocado
  (validación en vivo), no solo al enfocarlo por primera vez.
- Tokens de capa 3 `--aegis-input-*` (dos rieles, ADR-016). Estado inválido
  mapea a `state.danger.*` (no `destructive.*`): es un ESTADO, no una ACCIÓN,
  a diferencia del `danger` del Button (ADR-014/015) — primera vez que se
  aplica esta distinción fuera del Button. Placeholder mapea a `text-muted`
  (`text-subtle` se descarta: falla 4.10:1 en dark). WCAG 2.2 AA verificado en
  Chromium (contraste de texto Y de borde, target-size ≥ 24×24, axe) en light
  y dark.
- Confirmado con axe: `aria-invalid` y `disabled` simultáneos no generan
  ninguna violación — el estado lógico se mantiene sin remordimiento.
