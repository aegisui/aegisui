import { childNodes } from '../utils/css.js';

const LENGTH_UNITS = new Set([
  'px',
  'em',
  'rem',
  'ex',
  'ch',
  'cap',
  'ic',
  'lh',
  'rlh',
  'vw',
  'vh',
  'vi',
  'vb',
  'vmin',
  'vmax',
  'svw',
  'svh',
  'lvw',
  'lvh',
  'dvw',
  'dvh',
  'cm',
  'mm',
  'q',
  'in',
  'pt',
  'pc',
]);

const COLOR_FUNCS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
]);

/**
 * Regla `no-literal-design-values` (§5, ADR-004): en el CSS de un componente,
 * los valores de color/espaciado/radio/sombra deben salir de tokens de capa 3
 * (`var(--aegis-*)`), nunca literales.
 *
 * Cubre: colores hex (`#rrggbb`), funciones de color (rgb/hsl/oklch/…) y
 * longitudes (px/rem/em/…). No entra dentro de `var()`. Los `0`, porcentajes y
 * unidades de tiempo/ángulo no se consideran valores de diseño de este tipo.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noLiteralDesignValues = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe valores de diseño literales (color/espaciado/radio/sombra) en el CSS de un componente; usa var(--aegis-*) de capa 3 (§5, ADR-004).',
    },
    messages: {
      literal:
        'Valor de diseño literal `{{value}}`. Usa un token de capa 3: var(--aegis-*) (§5, ADR-004).',
    },
    schema: [],
  },
  create(context) {
    function inspect(node) {
      // No entrar en var(): dentro está la referencia al token, no un literal.
      if (
        node.type === 'Function' &&
        typeof node.name === 'string' &&
        node.name.toLowerCase() === 'var'
      ) {
        return;
      }
      if (node.type === 'Hash') {
        context.report({ node, messageId: 'literal', data: { value: '#' + node.value } });
      } else if (
        node.type === 'Dimension' &&
        typeof node.unit === 'string' &&
        LENGTH_UNITS.has(node.unit.toLowerCase())
      ) {
        context.report({ node, messageId: 'literal', data: { value: node.value + node.unit } });
      } else if (
        node.type === 'Function' &&
        typeof node.name === 'string' &&
        COLOR_FUNCS.has(node.name.toLowerCase())
      ) {
        context.report({ node, messageId: 'literal', data: { value: node.name + '()' } });
        return;
      }
      for (const child of childNodes(node)) {
        inspect(child);
      }
    }
    return {
      Declaration(node) {
        if (node.value) {
          inspect(node.value);
        }
      },
    };
  },
};
