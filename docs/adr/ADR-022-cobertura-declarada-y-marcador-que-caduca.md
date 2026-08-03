# ADR-022: La cobertura declarada es asimétrica; la variante no implementada se declara, no se avisa

## Contexto

### 1. `coverage` nació correcto y estructuralmente rojo

El gate `coverage` (ADR previo al mismo PR, ver `scripts/gates/coverage.mjs`)
comprueba que cada variante declarada en la `## Matriz visual representativa` de
un contrato nombre una historia que **exista**. Cierra un agujero real: el
contrato del Input declaraba **16 snapshots representativos y solo 7 tenían
historia**, y ningún gate lo echó de menos porque ninguno sabía qué debía
existir.

Pero al encenderlo aparece la misma tensión que ADR-020 encontró en `contracts`,
y por el mismo motivo. SPEC §6 exige que el contrato se apruebe **en un PR
aparte, antes** de escribir código. Bajo ese flujo, **toda variante nace
declarada y sin implementar**: el PR de contrato deja `coverage` rojo por
definición.

Un gate rojo durante el flujo **normal** no es un raíl: es ruido. Y el ruido se
normaliza — que es exactamente el mecanismo por el que un verde deja de
significar algo. La versión roja del mismo problema.

### 2. La salida fácil está prohibida

"Que una fila sin historia sea un aviso" choca de frente con una regla
innegociable (CLAUDE.md: _"Poner una regla en `'warn'`: los raíles bloquean, no
avisan"_). Un aviso se ignora, y una variante prometida y nunca implementada se
queda para siempre sin que nadie la vea.

Tampoco vale "declarar solo lo implementado": vaciaría la matriz de su función,
que es decir qué **debe** cubrirse, no qué se cubre ya.

## Decisión

### 1. La política es ASIMÉTRICA

| Caso | Significado | Veredicto |
|---|---|---|
| Fila **sin historia nombrada** | No se puede saber qué la cubre. Contar filas contra historias no demuestra nada. | ❌ **Siempre** violación |
| Fila con historia que **existe** | Cubierta. | ✅ Pasa |
| Fila con historia que **no existe**, sin declarar | Variante prometida y no cubierta, sin que nadie sepa si está en curso. | ❌ Violación |
| Fila con historia ausente, **declarada** `(pendiente)` | **Trabajo en curso**: el estado normal y transitorio entre el PR del contrato y el de su implementación. | ✅ Pasa |
| **Marcador obsoleto** (`(pendiente)` con la historia ya existente) | La excepción sobrevivió a su motivo. | ❌ **Siempre** violación |

### 2. El marcador CADUCA SOLO

Es lo que hace que esto no sea un `'warn'` disfrazado. La forma es exacta y va
**pegada al id**, no suelta en la fila:

```markdown
| 5 | inset | md | `componentes-input--floating-relleno` (pendiente) | light | … |
```

Ligarlo al id tiene dos efectos, y los dos importan:

- Una fila que **mencione** la palabra "pendiente" en su prosa no se cuela como
  deuda declarada. La excepción se pide en una forma exacta, o no se concede
  (mismo criterio que `**Estado:** implementación pendiente` en ADR-020).
- El gate sabe **qué historia** se está esperando, y por tanto puede detectar
  cuándo aparece. En cuanto existe, dejar el marcador puesto es violación:
  **implementar OBLIGA a retirarlo**.

Sin esa caducidad, `(pendiente)` sería un silenciador permanente. Con ella, la
deuda es visible, nominal y acotada en el tiempo.

### 3. Una sola política, dos llamantes

Vive en `matrixViolations()` de `scripts/gates/coverage.mjs`, que usan el gate
sobre `docs/contracts` y el canario de fixtures. ADR-020 aprendió por las malas
que dos caminos que pueden divergir, divergen: el bug original de `contracts` fue
exactamente eso.

### 4. Los fixtures cubren lo que pueden; el resto tiene test propio

- `good/` → `fixture-good.md` declara matriz con filas cubiertas **y** una fila
  `(pendiente)`. Prueba que la excepción se reconoce.
- `bad/` → `fixture-bad-orphan.md` no declara matriz. Prueba la otra dirección.
- El **marcador obsoleto** no cabe como fixture permanente sin romper las otras
  direcciones de `bad/`, así que se cubre en
  `tools/fixtures/src/coverage-policy.spec.ts` sobre contratos de mentira — mismo
  reparto que ADR-020 hizo con su `stalePending`. Es el caso que impide que la
  excepción se pudra: merece test propio.

## Consecuencias

- **`coverage` deja de estar rojo durante el flujo normal**, pero no por relajar
  el gate: por declarar un estado que el gate entiende y que caduca solo. Solo
  con eso puede entrar en el ruleset como *required*, que es donde un raíl sirve.
- **Retirar el marcador es parte del checklist de implementación**, verificado
  por CI. No es disciplina, es el gate.
- Las **16 filas floating de `input.md`** pasan de rojo bruto a deuda declarada.
  Cuando aterrice `feat/input-floating-label` con sus 5 historias, 11 de esos
  marcadores caducarán y el PR de merge estará obligado a retirarlos; las 5
  filas restantes (relleno, notched-relleno, notched-inválido, autofill) seguirán
  declaradas hasta que se escriban sus historias. **Esa es la deuda real, ahora
  contabilizada en vez de invisible.**
- La lección de proceso, que es la cuarta vez: **un raíl que se pone rojo cuando
  el proceso correcto se está siguiendo no protege el proceso, lo estorba** —y
  acaba desactivado o ignorado. La salida no es aflojarlo: es enseñarle a
  distinguir la deuda declarada de la deuda oculta, y ponerle fecha de caducidad
  a la primera.
