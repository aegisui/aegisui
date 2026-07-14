# ADR-013: Los fixtures son objetivos de CI de primera clase

## Contexto

La Fase 1 dejó 6 gates de §9.2 —`a11y`, `contrast`, `keyboard`, `target-size`,
`visual`, `contracts`— fallando a propósito (`pending-gate.mjs`): no tenían nada
que analizar porque aún no hay componentes reales, y la regla anti-verde-falso
prohíbe que un gate pase en verde sin objetivos.

El comportamiento era correcto, pero la consecuencia inaceptable: con esos checks
en rojo no se puede mergear NADA a `main` hasta la Fase 3. Y había una
inconsistencia de fondo: a las 11 reglas ESLint sí les dimos fixtures `good/bad`
y tests en las dos direcciones (ADR-009); a estos 6 gates, no. Merecen la misma
medicina.

## Decisión

`tools/fixtures/good/` y `tools/fixtures/bad/` **no son solo entrada de tests
unitarios: son objetivos de CI de primera clase**. Cada uno de los 6 gates se
cablea contra ellos y demuestra las dos direcciones, igual que RuleTester con las
reglas ESLint.

**Cómo se cablea** (es lo que más se malinterpreta): el gate no ejecuta su
análisis sobre `bad/` y reporta el resultado crudo. Ejecuta un test que INVIERTE
la expectativa:

- test sobre `good/` → **pasa si el gate NO encuentra violaciones**
  (prueba que el gate no da falsos positivos);
- test sobre `bad/` → **pasa si el gate SÍ encuentra violaciones**
  (prueba que el gate no da falsos negativos).

**Los dos tests en verde en CI.** Si el test de `bad/` se pone rojo, significa que
el gate ha DEJADO de detectar la violación deliberada: el raíl se ha roto y hay
que enterarse en el acto.

Implementación:

- `scripts/gates/<gate>.mjs` — un analizador estático propio por gate (cero
  dependencias de runtime; misma filosofía que las 11 reglas ESLint), que expone
  `good()`/`bad()` devolviendo la lista de violaciones.
- `scripts/gates/run.mjs <gate>` — corre las dos direcciones y es el comando de
  cada job de CI. El `name:` del job no cambia (sigue siendo required en la
  protección de rama); lo que cambia es que ahora tiene objetivos reales.
- `tools/fixtures/src/gates.spec.ts` — ejercita las mismas funciones en el job
  `test`, en las dos direcciones.

Cada violación de `bad/` es DELIBERADA y está comentada en el fixture con el gate
que la caza. El "render" que consumen los gates DOM vive junto al componente como
`fixture-*.rendered.{light,dark}.html`: es la SALIDA con tokens resueltos (por eso
lleva colores/medidas concretos), no el fuente —el fuente sigue siendo 100%
`var(--aegis-*)` y lo cazan las reglas ESLint—. El teclado declarado vive en el
contrato del fixture (`## Teclado`).

## Consecuencias

- Los 13 checks de la PR pueden ir en verde sin aflojar ningún raíl y sin bypass
  de admin. Se puede mergear a `main` desde la Fase 1.
- **Esto NO es temporal.** Los fixtures no se quitan en la Fase 3. Cuando lleguen
  los componentes reales, los gates los analizarán A ELLOS ADEMÁS DE a los
  fixtures (ver `realPackagesViolations()` en `contracts.mjs`). Razón: si los
  gates solo miraran componentes reales y alguien aflojara una regla, todo
  seguiría en verde (los componentes existentes ya cumplían) y nadie se enteraría
  de que el gate murió. Los fixtures son el test de regresión **de los propios
  gates**: quién prueba a los que prueban.
- En Fase 2/3, el análisis de cada gate se sustituye por el "de verdad" (axe real
  sobre DOM renderizado, screenshots contra el sandbox, contraste sobre tokens
  reales…) **sin tocar el `name:` del job ni retirar los fixtures**: el fixture
  `bad/` sigue siendo el canario.
- Deroga en la práctica la última frase de ADR-009 ("no cubren
  contrast/a11y/target-size/visual"): ahora sí los cubren, vía fixtures
  renderizados.
