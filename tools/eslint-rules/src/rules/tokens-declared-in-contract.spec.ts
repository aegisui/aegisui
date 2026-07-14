import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';
import { createCssRuleTester } from '../testing/rule-tester';
import { tokensDeclaredInContract } from './tokens-declared-in-contract.js';

const root = mkdtempSync(join(tmpdir(), 'aegis-tokens-'));
mkdirSync(join(root, 'docs', 'contracts'), { recursive: true });
writeFileSync(
  join(root, 'docs', 'contracts', 'button.md'),
  '# Contrato: Button\n\n## Tokens que consume\n- `--aegis-btn-bg`\n- `--aegis-btn-fg`\n',
);
const btnDir = join(root, 'packages', 'ui', 'src', 'lib', 'button');
mkdirSync(btnDir, { recursive: true });
const cssFile = join(btnDir, 'button.component.css');

afterAll(() => rmSync(root, { recursive: true, force: true }));

const ruleTester = createCssRuleTester();

ruleTester.run('tokens-declared-in-contract', tokensDeclaredInContract, {
  valid: [
    {
      code: '.btn { background: var(--aegis-btn-bg); color: var(--aegis-btn-fg); }',
      filename: cssFile,
    },
  ],
  invalid: [
    {
      code: '.btn { background: var(--aegis-btn-bg); border-color: var(--aegis-btn-border); }',
      filename: cssFile,
      errors: [
        {
          messageId: 'tokenNotDeclared',
          data: { token: '--aegis-btn-border', name: 'button' },
        },
      ],
    },
  ],
});
