---
'@aegisui/tokens': minor
---

Añade el rol semántico de **acción destructiva sólida** `color.destructive.*`
(`solid`, `solid-hover`, `on-solid`, `ring`), hermano de `accent` y separado del
estado `danger` (ADR-015). Acción ≠ estado: no rompe el raíl de ADR-014 (los
estados siguen sin `solid`/`on-solid`), lo refuerza. Contraste verificado en
light y dark (≥ 4.5:1 texto / ≥ 3:1 UI); `red.500` descartado por 3.77:1.
Desbloquea la variante `danger` del Button (Fase 3).
