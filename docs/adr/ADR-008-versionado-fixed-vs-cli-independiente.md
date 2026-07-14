# ADR-008: Versionado fixed (tokens/cdk/ui/icons) vs `cli` independiente

## Contexto

Con varios paquetes publicables (`tokens`, `cdk`, `ui`, `icons`, `cli`) hay que
decidir cómo se versionan entre sí. El versionado independiente obliga al usuario a
razonar sobre una matriz de compatibilidad (¿`ui@2.1` va con `cdk@1.8`?). Eso es
fricción y contradice nuestra propuesta. Nuestros usuarios ya son usuarios de
Angular, que versiona en **lockstep**: tienen ese modelo mental.

## Decisión

- Grupo **`fixed` (lockstep)** en Changesets: `@aegisui/tokens`, `@aegisui/cdk`,
  `@aegisui/ui`, `@aegisui/icons` comparten un único número de versión.
- **`aegisui` (el CLI) va independiente**: es una herramienta que _ejecutas_, no una
  librería que _instalas_; su versión no debe arrastrar a las librerías ni al revés.
- Los no publicables (`sandbox`, `eslint-rules`, `fixtures`) se marcan con
  `"private": true` en su `package.json`. **No** se usa la lista `ignore` de la
  config: la verdad vive en el paquete, no en un config que se desincroniza.
- Versión inicial `0.1.0`. Pre-1.0 se publica bajo dist-tag **`next`**, nunca
  `latest`, hasta que la API sea estable (no antes de terminar la Fase 4).

## Consecuencias

- El usuario instala "Aegis UI vX" sin pensar en compatibilidad entre paquetes.
- Un cambio en un solo paquete del grupo sube la versión de los cuatro. Es el precio
  del lockstep, y lo aceptamos a cambio de cero fricción de compatibilidad.
- Añadir un paquete publicable = quitarle `private` (o no ponérselo); no hay que
  tocar ninguna lista central.
