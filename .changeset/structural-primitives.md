---
'@aegisui/tokens': minor
---

Añade a capa 1 las escalas primitivas **estructurales** que faltaban (ADR-016,
modelo de dos rieles): `border.width` (`--aegis-border-width-{none,hairline,thin}`)
y `focus.ring` (`--aegis-focus-ring-{width,offset}`). Son la fuente de los tokens
de capa 3 estructurales de los componentes (borde, anillo de foco, trazo del
spinner), para que `no-literal-design-values` no tenga excepciones: un literal
estructural se tokeniza como primitivo, no se relaja la regla.
