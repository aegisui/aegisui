# ADR-020: La reconciliación contrato↔componente es asimétrica; el contrato huérfano se declara, no se avisa

## Contexto

### 1. El gate `contracts` llevaba dos componentes sin mirar `packages/ui`

`scripts/gates/contracts.mjs` exportaba `realPackagesViolations()` —la
comprobación "además de los fixtures" sobre los componentes reales— pero **no la
incluía en su `export default`**. `scripts/gates/run.mjs` la busca ahí
(`gate.realPackagesViolations`), así que nunca se llamaba. `contrast.mjs` sí la
incluye; `contracts.mjs` se quedó sin ella.

Consecuencia: desde la Fase 3, el gate `contracts` verificaba **solo los
fixtures**. Button e Input **nunca** se reconciliaron contra sus contratos en
CI. El job salía verde por no mirar — el verde-falso que SPEC §13 prohíbe, y
precisamente en el gate cuyo trabajo es impedir que se normalice.

Al arreglarlo se comprobó que **Button e Input reconcilian correctamente** (2
componentes ↔ 2 contratos): no había ningún desajuste oculto. El fallo era de
cobertura, no de contenido — pero llevaba dos componentes activo.

### 2. Al arreglarlo aparece una tensión de proceso real

SPEC §6 exige: _"Ningún componente se implementa sin un contrato aprobado
previamente"_, y el contrato se aprueba **en un PR aparte**, antes de escribir
código. Ese flujo existe para revisar la API y la accesibilidad **antes** de que
haya implementación que defender.

Pero el gate trataba `contrato sin componente` como violación. Con la
reconciliación real activada, **el PR de contrato siempre estaría rojo**:
**todo contrato nace huérfano por diseño**. El proceso que el SPEC exige y el
raíl que lo protege se contradecían.

Se descartó la salida fácil —hacer que los contratos viajen con la
implementación— porque elimina el motivo entero de SPEC §6: la revisión de API
antes de escribir código.

## Decisión

### 1. La reconciliación es ASIMÉTRICA

Las dos direcciones no significan lo mismo y no se tratan igual:

| Dirección | Significado | Veredicto |
|---|---|---|
| **Componente sin contrato** | Código que se adelantó a su contrato. Es **deuda**: ya existe, y nadie revisó su API. | ❌ **Siempre** violación |
| **Contrato sin componente, declarado pendiente** | **Trabajo en curso**: el estado normal y transitorio entre el PR del contrato y el de la implementación. | ✅ Pasa |
| **Contrato sin componente, sin declarar** | Contrato muerto, o marcador olvidado. Nadie sabe si está en curso. | ❌ Violación |
| **Marcador obsoleto** (pendiente, pero el componente YA existe) | La excepción sobrevivió a su motivo. | ❌ **Siempre** violación |

Solo la primera dirección protege el invariante de SPEC §6. La segunda nunca lo
protegió: protegía "sin contratos muertos", que es otro objetivo, con otra
urgencia.

### 2. El huérfano se DECLARA. No es un `'warn'`

La opción evaluada primero era "contrato-sin-componente pasa a ser un aviso, no
un fallo". **Se descartó**: choca de frente con una regla innegociable
(CLAUDE.md, _"Poner una regla en `'warn'`: los raíles bloquean, no avisan"_).
Un aviso se ignora, y un contrato huérfano olvidado se queda para siempre sin
que nadie lo vea — exactamente el mecanismo por el que se normaliza un verde
que no cubre lo que creemos.

En su lugar, la excepción **se pide explícitamente** en el contrato, en una
forma legible por máquina:

```markdown
**Estado:** implementación pendiente
```

Y —esto es lo que la hace segura— **caduca sola**: en cuanto el componente
existe, ese mismo marcador se convierte en violación (`stalePending`). Implementar
**obliga** a retirarlo. Ningún contrato puede quedarse "pendiente" para siempre
silenciando el raíl.

Sigue siendo un raíl que bloquea:

- El huérfano **sin** declarar → falla.
- El marcador **obsoleto** → falla.
- Declarar es un acto deliberado y verificado, no un default silencioso.

### 3. Una sola política, tres llamantes

La política vive en **una función**, `violations()` en
`scripts/check-contracts.mjs`, que usan sus tres consumidores: el CLI
(`node scripts/check-contracts.mjs`), el gate sobre `packages/ui`
(`realPackagesViolations()`) y el canario de fixtures (`good()`/`bad()`). El bug
original nació justo de tener dos caminos que podían divergir; ahora no pueden.

### 4. Los fixtures cubren las tres direcciones estáticas (ADR-009, ADR-013)

- `bad/` → `aegis-fixture-bad` (componente sin contrato) **y**
  `fixture-bad-orphan.md` (huérfano sin declarar). **Las dos direcciones rotas**,
  como pidió la revisión: ya no se puede romper una en silencio.
- `good/` → `fixture-good-pending.md`, un huérfano **declarado** que **pasa**.
  Es el par simétrico: prueba que la excepción se reconoce.
- `badViolations()` incluye salvaguardas anti-verde-falso explícitas: si `bad/`
  dejara de tener un componente sin contrato, o dejara de tener un huérfano sin
  declarar, el gate falla con "dirección N sin cobertura". El fixture no se
  puede "arreglar" sin que el gate lo diga.
- El **cuarto** caso (marcador obsoleto) no se puede montar como fixture
  permanente sin romper las otras direcciones de `bad/`, así que se cubre en
  `tools/fixtures/src/contracts-policy.spec.ts` sobre un repo temporal. Es el
  caso que impide que la excepción se pudra: merece test propio.

## Consecuencias

- **El gate `contracts` reconcilia de verdad `packages/ui`** desde este ADR, sin
  tocar el `name:` del job (sigue siendo `contracts`, sigue siendo *required*).
- **SPEC §6 se actualiza** con el ciclo de vida del contrato y el marcador. El
  flujo "contrato en PR aparte" **no cambia** — ahora está soportado por el raíl
  en vez de contradicho por él.
- **El PR de contrato deja de nacer rojo**, pero no por relajar el gate: por
  declarar un estado que el gate entiende y que caduca solo.
- Todo contrato nuevo (Switch, Card, Badge) nace con
  `**Estado:** implementación pendiente` y **lo pierde en el PR de su
  implementación** — la retirada del marcador es parte del checklist de
  implementación, verificada por CI.
- La lección de proceso, que es la tercera vez: **un gate solo protege lo que se
  le enseña a mirar** (ADR-018 lo dijo de los bordes; aquí es de los objetivos
  enteros). Un gate nuevo debe demostrar que **falla** sobre un objetivo real
  roto, no solo que pasa sobre uno sano.
