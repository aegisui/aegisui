# Contrato: primitivo de fixture aún no implementado

**Estado:** implementación pendiente

**Sin matriz visual:** primitivo headless, no renderiza

Contrato de un primitivo headless **que todavía no existe**. Es el estado normal
de SPEC §6 entre el PR del contrato y el de la implementación, aplicado a los
primitivos de `cdk` igual que ADR-020 lo aplica a los componentes de `ui`.

Existe como fixture para que el gate demuestre que la excepción sigue viva: si
`reconcilePrimitives()` dejara de reconocer el marcador, el PR de un contrato de
primitivo nacería siempre en rojo. Y si alguien retirara el marcador de aquí, el
canario de `good()` lo cazaría.

## Teclado

Ninguna tecla gestionada.
