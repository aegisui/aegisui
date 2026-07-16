---
---

Changeset vacío a propósito: el único cambio dentro de `packages/**` es el
import de tipos en `packages/ui/src/lib/button/button.stories.ts` (de
`@storybook/angular` a `@storybook/angular-vite`, ADR-017). Las stories no
forman parte del artefacto publicado de `@aegisui/ui` (excluidas del build de
ng-packagr); no hay cambio de comportamiento ni de API que publicar.
