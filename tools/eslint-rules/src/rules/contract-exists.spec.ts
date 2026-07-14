import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';
import { createTsRuleTester } from '../testing/rule-tester';
import { contractExists } from './contract-exists.js';

// Árbol temporal con docs/contracts/ para ejercitar la comprobación de fichero.
const root = mkdtempSync(join(tmpdir(), 'aegis-contract-'));
mkdirSync(join(root, 'docs', 'contracts'), { recursive: true });
writeFileSync(join(root, 'docs', 'contracts', 'button.md'), '# Contrato: Button\n');
const libDir = join(root, 'packages', 'ui', 'src', 'lib');
mkdirSync(join(libDir, 'button'), { recursive: true });
mkdirSync(join(libDir, 'missing'), { recursive: true });
const withContract = join(libDir, 'button', 'button.component.ts');
const withoutContract = join(libDir, 'missing', 'missing.component.ts');

afterAll(() => rmSync(root, { recursive: true, force: true }));

const ruleTester = createTsRuleTester();

ruleTester.run('contract-exists', contractExists, {
  valid: [
    { code: "@Component({ selector: 'aegis-button' }) class B {}", filename: withContract },
    // Sin selector no se puede derivar el contrato: no aplica.
    { code: '@Component({}) class B {}', filename: withContract },
  ],
  invalid: [
    {
      code: "@Component({ selector: 'aegis-missing' }) class M {}",
      filename: withoutContract,
      errors: [
        { messageId: 'missingContract', data: { selector: 'aegis-missing', name: 'missing' } },
      ],
    },
  ],
});
