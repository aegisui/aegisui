import { noNgmodule } from './rules/no-ngmodule.js';

/**
 * Plugin ESLint con las reglas propias de Aegis UI (§7 del SPEC).
 *
 * Se irán añadiendo las 11 reglas. El flat config raíz lo importa por ruta
 * relativa (no por nombre de paquete) para no depender de un build previo.
 *
 * @type {import('eslint').ESLint.Plugin}
 */
export const plugin = {
  meta: {
    name: '@aegisui/eslint-plugin',
    version: '0.0.0',
  },
  rules: {
    'no-ngmodule': noNgmodule,
  },
};

export default plugin;
