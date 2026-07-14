# ADR-006: Angular 22 de build; TypeScript lo acota Angular

## Contexto

El SPEC pedía "Angular 20+". El "20+" era un **suelo** ("nada de legacy"), no un
objetivo: la propuesta de valor entera es "sin deuda heredada". La última estable en
el momento de arrancar era Angular 22. Además, el toolchain está acoplado: cada
Angular acota el rango de TypeScript que admite (`@angular/compiler-cli@22` exige
`typescript >=6.0 <6.1`), y la última TS del registro (7.x) queda **fuera** de ese
rango.

## Decisión

- Construir con **Angular `22.0.6` exacto** (sin `^`/`~`). El "20+" del SPEC se
  reescribió a "Angular 22".
- Fijar **TypeScript `6.0.x`** (la línea que Angular admite), **no** la última TS.
- Todas las versiones del toolchain se pinean **exactas** por coherencia interna, no
  "la última de cada pieza". Nx, pnpm, ng-packagr y TS se eligen juntos.

## Consecuencias

- Builds reproducibles; imposible que un `pnpm update` meta una TS incompatible.
- Al subir de Angular mayor hay que revisar el rango de TS de golpe (es una ventaja:
  un único punto de verdad).
- No nos beneficiamos de features de la última TS hasta que Angular las admita. Es el
  precio correcto: Angular es quien compila nuestro código.
