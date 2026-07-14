/**
 * Regla `no-ngmodule` (§7, ADR-005): prohíbe cualquier `@NgModule`.
 *
 * Aegis UI es standalone-only y zoneless; los NgModule son exactamente la deuda
 * heredada que nos diferencia de PrimeNG. Un `@NgModule` no se discute: se rechaza.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noNgmodule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohíbe el decorador @NgModule (Angular standalone-only, ADR-005).',
    },
    messages: {
      noNgModule:
        'Prohibido @NgModule. Aegis UI es standalone-only: usa componentes/directivas standalone (ADR-005).',
    },
    schema: [],
  },
  create(context) {
    return {
      Decorator(node) {
        const expr = node.expression;
        const callee = expr && expr.type === 'CallExpression' ? expr.callee : expr;
        if (callee && callee.type === 'Identifier' && callee.name === 'NgModule') {
          context.report({ node, messageId: 'noNgModule' });
        }
      },
    };
  },
};
