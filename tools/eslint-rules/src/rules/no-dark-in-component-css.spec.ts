import { createCssRuleTester } from '../testing/rule-tester';
import { noDarkInComponentCss } from './no-dark-in-component-css.js';

const ruleTester = createCssRuleTester();

ruleTester.run('no-dark-in-component-css', noDarkInComponentCss, {
  valid: ['.btn { color: var(--aegis-btn-fg); }', '.card { background: var(--aegis-card-bg); }'],
  invalid: [
    {
      code: '.dark .btn { color: var(--aegis-btn-fg); }',
      errors: [{ messageId: 'noDark' }],
    },
    {
      code: '@media (prefers-color-scheme: dark) { .btn { color: var(--aegis-x); } }',
      errors: [{ messageId: 'noDark' }],
    },
  ],
});
