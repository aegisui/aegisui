import { getCssText } from '../utils/css.js';

/**
 * Regla `no-dark-in-component-css` (§5.2): el CSS de un componente no puede
 * contener la palabra `dark`. El dark mode vive en los tokens de capa 2; si un
 * componente necesita nombrar `dark`, el theming está mal diseñado.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noDarkInComponentCss = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe la palabra `dark` en el CSS de un componente; el dark mode vive en los tokens de capa 2 (§5.2).',
    },
    messages: {
      noDark:
        'El CSS de un componente no puede contener la palabra `dark`. El dark mode vive en los tokens (capa 2), no en el componente (§5.2).',
    },
    schema: [],
  },
  create(context) {
    return {
      StyleSheet(node) {
        if (/dark/i.test(getCssText(context))) {
          context.report({ node, messageId: 'noDark' });
        }
      },
    };
  },
};
