import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findContractsDir, selectorToName } from '../utils/contracts.js';

/**
 * Regla `contract-exists` (§6, §7): todo componente de `ui` (`@Component` con
 * selector) debe tener su `docs/contracts/<name>.md`. Ningún componente se
 * implementa sin contrato aprobado.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const contractExists = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Todo componente de ui debe tener su docs/contracts/<name>.md (§6).',
    },
    messages: {
      missingContract:
        'El componente `{{selector}}` no tiene contrato en docs/contracts/{{name}}.md. Ningún componente de ui se implementa sin contrato aprobado (§6).',
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
          return;
        }
        const selectorProp = arg.properties.find(
          (p) =>
            p.type === 'Property' &&
            ((p.key.type === 'Identifier' && p.key.name === 'selector') ||
              (p.key.type === 'Literal' && p.key.value === 'selector')),
        );
        if (
          !selectorProp ||
          selectorProp.value.type !== 'Literal' ||
          typeof selectorProp.value.value !== 'string'
        ) {
          return;
        }
        const selector = selectorProp.value.value;
        const name = selectorToName(selector);
        const contractsDir = findContractsDir(context.filename, context.cwd);
        const contractFile = contractsDir ? join(contractsDir, `${name}.md`) : null;
        if (!contractFile || !existsSync(contractFile)) {
          context.report({ node, messageId: 'missingContract', data: { selector, name } });
        }
      },
    };
  },
};
