import { createTsRuleTester } from '../testing/rule-tester';
import { noNgmodule } from './no-ngmodule.js';

const ruleTester = createTsRuleTester();

ruleTester.run('no-ngmodule', noNgmodule, {
  valid: [
    '@Component({ standalone: true }) class Foo {}',
    'class Plain {}',
    // `NgModule` como identificador normal (no decorador) no dispara la regla.
    'const NgModule = 1; export const x = NgModule;',
  ],
  invalid: [
    {
      code: '@NgModule({}) class AppModule {}',
      errors: [{ messageId: 'noNgModule' }],
    },
    {
      code: '@NgModule() class AppModule {}',
      errors: [{ messageId: 'noNgModule' }],
    },
  ],
});
