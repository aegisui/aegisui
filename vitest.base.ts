import { defineConfig } from 'vitest/config';

/**
 * Configuración Vitest compartida por todos los paquetes.
 *
 * `passWithNoTests: false` es deliberado: un proyecto con target `test` pero sin
 * tests debe fallar, no pasar en silencio (misma filosofía anti-verde-falso que
 * los gates de §9.2). El entorno por defecto es `node`; los paquetes con tests de
 * componente (cdk, ui) lo cambiarán a `jsdom` cuando lleguen (Fase 3).
 */
export const baseVitestConfig = defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
