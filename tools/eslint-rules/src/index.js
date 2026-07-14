import { noDecoratorIo } from './rules/no-decorator-io.js';
import { noNgmodule } from './rules/no-ngmodule.js';
import { requireOnpush } from './rules/require-onpush.js';

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
    'no-decorator-io': noDecoratorIo,
    'require-onpush': requireOnpush,
  },
};

export default plugin;
