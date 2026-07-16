---
'@aegisui/tokens': minor
'@aegisui/ui': patch
---

Corrige un hueco real de contraste (WCAG 1.4.11): ningún color de borde neutro
pasaba 3:1 en ningún tema. `color.border.default` se renombra a
`color.border.separator` (decorativo, sin este requisito: divisores, track de
spinner, borde de `disabled`); `color.border.strong` **conserva su nombre**
pero cambia de valores (`neutral.300/700` → `neutral.500/400`) para pasar 3:1
contra `canvas`/`raised`/`sunken` en light y dark, con margen. El gate
`contrast` amplía `semanticPairs()` y el chequeo de fixtures DOM para
verificar bordes funcionales — antes no comprobaba ninguno (ADR-018).

El Button (`@aegisui/ui`) ya en producción usaba `--aegis-color-border-strong`
para el borde de su variante `secondary`, que incumplía 1.4.11 sin que ningún
gate lo cazara; con este fix pasa a cumplirlo sin tocar su CSS. Su spinner-track
(`secondary`/`ghost`) y su borde `disabled` migran de `--aegis-color-border-default`
(ya no existe) a `--aegis-color-border-separator`.

**Rotura para consumidores del CLI copia-fuente (ADR-003):** quien haya
copiado el CSS del Button y referencie `--aegis-color-border-default`
directamente debe migrar a `--aegis-color-border-separator`.
