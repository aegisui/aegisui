import { createCssRuleTester } from '../testing/rule-tester';
import { noOutlineNone } from './no-outline-none.js';

const ruleTester = createCssRuleTester();

ruleTester.run('no-outline-none', noOutlineNone, {
  valid: [
    // Sustituto en la misma regla (:focus-visible).
    '.btn:focus-visible { outline: none; }',
    // Patrón accesible: quitar outline solo cuando NO es focus-visible.
    '.btn:focus:not(:focus-visible) { outline: none; }',
    // No quita el outline.
    '.btn { outline: 2px solid var(--aegis-focus); }',
  ],
  invalid: [
    { code: '.btn { outline: none; }', errors: [{ messageId: 'noOutlineNone' }] },
    { code: '.btn { outline: 0; }', errors: [{ messageId: 'noOutlineNone' }] },
  ],
});
