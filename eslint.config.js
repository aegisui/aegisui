// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Configuración base (flat) del monorepo.
 *
 * Las reglas propias de §7 del SPEC (no-ngmodule, no-literal-design-values, …)
 * se añaden aquí en un commit posterior de la Fase 1, una vez existan en
 * `tools/eslint-rules/`. Este commit solo deja el raíl base en verde.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.nx/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
