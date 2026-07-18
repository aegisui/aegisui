---
'@aegisui/ui': minor
---

Cuarto componente del set mínimo (Fase 4): **Card**.

- `<aegis-card>`, contenedor con superficie, borde, radio y padding por tokens.
  `padding` (`none`/`sm`/`md`/`lg`) y `elevation` (`flat`/`raised`).
- **Sin brain en `@aegisui/cdk`, a propósito:** la Card no tiene foco, ni
  teclado, ni posicionamiento, ni estado — no hay lógica que separar. Un
  `AegisCard` vacío sería código muerto. El generador lo scaffoldea por defecto
  y aquí se retiró. Es el primer componente de la librería sin brain, y marca el
  criterio: brain cuando hay lógica, no por simetría.
- **Sin rol ARIA, también a propósito:** `role="region"` convertiría ocho
  tarjetas de feature en ocho landmarks anónimos. La semántica la aporta el
  consumidor (envolviendo la Card, o proyectando el encabezado del nivel que
  corresponda a SU página — el componente no puede saber si es `h2` o `h4`).
- **No interactiva en v1:** sin `hover`, sin `click` propio, sin `tabindex`. Un
  `<aegis-button>` o un enlace DENTRO cubre el caso sin las trampas de a11y de
  la "card clicable entera".
- **Sin `overflow: hidden`**, que es una decisión de accesibilidad y no un
  olvido: recortaría el anillo de foco de un control proyectado en la esquina
  (2.4.11). Verificado en Chromium con un botón real en la esquina de una Card.
- Borde **decorativo** sobre `border-separator` (ADR-018): la Card no es un
  control, su borde no comunica estado y 1.4.11 no le exige 3:1.
  Sobre-contrastarlo haría que el borde de un Input —que sí es funcional— dejara
  de distinguirse del contorno de una tarjeta.
- Texto sobre la superficie de la Card verificado ≥ 4.5:1 en light y dark (la
  Card cambia el fondo del contenido de `canvas` a `raised`, así que ese par es
  suyo).
