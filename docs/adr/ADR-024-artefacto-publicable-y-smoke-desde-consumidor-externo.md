# ADR-024: El artefacto publicable se ensambla y se verifica desde un consumidor EXTERNO

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
5. Ejecuta el binario real `aegisui add <x>` con **los siete** componentes y
   comprueba los ficheros copiados.
6. `tsc --noEmit` sobre un componente que importa **los siete** del paquete
   instalado: que resuelvan y tipen, no solo que existan. Select y Combobox son
   genéricos, así que el consumidor los instancia con **su** tipo.

La lista de componentes (`COMPONENTS`) se reconcilia contra
`packages/ui/src/lib` antes de empezar: **un componente nuevo que nadie añada ahí
hace fallar el smoke**, en vez de pasar en verde sin haberse probado nunca. Es el
mismo principio que `size-marginal` con los presupuestos y `coverage` con las
matrices — un componente sin cobertura de distribución no es cobertura cero, es
cobertura DESCONOCIDA.

**Un test que corra dentro del monorepo no vale como verificación de esto**, por
construcción: ahí el fallback del CLI siempre salva la papeleta y pnpm siempre
resuelve `workspace:`.

### 3. Es un gate de CI REQUIRED, no un script que alguien recuerde correr

Job `publish-smoke` en `ci.yml`, y **required** en la protección de rama.

Con canario propio (`pnpm publish-smoke:canary`, misma convención que
`size:canary`): reintroduce **los tres fallos reales** de uno en uno sobre una
copia de `dist/` y exige que el smoke los cace. Un gate que no se ha visto fallar
no es un gate, es una afirmación. Salida real:

| Fallo reintroducido | Dónde muere | Mensaje |
|---|---|---|
| `dist/packages/ui/src` borrado | paso 4 | "el paquete instalado no incluye src/lib" |
| `dist/packages/cli/package.json` borrado | precheck | "no existe dist/packages/cli/package.json" |
| `workspace:^` de vuelta en el manifiesto | paso 1 | `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL` |

Los tres mueren en sitios distintos y por su propia razón, no por un fallo
incidental compartido.

### 4. Por qué REQUIRED y no informativo: el episodio del PR #24

El arreglo de #19 se escribió el 2026-07-18 y se **declaró entregado sin
entregarse**. El PR #24 se cerró con este comentario:

> "Cerrada como duplicada: el contenido de esta PR fue mergeado en main vía
> squash en el commit c84bc5f4 (PR #19, ADR-022). Los cambios están en
> producción."

Los tres identificadores eran falsos: `c84bc5f4` es la punta de la propia rama
del PR (no un squash sobre main, y `git merge-base --is-ancestor c84bc5f4 main`
da NO), `#19` es el issue y no una PR, y el `ADR-022` real de main es otro
(cobertura declarada, PR #29). **La librería estuvo tres semanas sin poder ni
empaquetarse mientras un comentario decía que estaba arreglado**, y Fase 5 entera
—Select y Combobox— se construyó encima.

Ninguna herramienta lo cazó porque el fallo no estaba en el código: estaba en una
afirmación en prosa. De ahí la conclusión operativa:

**El valor de este job no es solo verificar el empaquetado: es que el estado
publicable pase a ser algo que el CI AFIRMA, no algo que un comentario puede
afirmar falsamente.** Si `publish-smoke` hubiera existido como required el 18 de
julio, main habría estado en rojo y el comentario no habría podido sostenerse: el
rojo lo desmiente. Un gate informativo no tiene esa propiedad — se puede ignorar
en silencio, que es exactamente lo que pasó.

La pregunta abierta que deja el episodio (¿merece la pena un check que verifique
que un commit citado en un cierre es ancestro de main?) queda anotada como issue,
sin decidir: ha pasado una vez, y el coste puede superar al beneficio.

## Consecuencias

- **`npx aegisui add <componente>` funciona en un consumidor externo real**,
  verificado end-to-end. ADR-003 deja de estar roto; la landing puede consumir
  los paquetes como cliente externo.
- El artefacto publicable pasa a tener una definición explícita y comprobada, en
  vez de ser "lo que dejen los builders".
- La lección, que ya es la quinta de la misma familia (ADR-018 bordes, ADR-020
  gate `contracts`, ADR-021 disparador de CI, #19 el CLI): **el objetivo de la
  verificación tiene que ser el objetivo real.** El #24 añade una variante nueva
  y peor: cuando no hay verificación ninguna, el objetivo lo fija un comentario. Probar el CLI desde dentro del
  monorepo era como probar un gate contra fixtures y creer que cubría
  `packages/ui`. Cuando la verificación vive en el mismo sitio que el fallback,
  no verifica nada.
- Queda pendiente `pnpm publish` de verdad (changesets) contra un registro de
  prueba: este ADR cubre el artefacto y su consumo, no el flujo de release.
