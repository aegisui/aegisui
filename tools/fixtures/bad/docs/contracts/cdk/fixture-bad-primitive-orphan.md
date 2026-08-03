# Contrato: primitivo de fixture que no existe (y no lo declara)

Contrato huérfano de un primitivo headless que **no existe** en
`bad/cdk/lib/` y que **no declara** `**Estado:** implementación pendiente`.

Es un contrato muerto, o un marcador que alguien olvidó poner. Objetivo rojo
permanente de la dirección 2 de `reconcilePrimitives()`. No se corrige ni se le
añade el marcador: si se lo añadieran, el gate dejaría de probar que caza esta
violación (§13).

## Teclado

Ninguna tecla gestionada.
