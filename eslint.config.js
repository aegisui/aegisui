// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import aegis from './tools/eslint-rules/src/index.js';

/**
 * Configuración base (flat) del monorepo.
 *
 * Las reglas propias de §7 del SPEC (no-ngmodule, no-literal-design-values, …)
 * se añaden aquí en un commit posterior de la Fase 1, una vez existan en
 * `tools/eslint-rules/`. Este commit solo deja el raíl base en verde.
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
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Reglas propias de Aegis UI (§7), aplicadas al código fuente de paquetes y apps.
    files: ['packages/**/*.ts', 'apps/**/*.ts'],
    plugins: { '@aegisui': aegis },
    rules: {
      '@aegisui/no-ngmodule': 'error',
    },
  },
  prettier,
);
