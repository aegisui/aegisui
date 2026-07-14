---
'@aegisui/tokens': minor
---

Fase 2 — sistema de tokens en tres capas y theming (dirección "Jade & Graphite",
ADR-014). Capa 1 (primitivos) y capa 2 (semánticos con dark mode) como fuente
JSON única; build a CSS + preset Tailwind + tipos TS; dark por
`prefers-color-scheme` + `[data-theme]`. La capa 3 (de componente) nace vacía con
el primer componente en la Fase 3.
