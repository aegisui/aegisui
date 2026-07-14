import { walkNode } from '../utils/css.js';

/**
 * Regla `no-outline-none` (§7, WCAG 2.4.7): prohíbe `outline: none` (o `0`) si la
 * misma regla no aporta un sustituto vía `:focus-visible`. Quitar el outline solo
 * es aceptable en un selector que ya distingue `:focus-visible` (p. ej.
 * `:focus:not(:focus-visible)`), donde se sustituye el indicador de foco.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noOutlineNone = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe outline:none sin sustituto de :focus-visible en la misma regla (WCAG 2.4.7).',
    },
    messages: {
      noOutlineNone:
        'outline:none sin `:focus-visible` en la misma regla rompe el foco visible (WCAG 2.4.7). Añade un indicador de foco en :focus-visible.',
    },
    schema: [],
  },
  create(context) {
    const ruleStack = [];
    return {
      Rule(node) {
        ruleStack.push(node);
      },
      'Rule:exit'() {
        ruleStack.pop();
      },
      Declaration(node) {
        const prop = String(node.property).toLowerCase();
        if (prop !== 'outline' && prop !== 'outline-style') {
          return;
        }
        let removes = false;
        walkNode(node.value, (n) => {
          if (n.type === 'Identifier' && String(n.name).toLowerCase() === 'none') {
            removes = true;
          } else if (n.type === 'Number' && String(n.value) === '0') {
            removes = true;
          }
        });
        if (!removes) {
          return;
        }
        const rule = ruleStack[ruleStack.length - 1];
        let hasFocusVisible = false;
        if (rule && rule.prelude) {
          walkNode(rule.prelude, (n) => {
            if (
              n.type === 'PseudoClassSelector' &&
              String(n.name).toLowerCase() === 'focus-visible'
            ) {
              hasFocusVisible = true;
            }
          });
        }
        if (!hasFocusVisible) {
          context.report({ node, messageId: 'noOutlineNone' });
        }
      },
    };
  },
};
