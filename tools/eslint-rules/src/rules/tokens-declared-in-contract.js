import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { childNodes } from '../utils/css.js';
import { componentNameFromCssFile, declaredTokens, findContractsDir } from '../utils/contracts.js';

/**
 * Regla `tokens-declared-in-contract` (§7): todo token `var(--aegis-*)` usado en
 * el CSS de un componente debe estar listado en su contrato. Si el contrato no
 * existe, no se comprueba nada aquí (de eso se encarga `contract-exists`).
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const tokensDeclaredInContract = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Todo token usado en el CSS debe estar listado en el contrato (§7).',
    },
    messages: {
      tokenNotDeclared:
        'El token `{{token}}` no está declarado en el contrato docs/contracts/{{name}}.md. Todo token consumido debe listarse en el contrato (§6, §7).',
    },
    schema: [],
  },
  create(context) {
    const name = componentNameFromCssFile(context.filename);
    const contractsDir = findContractsDir(context.filename, context.cwd);
    const contractFile = contractsDir ? join(contractsDir, `${name}.md`) : null;
    if (!contractFile || !existsSync(contractFile)) {
      return {};
    }
    const declared = declaredTokens(contractFile);
    return {
      Function(node) {
        if (String(node.name).toLowerCase() !== 'var') {
          return;
        }
        let tokenNode = null;
        for (const child of childNodes(node)) {
          if (child.type === 'Identifier' && String(child.name).startsWith('--')) {
            tokenNode = child;
            break;
          }
        }
        if (tokenNode && !declared.has(tokenNode.name)) {
          context.report({
            node: tokenNode,
            messageId: 'tokenNotDeclared',
            data: { token: tokenNode.name, name },
          });
        }
      },
    };
  },
};
