import { walkNode } from '../utils/css.js';

/**
 * Regla `require-reduced-motion` (§7): si el CSS de un componente usa
 * `animation`/`transition`, debe existir al menos un bloque
 * `@media (prefers-reduced-motion: reduce)`. Es la comprobación automatizable del
 * requisito; que el bloque neutralice correctamente la animación es
 * responsabilidad del contrato/tests.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const requireReducedMotion = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Toda animation/transition debe ir acompañada de un bloque @media (prefers-reduced-motion) (§7).',
    },
    messages: {
      requireReducedMotion:
        'Hay animation/transition pero ningún bloque `@media (prefers-reduced-motion: reduce)`. Toda animación debe respetar reduced-motion (§7).',
    },
    schema: [],
  },
  create(context) {
    let motionNode = null;
    let hasReducedMotion = false;
    return {
      Declaration(node) {
        const prop = String(node.property).toLowerCase();
        if (
          !motionNode &&
          (prop === 'transition' ||
            prop.startsWith('transition-') ||
            prop === 'animation' ||
            prop.startsWith('animation-'))
        ) {
          motionNode = node;
        }
      },
      Atrule(node) {
        if (String(node.name).toLowerCase() !== 'media' || !node.prelude) {
          return;
        }
        walkNode(node.prelude, (n) => {
          if (n.type === 'Feature' && String(n.name).toLowerCase() === 'prefers-reduced-motion') {
            hasReducedMotion = true;
          }
        });
      },
      'StyleSheet:exit'() {
        if (motionNode && !hasReducedMotion) {
          context.report({ node: motionNode, messageId: 'requireReducedMotion' });
        }
      },
    };
  },
};
