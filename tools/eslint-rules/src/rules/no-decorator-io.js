/**
 * Regla `no-decorator-io` (§7, ADR-005): prohíbe los decoradores `@Input()` y
 * `@Output()`. La API de Aegis UI es signals-only: `input()`, `output()`,
 * `model()`.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noDecoratorIo = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohíbe @Input()/@Output(); usa input()/output()/model() (ADR-005).',
    },
    messages: {
      noDecoratorIo:
        'Prohibido @{{name}}(). Aegis UI es signals-only: usa la función {{fn}}() (ADR-005).',
    },
    schema: [],
  },
  create(context) {
    return {
      Decorator(node) {
        const expr = node.expression;
        const callee = expr && expr.type === 'CallExpression' ? expr.callee : expr;
        if (
          callee &&
          callee.type === 'Identifier' &&
          (callee.name === 'Input' || callee.name === 'Output')
        ) {
          const fn = callee.name === 'Input' ? 'input' : 'output';
          context.report({ node, messageId: 'noDecoratorIo', data: { name: callee.name, fn } });
        }
      },
    };
  },
};
