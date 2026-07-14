# ADR-010: Node 22 + pnpm pinneado vía corepack

## Contexto

Builds reproducibles exigen fijar también el runtime y el gestor de paquetes, no solo
las dependencias. Además, el Angular CLI **exige Node ≥ 22.22.3** (error duro, no
warning; ng-packagr solo avisa) — un `.nvmrc` con "22" a secas es ambiguo.

## Decisión

- Node **`22.23.1` exacto** en `.nvmrc` (línea 22 LTS; ≥ 22.22.3 que exige el CLI).
- pnpm **`11.12.0`** pineado en el campo `packageManager` de `package.json`, servido
  por **corepack** (`corepack enable`). El package manager es pnpm (no npm/yarn).
- Los scripts de build de dependencias nativas se aprueban explícitamente en
  `pnpm-workspace.yaml` (`allowBuilds`), no se ejecutan a ciegas.

## Consecuencias

- CI usa `node-version-file: .nvmrc` + `corepack enable`; misma versión en local y CI.
- **Ojo operativo:** Nx puede auto-lanzar `pnpm install` invocando `pnpm` a secas; si
  corepack no está habilitado, falla con `ENOENT`. Solución: `corepack enable` (CI ya
  lo hace). No es un bug de Nx.
- Subir Node/pnpm es un cambio deliberado (editar `.nvmrc` / `packageManager`), nunca
  implícito.
