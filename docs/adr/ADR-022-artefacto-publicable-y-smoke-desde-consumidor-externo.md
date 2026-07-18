# ADR-022: El artefacto publicable se ensambla y se verifica desde un consumidor EXTERNO

## Contexto

La landing (`aegisui-web`) vive en su propio repo y consumirá los paquetes como
**cliente externo**, por npm, no por workspace. Al preparar ese escenario se
comprobó que **nada del pipeline había mirado nunca el artefacto publicable**.

Los cinco componentes del set mínimo (Button, Input, Switch, Card, Badge)
reportaron "CLI copia-fuente ✓". Los cinco se verificaron **dentro del
monorepo**, donde `findUiLibDir()` encuentra `packages/ui/src/lib` por su
**segundo** candidato. El primero —`node_modules/@aegisui/ui/src/lib`, el único
que existe para un consumidor real— **nunca se ejercitó**. Cinco verdes que no
significaban lo que parecían.

Al empaquetar de verdad aparecieron **tres** fallos encadenados, ninguno visible
desde dentro:

| # | Fallo | Efecto |
|---|---|---|
| 1 | `ng-packagr` no copia `src/` al artefacto | `npx aegisui add <x>` no encuentra nada fuera del monorepo. **ADR-001 y ADR-003 rotos en producción.** |
| 2 | `cli` e `icons` no tenían `package.json` en `dist` (su builder es `tsc` a secas) | Artefactos sin manifiesto: no publicables. |
| 3 | `@aegisui/ui` arrastraba `"@aegisui/cdk": "workspace:^"` | El artefacto **ni siquiera se podía empaquetar** fuera del workspace (`ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`), y publicado habría dado un rango inválido a cualquier consumidor de npm/yarn. |

El fallo 3 solo salió al intentar `pnpm pack` sobre `dist/`. El 1 solo al
instalar el tarball en un proyecto ajeno. **Ninguno de los tres se puede ver sin
salir del repo.**

## Decisión

### 1. El artefacto se ENSAMBLA, no se asume (`scripts/assemble-dist.mjs`)

Los builders dejan cada paquete a medias para publicar. Un paso explícito de
ensamblado cierra los huecos y **verifica lo que deja**:

- Copia `src/` a `dist/packages/{ui,cdk}` (ADR-001), **excluyendo** `*.spec.ts`,
  `*.stories.ts` y `__snapshots__`: el andamiaje de desarrollo no es producto.
- Copia el `package.json` de `cli` e `icons`.
- Marca el bin del CLI como ejecutable y comprueba que conserva su shebang.
- **Reescribe `workspace:<rango>` al rango real** (`workspace:^` → `^0.1.0`),
  resolviendo contra el `package.json` local del paquete referido. El grupo
  lockstep (ADR-008) comparte versión, así que la traducción es directa.
- Falla si el resultado no cumple lo que promete: sin `src/lib/button/*`, con
  specs publicados, o con un `workspace:` superviviente.

### 2. La verificación es desde FUERA, y no hay alternativa válida

`scripts/publish-smoke.mjs` (`pnpm publish-smoke`):

1. `pnpm pack` de cada artefacto → tarballs reales.
2. Proyecto temporal en `os.tmpdir()`, **fuera del árbol del monorepo** (el
   script aborta si el directorio cae dentro: sería un verde vacío).
3. `npm install` de los tarballs — con **npm**, no pnpm, para ejercitar la
   resolución del consumidor y no la del workspace.
4. Comprueba que `node_modules/@aegisui/ui/src/lib/button/*` existe, y que las
   specs/stories **no** viajan.
5. Ejecuta el binario real `aegisui add button` y comprueba los ficheros
   copiados.
6. `tsc --noEmit` sobre un componente que importa **los cinco** componentes del
   paquete instalado: que resuelvan y tipen, no solo que existan.

**Un test que corra dentro del monorepo no vale como verificación de esto**, por
construcción: ahí el fallback del CLI siempre salva la papeleta y pnpm siempre
resuelve `workspace:`.

### 3. Es un gate de CI, no un script que alguien recuerde correr

Job `publish-smoke` en `ci.yml`. Verificado que **falla** al reintroducir cada
fallo, no solo que pasa con el código bueno:

| Fallo reintroducido | Resultado |
|---|---|
| `dist/packages/ui/src` borrado | ❌ "el paquete instalado no incluye src/lib" |
| `workspace:^` de vuelta en el manifiesto | ❌ "pack de ui falló" |

## Consecuencias

- **`npx aegisui add <componente>` funciona en un consumidor externo real**,
  verificado end-to-end. ADR-003 deja de estar roto; la landing puede consumir
  los paquetes como cliente externo.
- El artefacto publicable pasa a tener una definición explícita y comprobada, en
  vez de ser "lo que dejen los builders".
- La lección, que ya es la quinta de la misma familia (ADR-018 bordes, ADR-020
  gate `contracts`, ADR-021 disparador de CI, #19 el CLI): **el objetivo de la
  verificación tiene que ser el objetivo real.** Probar el CLI desde dentro del
  monorepo era como probar un gate contra fixtures y creer que cubría
  `packages/ui`. Cuando la verificación vive en el mismo sitio que el fallback,
  no verifica nada.
- Queda pendiente `pnpm publish` de verdad (changesets) contra un registro de
  prueba: este ADR cubre el artefacto y su consumo, no el flujo de release.
