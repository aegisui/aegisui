import { cdkBeforeUi } from './rules/cdk-before-ui.js';
import { contractExists } from './rules/contract-exists.js';
import { noDarkInComponentCss } from './rules/no-dark-in-component-css.js';
import { noDecoratorIo } from './rules/no-decorator-io.js';
import { noFixedTextHeight } from './rules/no-fixed-text-height.js';
import { noLiteralDesignValues } from './rules/no-literal-design-values.js';
import { noNgmodule } from './rules/no-ngmodule.js';
import { noOutlineNone } from './rules/no-outline-none.js';
import { requireOnpush } from './rules/require-onpush.js';
import { requireReducedMotion } from './rules/require-reduced-motion.js';
import { tokensDeclaredInContract } from './rules/tokens-declared-in-contract.js';

/**
 * Plugin ESLint con las 11 reglas propias de Aegis UI (§7 del SPEC). Son el producto.
 *
 * El flat config raíz lo importa por ruta relativa (no por nombre de paquete)
 * para no depender de un build previo.
 *
 * @type {import('eslint').ESLint.Plugin}
 */
export const plugin = {
  meta: {
    name: '@aegisui/eslint-plugin',
    version: '0.0.0',
  },
  rules: {
    // Reglas sobre TypeScript.
    'no-ngmodule': noNgmodule,
    'no-decorator-io': noDecoratorIo,
    'require-onpush': requireOnpush,
    'contract-exists': contractExists,
    'cdk-before-ui': cdkBeforeUi,
    // Reglas sobre CSS.
    'no-literal-design-values': noLiteralDesignValues,
    'no-dark-in-component-css': noDarkInComponentCss,
    'no-outline-none': noOutlineNone,
    'no-fixed-text-height': noFixedTextHeight,
    'require-reduced-motion': requireReducedMotion,
    'tokens-declared-in-contract': tokensDeclaredInContract,
  },
};

export default plugin;
