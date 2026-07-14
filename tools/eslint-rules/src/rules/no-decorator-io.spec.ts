import { createTsRuleTester } from '../testing/rule-tester';
import { noDecoratorIo } from './no-decorator-io.js';

const ruleTester = createTsRuleTester();

ruleTester.run('no-decorator-io', noDecoratorIo, {
  valid: [
    'class C { readonly value = input(0); }',
    'class C { readonly changed = output(); }',
    '@Component({}) class C {}',
  ],
  invalid: [
    {
      code: 'class C { @Input() value; }',
      errors: [{ messageId: 'noDecoratorIo', data: { name: 'Input', fn: 'input' } }],
    },
    {
      code: 'class C { @Output() changed; }',
      errors: [{ messageId: 'noDecoratorIo', data: { name: 'Output', fn: 'output' } }],
    },
    {
      code: "class C { @Input('alias') value; }",
      errors: [{ messageId: 'noDecoratorIo' }],
    },
  ],
});
