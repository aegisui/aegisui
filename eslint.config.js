// @ts-check
import css from '@eslint/css';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import aegis from './tools/eslint-rules/src/index.js';

/**
 * Configuración base (flat) del monorepo.
 *
 * - TS/JS: recomendado de ESLint + typescript-eslint, acotado a esas extensiones
 *   para no aplicar el parser de TS a los `.css`.
 * - `.css`: lenguaje `@eslint/css` + las reglas CSS propias de §7.
 * - `@aegisui/*`: las 11 reglas propias (ver `tools/eslint-rules/`).
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.nx/**',
      '**/.angular/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts,js,mjs,cjs}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },
  {
    // Reglas TS propias (§7), sobre el código fuente de paquetes y apps.
    files: ['packages/**/*.ts', 'apps/**/*.ts'],
    plugins: { '@aegisui': aegis },
    rules: {
      '@aegisui/no-ngmodule': 'error',
      '@aegisui/no-decorator-io': 'error',
      '@aegisui/require-onpush': 'error',
    },
  },
  {
    // Reglas CSS propias (§7), sobre el CSS de componentes.
    files: ['packages/**/*.css'],
    language: 'css/css',
    plugins: { css, '@aegisui': aegis },
    rules: {
      '@aegisui/no-literal-design-values': 'error',
      '@aegisui/no-dark-in-component-css': 'error',
      '@aegisui/no-outline-none': 'error',
      '@aegisui/no-fixed-text-height': 'error',
      '@aegisui/require-reduced-motion': 'error',
    },
  },
  prettier,
);
