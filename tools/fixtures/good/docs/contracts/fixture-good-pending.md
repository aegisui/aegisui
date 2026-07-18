# Contrato: Fixture Good Pending

**Estado:** implementación pendiente

> **Fixture correcto.** Representa el estado **normal y transitorio** de todo
> contrato entre el PR que lo aprueba y el PR que lo implementa (SPEC §6:
> "ningún componente se implementa sin un contrato aprobado previamente" — así
> que **todo contrato nace huérfano**).

## Qué demuestra

Este contrato **no tiene componente** (`aegis-fixture-good-pending` no existe
en `tools/fixtures/good/src/`) y **aun así el gate `contracts` pasa**, porque
declara su estado con el marcador de arriba, en la forma exacta que el gate
reconoce:

```markdown
**Estado:** implementación pendiente
```

Es el par simétrico de `tools/fixtures/bad/docs/contracts/fixture-bad-orphan.md`
(el mismo huérfano **sin** declarar, que sí falla). Los dos juntos son lo que
prueba que la asimetría de ADR-020 funciona en las dos direcciones:

| Dirección | Fixture | Resultado esperado |
|---|---|---|
| Componente sin contrato | `bad/` (`aegis-fixture-bad`) | ❌ siempre violación — es **deuda** |
| Contrato huérfano **sin** declarar | `bad/` (`fixture-bad-orphan.md`) | ❌ violación — contrato muerto |
| Contrato huérfano **declarado** | `good/` (este fichero) | ✅ pasa — es **trabajo en curso** |
| Marcador obsoleto (componente ya existe) | verificado en `gates.spec.ts` | ❌ siempre violación — el marcador caduca solo |

## Por qué esto NO es un raíl en modo aviso

La excepción **no se concede sola**: hay que declararla explícitamente en el
contrato, y esa declaración **caduca por sí misma**. En cuanto el componente
existe, el mismo marcador se convierte en violación (`stalePending`), así que
implementar obliga a retirarlo. Un contrato no puede quedarse "pendiente" para
siempre silenciando el gate — que es justo lo que un `'warn'` sí permitiría
(CLAUDE.md: _los raíles bloquean, no avisan_).
