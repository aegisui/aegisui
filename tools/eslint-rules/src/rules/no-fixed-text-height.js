import { walkNode } from '../utils/css.js';

/**
 * Regla `no-fixed-text-height` (§7, WCAG 1.4.12): prohíbe alturas fijas en px en
 * `height`/`min-height`, que recortan el texto cuando el usuario fuerza el
 * espaciado. Las unidades relativas (rem/em/…) y `auto`/`%` sí se permiten.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noFixedTextHeight = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe alturas fijas en px (height/min-height) que rompen el espaciado de texto (WCAG 1.4.12).',
    },
    messages: {
      noFixedTextHeight:
        'Altura fija `{{value}}` en `{{prop}}` rompe WCAG 1.4.12 (espaciado de texto). Usa unidades relativas o deja que el contenido dicte la altura.',
    },
    schema: [],
  },
  create(context) {
    return {
      Declaration(node) {
        const prop = String(node.property).toLowerCase();
        if (prop !== 'height' && prop !== 'min-height') {
          return;
        }
        let bad = null;
        walkNode(node.value, (n) => {
          if (!bad && n.type === 'Dimension' && String(n.unit).toLowerCase() === 'px') {
            bad = n;
          }
        });
        if (bad) {
          context.report({
            node: bad,
            messageId: 'noFixedTextHeight',
            data: { value: bad.value + bad.unit, prop },
          });
        }
      },
    };
  },
};
