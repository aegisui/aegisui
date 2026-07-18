---
'@aegisui/ui': minor
---

fix(button): anuncio de carga via `aria-live`, sin `aria-describedby` (ADR-019)

El `<button>` deja de tener `aria-describedby` apuntando al span de estado. El
span hermano recupera `aria-live="polite"`. Razón: la carga es una notificación
transitoria — `aria-live` es el patrón correcto (Regla 2 de ADR-019). VoiceOver
no reanuncía `aria-describedby` en caliente; con describedby-solo no anunciaba
«Cargando». Con `aria-live` + describedby sobre el mismo nodo, NVDA duplicaba.
Un solo canal elimina ambos problemas.

Cambio de comportamiento observable (ARIA): lectores de pantalla que usaran
`aria-describedby` para leer el estado de carga al reenfocar recibirán ahora
solo el anuncio live. El caso de re-foco durante la carga es transitorio y no
requería relectura persistente — el comportamiento correcto es el anuncio live.
