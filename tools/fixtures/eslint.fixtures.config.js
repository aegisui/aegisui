// Config de DEMOSTRACIÓN/regresión para ejecutar las 11 reglas propias con el
// motor real de ESLint contra los fixtures good/bad y ver cada gate en rojo o
// verde. NO es el config del repo (ese vive en la raíz y scopea a packages/**);
// aquí el scope son los propios fixtures. Todas las reglas en 'error'.
//
//   Rojo (bad):   eslint --config tools/fixtures/eslint.fixtures.config.js \
//                   'tools/fixtures/bad/**/*.{ts,css}' \
//                   'tools/fixtures/bad-tokens/**/*.css'
//   Verde (good): eslint --config tools/fixtures/eslint.fixtures.config.js \
//                   'tools/fixtures/good/**/*.{ts,css}'
import css from '@eslint/css';
import tseslint from 'typescript-eslint';
import aegis from '../eslint-rules/src/index.js';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { '@aegisui': aegis },
    rules: {
      '@aegisui/no-ngmodule': 'error',
      '@aegisui/no-decorator-io': 'error',
      '@aegisui/require-onpush': 'error',
      '@aegisui/contract-exists': 'error',
      '@aegisui/cdk-before-ui': 'error',
    },
  },
  {
    files: ['**/*.css'],
    language: 'css/css',
    plugins: { css, '@aegisui': aegis },
    rules: {
      '@aegisui/no-literal-design-values': 'error',
      '@aegisui/no-dark-in-component-css': 'error',
      '@aegisui/no-outline-none': 'error',
      '@aegisui/no-fixed-text-height': 'error',
      '@aegisui/require-reduced-motion': 'error',
      '@aegisui/tokens-declared-in-contract': 'error',
    },
  },
];
