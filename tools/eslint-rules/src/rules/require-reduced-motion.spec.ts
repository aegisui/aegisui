import { createCssRuleTester } from '../testing/rule-tester';
import { requireReducedMotion } from './require-reduced-motion.js';

const ruleTester = createCssRuleTester();

ruleTester.run('require-reduced-motion', requireReducedMotion, {
  valid: [
    // Sin animación, no aplica.
    '.btn { color: var(--aegis-x); }',
    // Con animación y su bloque reduced-motion.
    '.btn { transition: opacity 200ms ease; } @media (prefers-reduced-motion: reduce) { .btn { transition: none; } }',
  ],
  invalid: [
    {
      code: '.btn { transition: opacity 200ms ease; }',
      errors: [{ messageId: 'requireReducedMotion' }],
    },
    {
      code: '.spin { animation: rotate 1s linear infinite; }',
      errors: [{ messageId: 'requireReducedMotion' }],
    },
  ],
});
