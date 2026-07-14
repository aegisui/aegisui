# Changesets

Este directorio gestiona el versionado y los changelogs con
[Changesets](https://github.com/changesets/changesets).

## Cómo añadir un changeset

Todo PR que toque `packages/**` necesita uno:

```bash
pnpm changeset
```

Elige `patch` / `minor` / `major` y describe el cambio de cara al usuario.

## Convenciones de Aegis UI

- **Grupo `fixed` (lockstep):** `@aegisui/tokens`, `@aegisui/cdk`, `@aegisui/ui`,
  `@aegisui/icons` comparten número de versión. Nuestros usuarios son usuarios de
  Angular (que ya versiona en lockstep): evitamos obligarles a razonar sobre una
  matriz de compatibilidad entre paquetes.
- **`aegisui` (CLI) va independiente:** es una herramienta que ejecutas, no una
  librería que instalas.
- **Paquetes no publicables** (`sandbox`, `eslint-rules`, `fixtures`) llevan
  `"private": true` en su `package.json`; Changesets los salta solo.
- **Pre-1.0:** hasta que la API sea estable (no antes de terminar la Fase 4) se
  publica bajo el dist-tag `next`, nunca `latest` (`pnpm release`).
