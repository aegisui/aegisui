const KEYBOARD_EVENTS = new Set(['keydown', 'keyup', 'keypress']);
const FOCUS_METHODS = new Set(['focus', 'blur']);
const POSITION_METHODS = new Set(['getBoundingClientRect']);
const OBSERVERS = new Set(['IntersectionObserver', 'ResizeObserver', 'MutationObserver']);

/** `viewChild(...)`, `viewChild.required(...)`, `contentChild(...)`, `contentChild.required(...)`. */
function isQueryInit(init) {
  if (!init || init.type !== 'CallExpression') {
    return false;
  }
  const callee = init.callee;
  if (callee.type === 'Identifier') {
    return callee.name === 'viewChild' || callee.name === 'contentChild';
  }
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  ) {
    return (
      (callee.object.name === 'viewChild' || callee.object.name === 'contentChild') &&
      callee.property.name === 'required'
    );
  }
  return false;
}

/**
 * Regla `cdk-before-ui` (§7, ADR-002): un componente de `ui` no puede implementar
 * directamente lógica de posicionamiento, foco o teclado; esa lógica vive en
 * `@aegisui/cdk`. Heurística: se marca el uso directo de primitivas de bajo nivel
 * (addEventListener de teclado, `.focus()/.blur()`, `getBoundingClientRect`,
 * observers de layout).
 *
 * EXCEPCIÓN reconocida (no un disable puntual): `this.<campo>().focus()` /
 * `.blur()` donde `<campo>` es un `viewChild`/`viewChild.required`/`contentChild`/
 * `contentChild.required` de la MISMA clase. Es el patrón de forwarding
 * ui -> cdk (el brain, p. ej. `AegisInput`, `AegisButton`, expone su propio
 * `.focus()` real; `ui` solo reenvía la llamada a la instancia consultada, no
 * implementa foco). Reaparece en todo componente enfocable (Input, y
 * previsiblemente Switch/Select): es el patrón correcto, no una excepción del
 * Input. Un `.focus()`/`.blur()` sobre cualquier OTRA cosa (un `ElementRef`, un
 * nodo del DOM, `event.target`, …) sigue cazado: ahí sí sería lógica de foco
 * real viviendo en `ui`.
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
    const classStack = [];
    const queryFieldsByClass = new Map();
    const pendingFocusCalls = [];

    function enterClass(node) {
      classStack.push(node);
      queryFieldsByClass.set(node, new Set());
    }
    function exitClass() {
      classStack.pop();
    }
    function currentClass() {
      return classStack[classStack.length - 1] ?? null;
    }

    return {
      ClassDeclaration: enterClass,
      'ClassDeclaration:exit': exitClass,
      ClassExpression: enterClass,
      'ClassExpression:exit': exitClass,

      PropertyDefinition(node) {
        const cls = currentClass();
        if (!cls || node.key.type !== 'Identifier' || !isQueryInit(node.value)) {
          return;
        }
        queryFieldsByClass.get(cls).add(node.key.name);
      },

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
          // ¿`this.<campo>().focus()` con <campo> declarado viewChild/contentChild
          // en esta misma clase? Si sí, es forwarding al brain, no lógica de foco.
          const receiver = callee.object;
          let queriedField = null;
          if (
            receiver.type === 'CallExpression' &&
            receiver.callee.type === 'MemberExpression' &&
            receiver.callee.object.type === 'ThisExpression' &&
            receiver.callee.property.type === 'Identifier'
          ) {
            queriedField = receiver.callee.property.name;
          }
          pendingFocusCalls.push({ node, method, queriedField, cls: currentClass() });
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

      // Se resuelve al final: los campos viewChild/contentChild de una clase
      // pueden declararse DESPUÉS del método que los usa (orden de escritura
      // libre), así que hace falta haber visto la clase entera primero.
      'Program:exit'() {
        for (const { node, method, queriedField, cls } of pendingFocusCalls) {
          const queryFields = cls && queryFieldsByClass.get(cls);
          if (queriedField && queryFields && queryFields.has(queriedField)) {
            continue;
          }
          context.report({
            node,
            messageId: 'cdkTerritory',
            data: { kind: 'foco', api: `.${method}()` },
          });
        }
      },
    };
  },
};
