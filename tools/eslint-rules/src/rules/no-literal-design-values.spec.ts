import { createCssRuleTester } from '../testing/rule-tester';
import { noLiteralDesignValues } from './no-literal-design-values.js';

const ruleTester = createCssRuleTester();

ruleTester.run('no-literal-design-values', noLiteralDesignValues, {
  valid: [
    '.btn { color: var(--aegis-btn-fg); }',
    '.btn { border-radius: var(--aegis-btn-radius); }',
    '.btn { margin: 0; }',
    '.btn { width: 100%; }',
    '.btn { line-height: 1.5; }',
    // El breakpoint de un media query no es un valor de diseño de componente.
    '@media (min-width: 320px) { .btn { color: var(--aegis-x); } }',
  ],
  invalid: [
    { code: '.btn { color: #3b82f6; }', errors: [{ messageId: 'literal' }] },
    { code: '.btn { padding: 8px; }', errors: [{ messageId: 'literal' }] },
    { code: '.btn { color: rgb(0 0 0); }', errors: [{ messageId: 'literal' }] },
    { code: '.btn { border-radius: 4px; }', errors: [{ messageId: 'literal' }] },
  ],
});
