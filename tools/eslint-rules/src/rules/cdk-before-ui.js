const KEYBOARD_EVENTS = new Set(['keydown', 'keyup', 'keypress']);
const FOCUS_METHODS = new Set(['focus', 'blur']);
const POSITION_METHODS = new Set(['getBoundingClientRect']);
const OBSERVERS = new Set(['IntersectionObserver', 'ResizeObserver', 'MutationObserver']);

/**
 * Regla `cdk-before-ui` (§7, ADR-002): un componente de `ui` no puede implementar
 * directamente lógica de posicionamiento, foco o teclado; esa lógica vive en
 * `@aegisui/cdk`. Heurística: se marca el uso directo de primitivas de bajo nivel
 * (addEventListener de teclado, `.focus()/.blur()`, `getBoundingClientRect`,
 * observers de layout). Si aparece un falso positivo, se discute en un issue.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const cdkBeforeUi = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'ui no puede implementar lógica de posicionamiento/foco/teclado directamente; va en cdk (ADR-002).',
    },
    messages: {
      cdkTerritory:
        'Lógica de {{kind}} (`{{api}}`) en ui. Debe vivir en @aegisui/cdk (brain/skin, ADR-002).',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') {
          return;
        }
        const method = callee.property.name;
        if (method === 'addEventListener') {
          const arg0 = node.arguments[0];
          if (
            arg0 &&
            arg0.type === 'Literal' &&
            typeof arg0.value === 'string' &&
            KEYBOARD_EVENTS.has(arg0.value.toLowerCase())
          ) {
            context.report({
              node,
              messageId: 'cdkTerritory',
              data: { kind: 'teclado', api: `addEventListener('${arg0.value}')` },
            });
          }
        } else if (FOCUS_METHODS.has(method)) {
          context.report({
            node,
            messageId: 'cdkTerritory',
            data: { kind: 'foco', api: `.${method}()` },
          });
        } else if (POSITION_METHODS.has(method)) {
          context.report({
            node,
            messageId: 'cdkTerritory',
            data: { kind: 'posicionamiento', api: `.${method}()` },
          });
        }
      },
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && OBSERVERS.has(node.callee.name)) {
          context.report({
            node,
            messageId: 'cdkTerritory',
            data: { kind: 'posicionamiento/layout', api: `new ${node.callee.name}()` },
          });
        }
      },
    };
  },
};
