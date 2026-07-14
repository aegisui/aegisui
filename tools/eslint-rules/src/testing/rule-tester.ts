import css from '@eslint/css';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

// Conecta el RuleTester de ESLint al runner de Vitest (si no, no encuentra
// describe/it y no registra los casos).
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/**
 * RuleTester con el parser de TypeScript, para reglas que operan sobre el AST de
 * TS (decoradores, clases de componente, etc.).
 */
export function createTsRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  });
}

/** RuleTester con el lenguaje CSS de @eslint/css, para las reglas de estilos. */
export function createCssRuleTester(): RuleTester {
  return new RuleTester({
    plugins: { css },
    language: 'css/css',
  });
}
