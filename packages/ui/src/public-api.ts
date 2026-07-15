/**
 * Punto de entrada público de `@aegisui/ui`.
 *
 * Paquete vacío (Fase 1: esqueleto). Los componentes estilados llegan a partir
 * de la Fase 3 (Button), siempre construidos sobre `@aegisui/cdk` y con contrato
 * aprobado. La constante mantiene el entry point con al menos un export para que
 * ng-packagr genere un bundle válido.
 */
export const AEGIS_UI_VERSION = '0.1.0';
export * from './lib/button/button.component';
