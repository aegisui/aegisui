# ADR-023: Política de dependencias runtime — `@floating-ui/dom` aprobada, `@angular/cdk` rechazada

## Contexto

Select y Combobox necesitan dos capacidades que no vamos a escribir desde cero:
**posicionamiento de overlay flotante** (colisión de viewport, flip, anclaje,
reposicionamiento en scroll) y, opcionalmente, **virtual scrolling**.

Es la **primera vez** que el proyecto se plantea una dependencia runtime fuera de
lo que trae Angular. La regla vigente hasta hoy —_"cero deps runtime salvo
`@angular/*`"_— resultó ser una aproximación **equivocada**, no solo imprecisa:
`@angular/cdk` **es** `@angular/*` y es justo la dependencia que más nos ataría.
La regla, tal como estaba escrita, aprobaba lo peor y prohibía lo mejor.

Se investigó con medición real (método al final; cifras del **2026-08-02**), no de
memoria, comparando dos vías para overlay **y** para virtual scroll por separado.

### Hallazgo 1 — el peso no es lo decisivo, pero no es despreciable

Bundle con esbuild, Angular marcado `external`, gzip -9:

| Capacidad | Vía | gzip |
|---|---|---|
| Overlay | `@angular/cdk/overlay`, import **mínimo** | **23.9 kB** |
| Overlay | `@angular/cdk/overlay`, import **completo** | **23.9 kB** |
| Overlay | `@floating-ui/dom` (`computePosition, flip, shift, size`) | **5.7 kB** |
| Overlay | `@floating-ui/dom` + `offset` + `autoUpdate` (uso realista) | **6.7 kB** |
| Virtual scroll | `cdk/scrolling` suelto | **9.2 kB** |
| Virtual scroll | `cdk/scrolling` **marginal si ya tomaste `cdk/overlay`** | **~0.04 kB** |

Dos matices que se documentan porque son contraintuitivos:

- **El overlay del CDK no tree-shakea.** El import mínimo y el completo miden
  23 872 y 23 916 bytes: todo vive en `_overlay-module-chunk.mjs` + `scrolling.mjs`
  y entra entero. No existe "solo uso lo que necesito".
- **Punto a favor del CDK, y es real:** como el overlay ya arrastra `scrolling.mjs`
  entero, quien acepta el CDK obtiene el virtual scroll prácticamente gratis
  (+40 bytes). Es el mejor argumento de esa vía y se registra aquí para que no se
  redescubra como si fuera nuevo.
- Si la app del consumidor es zoneless/signals y **no usaba rxjs**, el CDK se lo
  mete: overlay pasa de 23.9 → **31.4 kB**. Floating UI no se mueve (6.7 kB en
  ambos escenarios: no tiene dependencias de framework).

### Hallazgo 2 — el decisivo: acoplamiento de calendario

`@angular/cdk` está acoplado **1:1 al major de Angular**:

| versión | peers |
|---|---|
| `@angular/cdk@22.1.0` | `@angular/core ^22 \|\| ^23`, `@angular/common`, `@angular/platform-browser`, `rxjs ^6.5.3 \|\| ^7.4.0` · deps: `tslib`, `parse5` |
| `@angular/cdk@20.2.14` | `@angular/core ^20 \|\| ^21`, `rxjs …` |

Con nuestro suelo `^20 || ^21 || ^22` (ADR-007) eso implica: peer
`@angular/cdk: ^20 || ^21 || ^22`, major de CDK **clavado** al major de Angular del
consumidor, compilar contra el mínimo común denominador y **una matriz de 3 majores
de CDK que testear**, que se amplía con cada release de Angular. Es la tensión de
TypeScript (ADR-006) repetida, pero trasladada a **todos** nuestros usuarios en vez
de solo a nosotros.

Además `rxjs` pasaría a ser **peer obligatorio** de una librería que hoy no lo tiene
(es solo devDep). Una librería que se presenta como signals-native y zoneless
obligando a instalar rxjs es una contradicción visible en el `package.json` del
consumidor.

**Contrapunto honesto, verificado:** `createOverlayRef` **ya existe en CDK 20.2.14**,
así que la API funcional moderna sí está disponible en todo el rango. La tensión es
de matriz de soporte, no de API rota. No se exagera.

`@floating-ui/dom@1.8.0`: **`peerDependencies` — ninguna**. Deps: `@floating-ui/core`
+ `@floating-ui/utils`, mismo repo y autor. `sideEffects: false`. Angular 23, 24 o 25
no la tocan.

### Hallazgo 3 — el que decide: el CDK no resuelve la accesibilidad

Evidencia directa del código publicado de `@angular/cdk@22.1.0`, no de blogs:

```
fesm2022/listbox.mjs   → 0 ocurrencias de "virtual"
fesm2022/scrolling.mjs → 0 atributos aria-*, 0 "activedescendant"
```

`cdk/scrolling` es un motor de scroll y reciclado de nodos: **cero a11y**.
`cdk/listbox` implementa el patrón ARIA y mantiene el activo a la vista con un
**`scrollIntoView` plano sobre el elemento de la opción** — que exige que ese
elemento **exista en el DOM**. Los dos módulos no se conocen entre sí.

El problema real —`aria-activedescendant` apuntando a un `id` que puede no existir
porque está virtualizado fuera de vista— **no lo resuelve nadie de fábrica**. Ese
trabajo lo montamos igual, elijamos la vía que elijamos. El CDK ahorra el *scroll*,
no el *scroll correcto*.

Y hay un cierre adicional: **`cdk/listbox` es inutilizable para nosotros aunque
quisiéramos**. Sus imports reales incluyen `NG_VALUE_ACCESSOR` de `@angular/forms`
y rxjs, con `NgModule` ×4, `@Input` ×14, `@Output` ×2, `ContentChildren` ×2 y
`NgZone` ×2: viola cinco innegociables de CLAUDE.md a la vez y añadiría un cuarto
peer. El patrón listbox lo escribimos nosotros en **ambas vías**.

### Hallazgo 4 — `@angular/aria` existe, y hoy no es opción

Angular 22 estrenó `@angular/aria` (primitivas ARIA headless signals-native:
Combobox, Listbox, con `activeDescendant()` y `scrollActiveItemIntoView()`). Es
competencia directa de `@aegisui/cdk` y hay que vigilarla. Hoy queda descartada:

```
@angular/aria@22.1.0  peers: { "@angular/cdk": "22.1.0",   ← pin EXACTO
                               "@angular/core": "^22 || ^23" }
primera release real: v21 (sept 2025) · 283 319 descargas/mes
```

Pin exacto de CDK + suelo `^22` = incompatible con nuestro `^20`. Y su documentación
**no menciona virtual scroll**: usa overflow normal + `scrollActiveItemIntoView()`,
lo que confirma el Hallazgo 3. **Se revisa cuando nuestro suelo llegue a `^22`**, no
antes.

### Hallazgo 5 — la plataforma ya resuelve la mitad, y hay que usarla

Antes de aceptar cualquier dependencia hay que preguntar qué hace ya el navegador
(SPEC §8: no reinventar lo que la plataforma hace bien). Estado real hoy:

Estado según el dataset **`web-features` 3.34.2** (publicado 2026-07-24), que es la
fuente autoritativa de Baseline. **Se consultó el dato, no los artículos**: varios
blogs afirman "anchor positioning es Baseline 2026", y el dataset dice otra cosa.

| Capacidad | API nativa | `baseline` | ¿Nos sirve? |
|---|---|---|---|
| Capa superior, z-index, cierre por Esc/clic-fuera, restauración de foco | **Popover API** (`popover`, `popovertarget`) | **`"low"`** (*newly available*) desde **2025-01-27** | **Sí, se adopta** (ver abajo) |
| Anclaje + colisión de viewport (flip, fallbacks) | `anchor-name`, `position-anchor`, `anchor()`, `@position-try` | **`false`** — *limited availability*, **no es Baseline** | **No** |

Dos consecuencias, y son las que afinan esta decisión:

1. **La Popover API se adopta y elimina trabajo, no lo añade.** Nos ahorra construir
   portal, gestión de `z-index`, _light dismiss_, orden de cierre entre overlays
   apilados y restauración de foco — que era justo la parte donde `@angular/cdk`
   ofrecía valor real frente a Floating UI. Con la plataforma cubriendo eso, el
   argumento a favor del CDK se estrecha todavía más.
2. **La colisión sigue necesitando JS, y por más margen del que parecía.** El
   anclaje nativo **no es Baseline en absoluto** (`baseline: false`): está en
   *limited availability*. Ni el anclaje ni el flip son opción para una librería
   cuyo suelo admite apps de la era Angular 20. Y un desplegable que **no** hace
   flip no se degrada con elegancia: se dibuja fuera de la pantalla. Fallo
   funcional, no cosmético.

**Decisión consciente sobre la Popover API:** es `"low"` (*newly available*), no
*widely available* — lo será hacia mediados de 2027. Se adopta igualmente y el
motivo se deja escrito: los tres motores la implementaron hace ya tiempo (Chrome
114, Safari 17, Firefox 125), lleva **18 meses** en Baseline, y la alternativa
—portal propio con gestión de `z-index`, *light dismiss* y restauración de foco a
mano— es **más** riesgo, no menos: es reimplementar mal lo que el navegador hace
bien. Es la única concesión de este ADR a algo que no es *widely available*, y se
toma con el dato delante, no por descuido.

Por eso Floating UI se aprueba para **lo que la plataforma aún no cubre de forma
segura**, no para "posicionar" en general.

### Condición de salida — verificable, no una nota de buenas intenciones

La dependencia nace con caducidad prevista. Para que eso no sea prosa, se define
en **dos mitades mecánicas**:

**(a) Que se pueda retirar — se verifica en CADA build.** El test de frontera del
contrato ([`docs/contracts/cdk/overlay.md`](../contracts/cdk/overlay.md) §Criterios
de aceptación): el `.d.ts` construido de `@aegisui/cdk` no contiene ninguna
referencia a `@floating-ui/*`. Mientras esté verde, retirar la dependencia es un
cambio **no rompedor**. Ésta es la mitad que puede pudrirse, y por eso es la que
vive en CI.

**(b) Cuándo hay que retirarla — se comprueba con un comando, contra el dataset
autoritativo de Baseline.** Sin instalar nada:

```bash
curl -sL https://unpkg.com/web-features/data.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const{features}=JSON.parse(s);const f=features['anchor-positioning'].status;console.log('baseline =',JSON.stringify(f.baseline),'| high:',f.baseline_high_date??'—');process.exit(f.baseline==='high'?0:1)})"
```

Sale **0** cuando `anchor-positioning` alcanza Baseline *widely available*: ese es
el disparador para reabrir este ADR, medir de nuevo y retirar `@floating-ui/dom`.
Hoy sale **1** (`baseline: false`), verificado al escribir esto.

**No se mete en CI a propósito:** dependería de la red y convertiría un cambio
externo en un build roto sin que nadie haya tocado nada. Es una revisión, no un
raíl. Va aquí, con el comando exacto, para que no dependa de que alguien recuerde
cómo se comprobaba.

### Salud de los proyectos (2026-08-02)

| | `angular/components` | `floating-ui/floating-ui` |
|---|---|---|
| Estrellas | 25 038 | 32 686 |
| Issues abiertos | 1 355 | 56 |
| Descargas/mes | `@angular/cdk` 16.5 M | `@floating-ui/dom` **369 M** |
| Licencia | MIT | MIT |
| Cadencia | patch semanal, tags LTS por major | 1.8.0 (2026-07-11); 1.x estable desde 2022 |

Los dos están sanos. La diferencia real es el **bus factor**: Google frente a un
equipo pequeño. Es el único riesgo genuino de Floating UI, y se mitiga con el
criterio de vendorizabilidad (ver §Criterio general, punto 6).

---

## Decisión

### 1. La regla nueva sustituye a "cero deps runtime salvo `@angular/*`"

> **Cero dependencias runtime con acoplamiento de framework.** Una dependencia
> runtime entra solo si pasa **los ocho criterios** de §Criterio general y tiene
> **ADR propio**. Pertenecer a `@angular/*` no da acceso: `@angular/cdk` está
> explícitamente rechazada por este ADR.

La regla vieja era una aproximación que aprobaba `@angular/cdk` (23.9 kB, atada al
calendario de Angular, con rxjs de propina) y habría prohibido `@floating-ui/dom`
(6.7 kB, sin peers, agnóstica). Justo al revés de lo que queríamos.

### 2. `@floating-ui/dom` — APROBADA para el posicionamiento de overlay

Motivos, en orden de peso:

1. **Agnóstica de framework: cero `peerDependencies`.** No nos ata a ningún
   calendario de releases. Es la razón principal, no el tamaño.
2. **Tree-shakeable de verdad**, verificado midiendo: 4.3 kB solo
   `computePosition`, 5.7 kB con `flip`+`shift`+`size`, 6.7 kB con el uso realista
   completo. El import mínimo **sí** pesa menos que el completo (el del CDK no).
3. **Resuelve un problema de dominio duro y aburrido**: geometría de colisión de
   viewport. Reescribirla sería irresponsable; mantenerla, un impuesto perpetuo.
4. **No aporta accesibilidad ni semántica.** Posiciona un rectángulo respecto de
   otro y nada más. Toda la a11y sigue siendo nuestra — que es como debe ser
   (Hallazgo 3).
5. **Cubre solo lo que la plataforma todavía no cubre** (Hallazgo 5), y con
   condición de salida escrita.

**Alcance exacto de lo aprobado:** `computePosition` + los middleware `offset`,
`flip`, `shift`, `size` + `autoUpdate`. **La capa superior, el cierre y la
restauración de foco NO son suyos: son de la Popover API nativa.** Añadir más
middleware (`inline`, `autoPlacement`, `arrow`…) es una ampliación de alcance que
se mide contra el presupuesto de `size-limit` antes de entrar.

### 3. Entra como `dependencies`, no como `peerDependency`

En `packages/cdk/package.json`, con **versión exacta** (CLAUDE.md):

```json
"dependencies": { "@floating-ui/dom": "1.8.0", "tslib": "^2.3.0" }
```

Y **solo en `@aegisui/cdk`**. `@aegisui/ui` no la ve: el posicionamiento es brain,
no skin.

El criterio aplicado es "si el consumidor nunca la importa directamente →
`dependency`; si podría → `peer`". Aquí se cumple la primera rama, y por tres
razones, no por una:

1. **No la importa nunca, y eso lo garantizamos activamente: el contrato prohíbe
   filtrar tipos de Floating UI en nuestra API pública.** El `placement` se expone
   como unión de strings **propia** (`AegisPlacement`), no como el tipo `Placement`
   de la librería; no se aceptan arrays de `Middleware` desde fuera. Si algún día
   quisiéramos exponer middleware del consumidor, **eso convertiría la dependencia
   en `peer`** y exige volver a este ADR. Queda escrito para que el cambio sea
   consciente.
2. **No hay riesgo de singleton.** Son funciones puras sin estado global, sin
   contexto ni DI. Dos copias desperdician bytes; nunca rompen comportamiento. Es
   exactamente lo contrario de rxjs o Angular, donde duplicar rompe `instanceof` e
   inyección — que es el motivo por el que *esas* son peers.
3. **Un `peer` trasladaría al consumidor una instalación manual sin darle nada a
   cambio**: no puede elegir versión útilmente (no la usa) y solo gana un paso de
   setup y un warning si lo olvida.

**Coste aceptado, explícito:** versión exacta + `dependencies` puede duplicar la
librería (~6 kB) si el consumidor fija una 1.x incompatible por su cuenta. En la
práctica npm/pnpm deduplican, porque nuestro `1.8.0` satisface los rangos `^1.x`
habituales. Se acepta; si aparece duplicación real reportada, se reabre.

**Requisito para el CLI (modo copia-fuente, estilo shadcn):** el código copiado
importa `@floating-ui/dom`, así que `aegisui add select` **debe** declararla y
ofrecer instalarla. Es un requisito nuevo del `cli` que nace de esta decisión y no
puede quedarse implícito.

### 4. Virtual scroll — APLAZADO fuera de v1. No es un olvido

**v1 no virtualiza.** El comportamiento es: **cap de ~100 resultados visibles** +
mensaje "afina la búsqueda", especificado como comportamiento observable en
[`docs/contracts/cdk/listbox.md`](../contracts/cdk/listbox.md).

Qué perdemos, exactamente: listas de >~500 opciones mostradas **sin filtrar**
pagan un pico de layout/paint al abrir. Por debajo de ~300 opciones no hay
diferencia medible. Y ese caso ya es un fallo de UX antes que de rendimiento.

Qué ganamos, y por qué es la opción técnicamente superior para v1:

1. **`aria-activedescendant` apunta siempre a un nodo que existe.** El bug más
   difícil de un combobox deja de ser posible **por construcción**, no por cuidado.
2. `scrollIntoView` sobre la opción activa funciona sin coreografía de
   "desvirtualiza → espera al render → escribe el atributo".
3. `aria-setsize`/`aria-posinset` los calcula el navegador. Nada que mantener a
   mano ni que se desincronice.
4. El typeahead recorre DOM real.
5. **Y esta es específica de nuestra arquitectura de CI:** los 6 gates DOM de §9.2
   analizan HTML renderizado. Con virtualización ese snapshot es **una porción
   arbitraria de la lista**: `a11y`, `keyboard`, `contrast` y `target-size`
   auditarían 10 de 1 000 opciones y pasarían en verde. Eso es exactamente el
   **verde falso** que SPEC §13 prohíbe. Virtualizar en v1 obligaría a rediseñar la
   estrategia de gates a la vez que se estrena el componente más complejo del set.

**Es una ampliación futura conocida, no una carencia.** Llegará con la **tabla de
datos (Pro)**, donde miles de filas visibles a la vez sí lo justifican, el patrón
ARIA es `grid` (no `listbox` + `activedescendant`) y el diseño correcto es un
primitivo propio de `@aegisui/cdk`.

> **Aviso para quien lo encuentre "roto" dentro de seis meses:** añadir
> `@angular/cdk` para virtualizar el Select **está prohibido por este ADR**. No es
> una omisión que se pueda arreglar por la vía rápida: es una decisión con datos.
> Si el caso de uso aparece de verdad, el camino es un primitivo propio con su
> contrato y su resolución del problema `activedescendant`, no una dependencia.

### 5. Criterio general para futuras dependencias runtime

Una candidata entra **solo si cumple los ocho**. Uno que falle, fuera.

| # | Criterio | Cómo se verifica | `@angular/cdk` |
|---|---|---|---|
| 1 | **Sin acoplamiento de framework**: cero peers sobre Angular, rxjs u otro framework. Su calendario no puede tocar el nuestro. | leer `peerDependencies` publicadas | ❌ falla |
| 2 | **Tree-shakeable de verdad**: ESM, `sideEffects: false`, y **medido** (import mínimo < import completo). | método de §Método | ❌ falla (mínimo = completo) |
| 3 | **Coste medido y presupuestado**: kB gzip con el método de este ADR, y línea propia en `size-limit`. | `pnpm size` | ❌ 23.9 kB > presupuesto entero |
| 4 | **Problema de dominio duro**, no conveniencia: algoritmo o matemática que sería irresponsable reescribir. Nunca utilidades, helpers ni azúcar sintáctico. | juicio, argumentado en el ADR | ✅ cumple |
| 5 | **No aporta a11y ni semántica.** La accesibilidad es nuestra siempre. Una dep que "trae el patrón ARIA resuelto" es **sospechosa, no un ahorro**: nos ata en la superficie donde menos podemos ceder control. | inspección del código publicado | ⚠️ lo aparenta sin serlo (Hallazgo 3) |
| 6 | **Vendorizable**: superficie pequeña, sin estado, sin acoplamiento; si el proyecto muere podemos copiarla. Estimar ese coste **antes** de aceptarla. | estimación en el ADR | ❌ invendorizable |
| 7 | **Licencia permisiva** (MIT/ISC/BSD/Apache-2.0), compatible con core MIT. | `package.json` + LICENSE | ✅ MIT |
| 8 | **ADR propio** + entrada en `size-limit` + soporte en el `cli` si afecta al modo copia-fuente. | revisión de PR | — |

Criterio 5 dicho al revés, porque es el que más contraintuitivo resulta: **que una
dependencia traiga accesibilidad no es un punto a favor.** Es la superficie donde
nuestro producto se juega la credibilidad y donde una dep nos haría rehenes de su
interpretación del estándar. Preferimos deps tontas y deterministas.

### 6. Consecuencias verificadas sobre los gates

Medido hoy, sobre `dist/` real (no estimado):

**`peer-floor`: no le afecta.** Línea base verde: `2 FESM analizados, minVersion
máximo = 17.2.0 ≤ 20.0.0`. El `minVersion` sale **exclusivamente** de las
_partial declarations_ de Angular que finaliza el linker del consumidor (ADR-007);
`@floating-ui/dom` es ESM plano sin participación del linker. Añadirla **no puede**
subir ese número.

**`size-limit`: no rompe el presupuesto… pero solo porque NO PUEDE VERLO. Eso es un
punto ciego y se corrige.** Línea base: `@aegisui/cdk` 3.52 kB / 15 kB;
`@aegisui/ui` 8.58 kB / 10 kB.

La configuración usa `@size-limit/file` sobre `dist/packages/*/fesm2022/*.mjs`, y
ng-packagr **deja externas las dependencias declaradas**. Verificado en el artefacto
real: el FESM de `@aegisui/ui` contiene `import { AegisButton, … } from '@aegisui/cdk'`
— por eso sus 8.58 kB **no** incluyen los 3.52 kB del cdk. `@floating-ui/dom`
aparecerá igual, como `import … from '@floating-ui/dom'`, y aportará **0 bytes** a la
cifra medida. El presupuesto seguiría verde mientras el consumidor paga ~6 kB más.
Verde falso de manual (SPEC §13).

**Alcance exacto del punto ciego: no es futuro, ya está vivo hoy.** No afecta solo a
Floating UI — afecta **a Button, Input y Switch ahora mismo**:

| Lo que mide el presupuesto | Lo que paga el consumidor |
|---|---|
| `@aegisui/ui` = **8.58 kB** | `@aegisui/ui` + `@aegisui/cdk` = **~12.1 kB** |
| `@aegisui/cdk` = **3.52 kB** | (el cdk se cuenta dos veces arriba: una sola vez, 12.1 kB en total) |

Un consumidor que instala `@aegisui/ui` para usar el Button **siempre** arrastra el
`@aegisui/cdk`, y **ninguna entrada de `.size-limit.json` cubre esa suma**. Los dos
presupuestos miden paquetes sueltos; nadie mide el paquete instalado. Floating UI no
crea el agujero: lo hace visible y lo agranda ~6.7 kB.

Corrección, obligatoria y **acoplada al PR de implementación**:

- Añadir a `.size-limit.json` una entrada que mida **el coste real del consumidor**:
  bundle de `@aegisui/ui` + `@aegisui/cdk` **con** `@floating-ui/dom` incluida y
  Angular externo. Requiere `@size-limit/esbuild` como **devDependency** (permitido:
  la regla de este ADR es sobre runtime).
- Presupuesto que se fija ahora, con la medición de hoy: **12 kB** para la entrada de
  `cdk`+Floating UI (3.5 kB actuales + 6.7 kB + ~1.8 kB de margen para el primitivo),
  expresado en **gzip** (ver discrepancia de unidades abajo). Subirlo exige nota en
  el PR, nunca en silencio.
- **Las dos direcciones, como cualquier gate de §9.2 (ADR-013).** Un presupuesto que
  nunca se ha visto fallar no está verificado: es exactamente el error que este mismo
  ADR acaba de encontrar en el gate `contracts` (§7). La entrada nueva llega con su
  canario: una configuración gemela apuntando al mismo bundle con un límite
  deliberadamente **inferior** al tamaño real, que **debe** salir en rojo. Si algún
  día pasa en verde, `size-limit` ha dejado de medir y hay que enterarse en el acto.
  Se ejecuta como los demás: verde sobre el presupuesto real, rojo sobre el canario.
- **No se añade la entrada en este PR**: hoy el cdk no importa Floating UI, así que
  mediría un bundle sin ella y pasaría en verde sin objetivo real — la definición
  exacta del verde falso que §13 prohíbe. Se añade en el mismo PR que la
  implementación, cuando ya haya algo que medir.

Los presupuestos actuales (15 kB cdk / 10 kB ui) **no se tocan**: siguen midiendo
nuestro código, que es lo que miden bien.

**Discrepancia de unidades detectada al medir, registrada para no repetirla:** las
entradas de `.size-limit.json` se llaman `"… (fesm2022, gzip)"` pero `size-limit`
reporta `brotlied` — es su compresión por defecto, y la configuración nunca pidió
gzip. Los números de este ADR son **gzip** (más conservadores: brotli comprime algo
más), así que el presupuesto de 12 kB es seguro, pero el nombre de las entradas
miente sobre lo que miden. La entrada nueva **declarará su compresión de forma
explícita**, y renombrar o corregir las dos existentes es un cambio aparte: tocar
`gzip`/`brotli` mueve las cifras de entradas ya en verde y merece su propio PR
consciente, no un arreglo de paso.

### 7. Los contratos de primitivos headless tienen su propia reconciliación

Este ADR obliga a escribir contratos de primitivos de `cdk` (`overlay`,
`listbox`) que **nunca tendrán un componente `aegis-*`**. `reconcile()` no sirve
para ellos: busca `@Component` con selector `aegis-*`.

La salida cómoda —dejarlos en un directorio que el gate no mira— se **descarta**:
el resultado sería correcto (no hay nada que reconciliar) pero el método es
exactamente el que este repo evita, y deja un punto ciego. Se le da al gate **la
regla del caso**, no se esconde el caso del gate.

`reconcilePrimitives()` (en `scripts/check-contracts.mjs`) reconcilia
`packages/cdk/src/lib/<name>/` con `docs/contracts/cdk/<name>.md`, con las mismas
asimetrías de ADR-020 (primitivo sin contrato = deuda siempre; contrato huérfano
= válido solo si declara estado pendiente; marcador que caduca solo). Lo no
trivial es que un primitivo está cubierto por **dos** sitios legítimos:

1. su contrato en `docs/contracts/cdk/` — headless puro, sin piel homónima
   (`overlay`: lo usarán Select, Combobox, Popover y Tooltip);
2. el contrato del **componente homónimo** de `docs/contracts/` cuando el
   primitivo es su brain y ese contrato documenta brain y skin a la vez. Es el
   caso real de `button`, `input` y `switch`: exigirles contrato propio en `cdk/`
   inventaría deuda inexistente y duplicaría documentación ya escrita.

Cubierto en las dos direcciones sobre fixtures (ADR-013), con los dos casos:
`good/cdk/lib/fixture-good-primitive/` (caso 1), `good/cdk/lib/fixture-good/`
(caso 2), un contrato pendiente en `good/docs/contracts/cdk/`, y en `bad/` un
primitivo sin contrato más un contrato huérfano sin declarar.

**Hallazgo colateral, arreglado aquí:** al sabotear los fixtures para comprobar
que el raíl mordía, el gate salió **verde**. Las salvaguardas anti-verde-falso
vivían dentro de `bad()`, y `run.mjs` solo exige que `bad()` devuelva algo no
vacío — así que cada salvaguarda se contaba como "violación detectada" y dejaba
el gate en verde justo cuando avisaba de haber perdido cobertura. Verde falso
**dentro del propio mecanismo anti-verde-falso**. Afectaba también a las
salvaguardas preexistentes de `ui`. Corregido con un canal propio, `coverage()`,
que `run.mjs` trata como bloqueante. Solo `contracts.mjs` usaba ese patrón; los
otros cinco gates no están afectados.

La lección de proceso, que es la que vale: **una salvaguarda anti-verde-falso no
está verificada hasta que se rompe el fixture a propósito y se ve el rojo.**

### 8. El gate `coverage` y los primitivos headless: la exención se DECLARA

`coverage` (ADR-022) exige que cada contrato declare su `## Matriz visual
representativa` y que cada fila nombre una historia existente. Un primitivo
headless **no renderiza nada**: no tiene apariencia, ni historias, ni matriz que
declarar. Pero dejarlo fuera por omisión sería repetir el error de §7 con otro
disfraz — y esta vez con una consecuencia peor.

**La exención es una afirmación, no un silencio:**

```
**Sin matriz visual:** primitivo headless, no renderiza
```

| Caso | Veredicto |
|---|---|
| Sin matriz y **sin declarar** nada | ❌ violación — puede ser un olvido |
| Declara headless y **no** renderiza | ✅ exento |
| Declara headless y **sí** renderiza | ❌ violación — **puerta trasera** |
| Declara headless **y** matriz a la vez | ❌ violación — incoherente |

**Por qué la tercera fila es la que sostiene todo.** Si la exención se concediera
solo por estar escrita, cualquier componente con apariencia podría copiar esa
línea y saltarse el gate `coverage` entero — exactamente el agujero que ese gate
existe para tapar. Por eso `contractRenders()` la desmiente con dos señales
independientes: que exista una historia cuyo id **pertenezca** a ese contrato (el
separador es `--`, no una subcadena cualquiera), o que exista el fuente del
componente en `packages/ui/src/lib/<name>/`.

Y de regalo, **la exención caduca sola**, igual que `(pendiente)` de ADR-022 y
que el marcador de ADR-020: el día que un primitivo headless gane piel e
historias, su marcador pasa a ser violación **automáticamente**. Nadie tiene que
acordarse de retirarlo.

Verificado en las dos direcciones sobre fixtures (`good/` declara una exención
legítima; `bad/` tiene `fixture-bad-fake-headless.md`, que se exime **mintiendo**
porque tiene historia propia) y con sabotaje sobre objetivos **reales**: añadir el
marcador a `docs/contracts/button.md` —un componente que sí renderiza— pone el
gate en rojo.

---

## Consecuencias

- **La regla de dependencias deja de ser una aproximación.** Ocho criterios
  verificables sustituyen a "salvo `@angular/*`", que aprobaba lo peor.
- **`@angular/cdk` queda rechazada con datos**, no por gusto. Quien quiera reabrirlo
  necesita rebatir los Hallazgos 1–3, no solo preferir el CDK.
- **`@angular/aria` queda en vigilancia**, con condición de revisión explícita
  (suelo en `^22`).
- **La Popover API nativa es la base del overlay**, no un portal propio ni el del
  CDK. Menos código nuestro, menos dependencia, y el comportamiento de capa superior
  y cierre lo garantiza el navegador.
- **`@floating-ui/dom` nace con condición de salida escrita** (Hallazgo 5). No es
  una dependencia permanente: es un puente hasta que `@position-try` sea
  ampliamente disponible.
- El `cli` gana un requisito: declarar e instalar `@floating-ui/dom` en modo
  copia-fuente.
- `size-limit` gana una entrada que mide lo que el consumidor paga de verdad, no
  solo lo que pesan nuestros ficheros. El punto ciego queda documentado por si
  aparece otra dependencia externa.
- **No se abre ningún contrato de piel (`select`, `combobox`) hasta que los
  contratos de los primitivos de `cdk` estén aprobados.**

---

## Método (reproducible)

```bash
npm i @angular/cdk@22.1.0 @floating-ui/dom@1.8.0 esbuild
esbuild entry.js --bundle --minify --format=esm \
  --external:@angular/core --external:@angular/common \
  --external:@angular/platform-browser --external:@angular/forms \
  --external:tslib --external:rxjs --external:rxjs/operators \
  --outfile=out.js && gzip -9c out.js | wc -c
```

`peerDependencies` y `dependencies` leídas del registry npm; salud de repos vía API
de GitHub; descargas vía `api.npmjs.org/downloads/point/last-month`. El Hallazgo 3
es `grep` sobre los `fesm2022/*.mjs` del tarball publicado de `@angular/cdk@22.1.0`.

**Advertencia sobre las cifras:** los FESM de ng-packagr son _partial declarations_
que finaliza el linker del consumidor, así que el tamaño real en una app varía unos
pocos %. La comparación relativa (3.6×) se mantiene.

**Discrepancia registrada:** se manejó en la discusión una cifra de "<3 kB gzip"
para Floating UI. No se reproduce en ninguna configuración medida: `computePosition`
**a solas**, sin ningún middleware, ya son **4.27 kB** gzip; con
`flip`+`shift`+`size`, **5.72 kB**. La cifra de referencia de este ADR es **6.7 kB**
(uso realista, con `offset` y `autoUpdate`). Se documenta para que el presupuesto de
`size-limit` no se fije sobre un número que no se sostiene.
