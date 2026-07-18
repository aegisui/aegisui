# ADR-021: CI dispara contra cualquier rama base; alcance real de la protección de `main`, verificado

## Contexto

Al apilar el PR de los contratos del set mínimo sobre el PR que arreglaba el
gate `contracts` (ADR-020), el PR de arriba se quedó **sin ningún check**:

```
$ gh pr checks 14
no checks reported on the 'contracts/set-minimo' branch
```

La causa es el disparador de `.github/workflows/ci.yml`:

```yaml
on:
  pull_request:
    branches: [main]     # <- solo PRs cuya BASE es main
```

`branches:` en `pull_request` filtra por la rama **base**. Un PR apilado (base
`fix/contracts-gate`) no la cumple, así que **el workflow entero no se
encolaba**. Y lo hacía **en silencio**: GitHub no distingue visualmente "sin
checks" de "checks aún no llegados". Un PR sin checks es peor que uno en rojo —
parece aprobable y no ha verificado nada. Es la forma más pura del verde-falso
que SPEC §13 prohíbe, y ya es la tercera vez en el proyecto que aparece un verde
que no cubría lo que creíamos (ADR-018 en bordes, ADR-020 en el propio gate
`contracts`, y ahora en el disparador de CI).

## Verificación empírica del ruleset (no por documentación)

Antes de decidir nada se comprobó **con PRs sonda reales** qué hace hoy la
protección de rama, porque la pregunta importante no era el disparador sino si
un PR sin checks se puede mergear.

El ruleset `main-protection` (`enforcement: active`) tiene
`conditions.ref_name.include = ["~DEFAULT_BRANCH"]`: **aplica solo a `main`**.
13 checks requeridos y `strict_required_status_checks_policy: true`.

| Sonda | Base | Checks | `mergeStateStatus` | Veredicto |
|---|---|---|---|---|
| PR con base **no-main** | `tmp/ruleset-probe-base` | **0** | `CLEAN` / `MERGEABLE` | ❌ **mergeable sin verificar nada** |
| La misma sonda re-apuntada a **main** | `main` | **0** | `BLOCKED` (sostenido) | ✅ los required ausentes **sí** bloquean |

**Las dos conclusiones, y la segunda es la tranquilizadora:**

1. **El agujero existe:** una rama base distinta de `main` no está cubierta por
   ningún ruleset, así que un PR apilado con cero checks se puede mergear en su
   base sin que nada lo impida.
2. **`main` nunca estuvo en riesgo:** un required check que **no llega** no se
   interpreta como satisfecho. GitHub mantiene el PR en `BLOCKED` de forma
   sostenida (verificado durante 80 s, no un estado transitorio). No hay
   "timeout" que lo desbloquee.

Es decir: el fallo permitía que **código sin verificar entrara en una rama
intermedia**, pero **no** que llegara a `main` sin pasar los 13 gates — el
merge final a `main` siempre los exige, y con
`strict_required_status_checks_policy: true` además obliga a estar al día con
`main`, lo que fuerza un push nuevo y por tanto una ejecución nueva de CI sobre
el estado final.

El daño real, entonces, es **de proceso, no de integridad de `main`**: un
revisor mira un PR apilado, no ve ningún rojo, y lo aprueba creyendo que pasó
los gates. La verificación se pospone sin que nadie lo decida.

## Decisión

### 1. `pull_request` sin filtro de rama base

```diff
  on:
    pull_request:
-     branches: [main]
    push:
      branches: [main]
```

CI dispara ahora contra **cualquier** base. Un PR apilado recibe sus 13 checks
como cualquier otro.

`push` **sí** se queda acotado a `main`: es el build de la rama principal, y sin
filtro cada push a cada rama duplicaría el trabajo que ya hace el PR.

Los `name:` de los jobs **no cambian** (siguen siendo los 13 *required* del
ruleset — ADR-013: renombrarlos dejaría a GitHub esperando un check inexistente).

### 2. No se añade `edited` a los `types` del disparador

Se detectó de paso que **re-apuntar la base de un PR no re-dispara CI**: los
`types` por defecto de `pull_request` son `[opened, synchronize, reopened]`, y
un cambio de base es la actividad `edited`. Se **descarta** añadir `edited`:
también se dispara al editar título o cuerpo, así que cada corrección de una
descripción reejecutaría 14 jobs.

No hace falta, y esto es lo que lo cierra: con `strict_required_status_checks_policy:
true`, un PR re-apuntado a `main` tiene que estar **al día** con `main` para
poder mergearse, lo que fuerza un push nuevo → `synchronize` → CI sobre el
estado final. El hueco se cierra por la política de "up to date", no por
multiplicar ejecuciones.

### 3. El alcance del ruleset se deja en `~DEFAULT_BRANCH`, conscientemente

Se evaluó extender `main-protection` a más ramas (p. ej. `~ALL`). Se descarta:

- Con el disparador arreglado, **el motivo del agujero desaparece**: un PR
  apilado ya trae sus checks, así que mergearlo sin verificar deja de ser el
  camino por defecto.
- Exigir 13 checks requeridos en **toda** rama impediría flujos legítimos
  (ramas de spike, ramas de trabajo temporales, `--allow-empty` para probar
  infraestructura como las sondas de este ADR).
- El invariante que de verdad importa —**nada entra en `main` sin los 13
  gates**— ya está garantizado y ahora, además, **verificado empíricamente**.

Lo que queda documentado, y es la parte que ningún ruleset arregla: **mergear un
PR apilado sigue siendo una decisión humana**. La regla de proceso es mirar los
checks del PR apilado, no solo los de la base.

## Nota posterior: apilar tiene un coste de CICLO DE VIDA, no solo de CI

Este ADR arregló que un PR apilado **reciba** sus checks. Al mergear el set
mínimo (Switch → Card → Badge) apareció el otro filo del mismo cuchillo, que
este ADR no cubría:

**Al mergear el PR de abajo y borrar su rama, GitHub CIERRA automáticamente el
PR de arriba** (su base deja de existir). Y un PR así **no se puede reabrir ni
reapuntar**:

```
GraphQL: Could not open the pull request. (reopenPullRequest)
GraphQL: Cannot change the base branch of a closed pull request. (updatePullRequest)
```

Pasó con el PR de la Card (#21): hubo que abrir uno nuevo (#23) con el mismo
contenido. Con el del Badge (#22) se evitó **reapuntándolo a `main` antes** de
mergear la Card, mientras seguía abierto.

**Regla de proceso:** al mergear una pila, **reapuntar el PR de arriba a `main`
ANTES de mergear el de abajo**, nunca después. El orden importa: reapuntar es
gratis mientras el PR está abierto e imposible en cuanto se cierra.

Segundo efecto, menor pero seguro: tras un merge por **squash**, la rama de
arriba arrastra los commits originales del de abajo, que ya están en `main`
comprimidos y conflictúan consigo mismos. Se replaya solo lo propio con
`git rebase --onto main <tip-antiguo-de-la-base> <rama>`.

## Consecuencias

- Ningún PR de este repo puede volver a quedarse sin checks por su rama base.
- La protección de `main` queda **verificada de verdad** (dos sondas reales,
  luego borradas), no supuesta a partir de la documentación de GitHub. La
  conclusión —los required ausentes bloquean— es la buena, pero no se sabía
  hasta comprobarla.
- Se añade al conocimiento del proyecto el matiz de que **cambiar la base de un
  PR no re-dispara CI**, con el motivo por el que no hace falta corregirlo.
- **La lección, por tercera vez y ahora en el propio CI:** un verde solo vale lo
  que vale su objetivo. ADR-018 lo aprendió con un gate que no miraba los
  bordes; ADR-020, con un gate que no miraba `packages/ui`; este ADR, con un
  workflow que no llegaba a ejecutarse. La comprobación que faltaba siempre es
  la misma: **demostrar que falla cuando debe fallar**, no solo que pasa.
