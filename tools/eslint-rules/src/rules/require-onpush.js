/**
 * Regla `require-onpush` (§7): todo `@Component` debe declarar
 * `changeDetection: ChangeDetectionStrategy.OnPush`.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const requireOnpush = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Todo @Component debe declarar ChangeDetectionStrategy.OnPush (§7).',
    },
    messages: {
      missingOnPush:
        'Todo @Component debe declarar `changeDetection: ChangeDetectionStrategy.OnPush` (§7).',
    },
    schema: [],
  },
  create(context) {
    return {
      Decorator(node) {
        const expr = node.expression;
        if (!expr || expr.type !== 'CallExpression') {
          return;
        }
        const callee = expr.callee;
        if (!callee || callee.type !== 'Identifier' || callee.name !== 'Component') {
          return;
        }
        const arg = expr.arguments[0];
        if (!arg || arg.type !== 'ObjectExpression') {
          context.report({ node, messageId: 'missingOnPush' });
          return;
        }
        const prop = arg.properties.find(
          (p) =>
            p.type === 'Property' &&
            ((p.key.type === 'Identifier' && p.key.name === 'changeDetection') ||
              (p.key.type === 'Literal' && p.key.value === 'changeDetection')),
        );
        if (!prop) {
          context.report({ node, messageId: 'missingOnPush' });
          return;
        }
        const value = prop.value;
        const isOnPush =
          value.type === 'MemberExpression' &&
          value.property.type === 'Identifier' &&
          value.property.name === 'OnPush';
        if (!isOnPush) {
          context.report({ node: prop, messageId: 'missingOnPush' });
        }
      },
    };
  },
};
