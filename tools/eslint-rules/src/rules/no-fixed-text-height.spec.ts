import { createCssRuleTester } from '../testing/rule-tester';
import { noFixedTextHeight } from './no-fixed-text-height.js';

const ruleTester = createCssRuleTester();

ruleTester.run('no-fixed-text-height', noFixedTextHeight, {
  valid: ['.btn { height: auto; }', '.btn { min-height: 2.5rem; }', '.btn { height: 100%; }'],
  invalid: [
    { code: '.btn { height: 40px; }', errors: [{ messageId: 'noFixedTextHeight' }] },
    { code: '.btn { min-height: 32px; }', errors: [{ messageId: 'noFixedTextHeight' }] },
  ],
});
