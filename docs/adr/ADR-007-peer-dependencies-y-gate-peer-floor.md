# ADR-007: `peerDependencies` `^20 || ^21 || ^22` y el gate `peer-floor`

## Contexto

Construimos con Angular 22 (ADR-006), pero muchos consumidores están en Angular 20 o
21. ¿Puede una librería compilada con Angular 22 consumirse desde una app en 20/21?
Se diseñó un spike (build de una lib trivial con Angular 22 → linkers de 20 y 21) en
vez de responder de memoria. Hallazgos, **críticos y poco intuitivos**:

1. **ng-packagr NO calcula el `peerDependencies`: copia _literal_ el que escribes en
   el `package.json` fuente.** El número que publicas es el que tú declaras; puede
   mentir.
2. ng-packagr no emite código final, sino _partial declarations_. La app consumidora
   las finaliza con **su propio** Angular linker. Cada declaración lleva un
   **`minVersion` embebido por declaración** en el FESM = la versión mínima de Angular
   cuyo linker soporta las **features usadas** (no la versión de build). Una lib
   trivial en Angular 22 embebió `minVersion: "17.1.0"` → linkea sin problema en 20 y
   21. Si se usa una feature exclusiva de 22, ese `minVersion` sube a `22.0.0` y el
   linker de 20/21 falla en build con un mensaje claro.

## Decisión

- `peerDependencies` de los paquetes con runtime Angular:
  `"@angular/core": "^20.0.0 || ^21.0.0 || ^22.0.0"` (ídem `@angular/common`).
  Compilamos con 22, soportamos desde 20. No bajamos a 17/18 (versiones fuera de
  mantenimiento) ni cerramos en `^22` (estrecharía el mercado sin ganar nada).
- Gate **`peer-floor`** ([`scripts/check-peer-floor.mjs`](../../scripts/check-peer-floor.mjs)):
  lee el `minVersion` embebido en cada **FESM construido** (no el `package.json`
  fuente) y falla si supera `20.0.0`. Si no encuentra ningún FESM, **falla
  ruidosamente** (no pasa en silencio).
- Subir el suelo (p. ej. a `^21`) es un cambio **MAJOR** con justificación explícita.

## Consecuencias

- El `peerDependencies` deja de ser una promesa: está **verificado** contra el
  artefacto real en cada build. Ese es el motivo de existir del gate.
- **No "simplifiques" `peer-floor`** leyendo el `package.json` en vez del FESM: ahí es
  precisamente donde la promesa se desincroniza de la realidad (hallazgo 1).
- Usar una feature de Angular 21/22 en un componente pondrá el gate en rojo antes de
  publicar. Es intencionado: obliga a decidir conscientemente subir el suelo.
