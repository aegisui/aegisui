---
'@aegisui/cdk': minor
'@aegisui/ui': minor
---

Primer componente end-to-end: **Button** (Fase 3).

- `@aegisui/cdk`: `AegisButton`, brain headless sobre `button[aegisButton]` —
  estado disabled/loading, ARIA (`aria-busy`/`aria-disabled`) y supresión de la
  activación (ningún `click` mientras disabled/loading), sin interceptar el
  teclado nativo (Enter/Space activan por sí solos).
- `@aegisui/ui`: `<aegis-button>`, piel estilada sobre el brain (ADR-002). API
  signals-only (`variant`/`size`/`disabled`/`loading`/`type`), OnPush, standalone.
  Tokens de capa 3 `--aegis-btn-*` locales al componente, dos rieles (color→capa 2,
  estructura→capa 1; ADR-016), cero literales. WCAG 2.2 AA verificado en Chromium
  (contraste, target-size ≥ 24×24, axe) en light y dark.
