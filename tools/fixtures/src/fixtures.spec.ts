import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cdkBeforeUi } from '../../eslint-rules/src/rules/cdk-before-ui.js';
import { contractExists } from '../../eslint-rules/src/rules/contract-exists.js';
import { noDarkInComponentCss } from '../../eslint-rules/src/rules/no-dark-in-component-css.js';
import { noDecoratorIo } from '../../eslint-rules/src/rules/no-decorator-io.js';
import { noFixedTextHeight } from '../../eslint-rules/src/rules/no-fixed-text-height.js';
import { noLiteralDesignValues } from '../../eslint-rules/src/rules/no-literal-design-values.js';
import { noNgmodule } from '../../eslint-rules/src/rules/no-ngmodule.js';
import { noOutlineNone } from '../../eslint-rules/src/rules/no-outline-none.js';
import { requireOnpush } from '../../eslint-rules/src/rules/require-onpush.js';
import { requireReducedMotion } from '../../eslint-rules/src/rules/require-reduced-motion.js';
import { tokensDeclaredInContract } from '../../eslint-rules/src/rules/tokens-declared-in-contract.js';
import {
  createCssRuleTester,
  createTsRuleTester,
} from '../../eslint-rules/src/testing/rule-tester';

/**
 * Fixtures de regresión de la Fase 1 (§13).
 *
 * `good/` es un componente mínimo deliberadamente correcto; `bad/` es el mismo
 * componente deliberadamente roto, violando una a una las reglas de §7
 * expresables en TS/CSS. `bad-tokens/` cubre en solitario la dirección de
 * fallo de `tokens-declared-in-contract` (un contrato que SÍ existe pero está
 * incompleto — distinto del caso "no hay contrato" de `bad/`).
 *
 * Cada bloque de abajo demuestra las DOS direcciones del gate: pasa sobre
 * good/, falla con mensaje accionable sobre bad/. Un gate que solo demuestra
 * una dirección no está terminado (§13). Estos fixtures no se publican y se
 * quedan en el repo para siempre: si alguien afloja una regla, esto se pone
 * rojo.
 */

const here = dirname(fileURLToPath(import.meta.url));
const GOOD_TS = join(here, '../good/src/lib/fixture-good/fixture-good.component.ts');
const GOOD_CSS = join(here, '../good/src/lib/fixture-good/fixture-good.component.css');
const BAD_TS = join(here, '../bad/src/lib/fixture-bad/fixture-bad.component.ts');
const BAD_CSS = join(here, '../bad/src/lib/fixture-bad/fixture-bad.component.css');
const BAD_TOKENS_CSS = join(
  here,
  '../bad-tokens/src/lib/fixture-bad-tokens/fixture-bad-tokens.component.css',
);

const read = (path: string) => readFileSync(path, 'utf8');

const tsTester = createTsRuleTester();
const cssTester = createCssRuleTester();

// --- Reglas TypeScript --------------------------------------------------

tsTester.run('fixtures/no-ngmodule', noNgmodule, {
  valid: [{ code: read(GOOD_TS), filename: GOOD_TS }],
  invalid: [{ code: read(BAD_TS), filename: BAD_TS, errors: [{ messageId: 'noNgModule' }] }],
});

tsTester.run('fixtures/no-decorator-io', noDecoratorIo, {
  valid: [{ code: read(GOOD_TS), filename: GOOD_TS }],
  // @Input() y @Output(): dos violaciones en el mismo fichero.
  invalid: [{ code: read(BAD_TS), filename: BAD_TS, errors: 2 }],
});

tsTester.run('fixtures/require-onpush', requireOnpush, {
  valid: [{ code: read(GOOD_TS), filename: GOOD_TS }],
  invalid: [{ code: read(BAD_TS), filename: BAD_TS, errors: [{ messageId: 'missingOnPush' }] }],
});

tsTester.run('fixtures/cdk-before-ui', cdkBeforeUi, {
  valid: [{ code: read(GOOD_TS), filename: GOOD_TS }],
  invalid: [{ code: read(BAD_TS), filename: BAD_TS, errors: [{ messageId: 'cdkTerritory' }] }],
});

tsTester.run('fixtures/contract-exists', contractExists, {
  valid: [{ code: read(GOOD_TS), filename: GOOD_TS }],
  invalid: [{ code: read(BAD_TS), filename: BAD_TS, errors: [{ messageId: 'missingContract' }] }],
});

// --- Reglas CSS ----------------------------------------------------------

cssTester.run('fixtures/no-literal-design-values', noLiteralDesignValues, {
  valid: [{ code: read(GOOD_CSS), filename: GOOD_CSS }],
  // #ffffff (bloque .dark) + #3b82f6 (color) + border-radius px + height px.
  invalid: [{ code: read(BAD_CSS), filename: BAD_CSS, errors: 4 }],
});

cssTester.run('fixtures/no-dark-in-component-css', noDarkInComponentCss, {
  valid: [{ code: read(GOOD_CSS), filename: GOOD_CSS }],
  invalid: [{ code: read(BAD_CSS), filename: BAD_CSS, errors: [{ messageId: 'noDark' }] }],
});

cssTester.run('fixtures/no-outline-none', noOutlineNone, {
  valid: [{ code: read(GOOD_CSS), filename: GOOD_CSS }],
  invalid: [{ code: read(BAD_CSS), filename: BAD_CSS, errors: [{ messageId: 'noOutlineNone' }] }],
});

cssTester.run('fixtures/no-fixed-text-height', noFixedTextHeight, {
  valid: [{ code: read(GOOD_CSS), filename: GOOD_CSS }],
  invalid: [
    { code: read(BAD_CSS), filename: BAD_CSS, errors: [{ messageId: 'noFixedTextHeight' }] },
  ],
});

cssTester.run('fixtures/require-reduced-motion', requireReducedMotion, {
  valid: [{ code: read(GOOD_CSS), filename: GOOD_CSS }],
  invalid: [
    { code: read(BAD_CSS), filename: BAD_CSS, errors: [{ messageId: 'requireReducedMotion' }] },
  ],
});

cssTester.run('fixtures/tokens-declared-in-contract', tokensDeclaredInContract, {
  valid: [{ code: read(GOOD_CSS), filename: GOOD_CSS }],
  invalid: [
    {
      code: read(BAD_TOKENS_CSS),
      filename: BAD_TOKENS_CSS,
      errors: [
        {
          messageId: 'tokenNotDeclared',
          data: { token: '--aegis-fixture-border', name: 'fixture-bad-tokens' },
        },
      ],
    },
  ],
});
