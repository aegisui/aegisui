---
'@aegisui/ui': patch
'@aegisui/cdk': patch
'aegisui': patch
---

**El artefacto publicable ya es consumible desde fuera del monorepo** (ADR-022,
issue #19). Tres fallos que impedían usar los paquetes como cliente externo:

- `@aegisui/ui` y `@aegisui/cdk` ahora **incluyen su código fuente** en el
  paquete (ADR-001). Sin esto, `npx aegisui add <componente>` no encontraba nada
  en un proyecto real: ADR-003 estaba roto en producción.
- `aegisui` (CLI) y `@aegisui/icons` no llevaban `package.json` en su artefacto
  y no eran publicables; el bin del CLI no quedaba ejecutable.
- `@aegisui/ui` declaraba `"@aegisui/cdk": "workspace:^"`, un protocolo de pnpm
  que solo se resuelve dentro del workspace: el artefacto ni siquiera se podía
  empaquetar, y publicado habría dado un rango inválido a cualquier consumidor.
  Ahora se resuelve al rango real del grupo lockstep (`^0.1.0`).

Las specs y las stories **no** se publican: son andamiaje, no producto.
