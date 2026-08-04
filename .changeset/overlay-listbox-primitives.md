---
'@aegisui/cdk': minor
---

Añade los dos primitivos headless de la Fase 5, base de Select y Combobox:

**`AegisOverlay`** — posiciona un flotante respecto de un ancla. Se apoya en la
**Popover API nativa** (`popover="auto"`) para la capa superior, el cierre con
`Esc`, el clic fuera y la restauración de foco, y en **`@floating-ui/dom`** (nueva
dependencia runtime, aprobada por ADR-023) para la colisión de viewport. `flip` y
`shift` van activos por defecto porque un overlay que tapa el control enfocado
viola WCAG 2.4.11.

Ningún tipo de `@floating-ui/*` cruza a la API pública: `AegisPlacement` es unión
propia. Es lo que mantiene la dependencia **retirable** el día que
`@position-try` sea *widely available*, sin breaking change (ADR-023 §3).

**`AegisListbox`** — patrón ARIA listbox con **foco virtual**: el foco DOM se
queda en el control y la opción activa viaja por `aria-activedescendant`.
Distingue *activa* de *seleccionada* (navegar no compromete nada), aplica el
**cap de 100 resultados** de ADR-023 §4 con su fila de estado, y anuncia por
región live **solo** truncación y vacío — nunca el recuento normal, que NVDA/JAWS
ya dan de forma nativa (ADR-019 Regla 3).

Un consumidor que use solo el listbox **no paga nada de Floating UI**: se
tree-shakea entero (verificado con app Angular real contra `dist/`).
