import { createTsRuleTester } from '../testing/rule-tester';
import { cdkBeforeUi } from './cdk-before-ui.js';

const ruleTester = createTsRuleTester();

ruleTester.run('cdk-before-ui', cdkBeforeUi, {
  valid: [
    'class C { readonly value = input(0); readonly doubled = computed(() => this.value() * 2); }',
    // Escuchar clicks no es territorio del cdk; el teclado sí.
    "el.addEventListener('click', handler);",
    'const y = list.map((x) => x + 1);',
  ],
  invalid: [
    {
      code: "el.addEventListener('keydown', handler);",
      errors: [
        {
          messageId: 'cdkTerritory',
          data: { kind: 'teclado', api: "addEventListener('keydown')" },
        },
      ],
    },
    {
      code: 'this.button().focus();',
      errors: [{ messageId: 'cdkTerritory', data: { kind: 'foco', api: '.focus()' } }],
    },
    {
      code: 'const r = new ResizeObserver(cb);',
      errors: [
        {
          messageId: 'cdkTerritory',
          data: { kind: 'posicionamiento/layout', api: 'new ResizeObserver()' },
        },
      ],
    },
    {
      code: 'const box = host.getBoundingClientRect();',
      errors: [
        {
          messageId: 'cdkTerritory',
          data: { kind: 'posicionamiento', api: '.getBoundingClientRect()' },
        },
      ],
    },
  ],
});
