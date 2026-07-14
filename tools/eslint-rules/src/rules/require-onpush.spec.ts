import { createTsRuleTester } from '../testing/rule-tester';
import { requireOnpush } from './require-onpush.js';

const ruleTester = createTsRuleTester();

ruleTester.run('require-onpush', requireOnpush, {
  valid: [
    '@Component({ changeDetection: ChangeDetectionStrategy.OnPush }) class C {}',
    // Los decoradores que no son @Component no aplican.
    '@Directive({}) class D {}',
    '@Injectable() class S {}',
  ],
  invalid: [
    {
      code: '@Component({}) class C {}',
      errors: [{ messageId: 'missingOnPush' }],
    },
    {
      code: '@Component({ changeDetection: ChangeDetectionStrategy.Default }) class C {}',
      errors: [{ messageId: 'missingOnPush' }],
    },
    {
      code: '@Component() class C {}',
      errors: [{ messageId: 'missingOnPush' }],
    },
  ],
});
