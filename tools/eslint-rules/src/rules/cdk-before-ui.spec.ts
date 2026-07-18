import { createTsRuleTester } from '../testing/rule-tester';
import { cdkBeforeUi } from './cdk-before-ui.js';

const ruleTester = createTsRuleTester();

ruleTester.run('cdk-before-ui', cdkBeforeUi, {
  valid: [
    'class C { readonly value = input(0); readonly doubled = computed(() => this.value() * 2); }',
    // Escuchar clicks no es territorio del cdk; el teclado sí.
    "el.addEventListener('click', handler);",
    'const y = list.map((x) => x + 1);',
    // Forwarding ui -> cdk: `brain` es un viewChild del brain (AegisInput,
    // AegisButton, …); ui reenvía la llamada, no implementa foco (ver
    // docstring de la regla — reaparece en todo componente enfocable).
    `class C {
       private readonly brain = viewChild.required(AegisInput);
       focus(): void { this.brain().focus(); }
     }`,
    `class C {
       private readonly brain = viewChild.required(AegisSwitch);
       blur(): void { this.brain().blur(); }
     }`,
    // También con contentChild y viewChild.required en orden inverso
    // (el campo declarado DESPUÉS del método que lo usa).
    `class C {
       focus(): void { this.brain().focus(); }
       private readonly brain = contentChild.required(AegisInput);
     }`,
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
      // `button` existe como campo, pero NO está inicializado con
      // viewChild/contentChild (p. ej. un ElementRef crudo): sigue cazado.
      code: `class C {
        private readonly button = inject(ElementRef);
        focus(): void { this.button().focus(); }
      }`,
      errors: [{ messageId: 'cdkTerritory', data: { kind: 'foco', api: '.focus()' } }],
    },
    {
      // Foco directo sobre el elemento nativo dentro de ui: sigue siendo
      // territorio del cdk, con o sin viewChild de por medio.
      code: `class C {
        private readonly el = viewChild.required(ElementRef);
        focus(): void { this.el().nativeElement.focus(); }
      }`,
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
