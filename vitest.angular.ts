import { defineConfig, mergeConfig } from 'vitest/config';
import angularPlugin from '@analogjs/vite-plugin-angular';
import { baseVitestConfig } from './vitest.base';

// Los package.json de ui/cdk no declaran "type": "module", así que Vite bundlea
// su vitest.config como CJS y el default de Analog llega envuelto en { default }.
// Normalizamos para funcionar igual en ESM y en CJS.
const angular = ((angularPlugin as { default?: typeof angularPlugin }).default ??
  angularPlugin) as typeof angularPlugin;

/**
 * Base Vitest para paquetes con componentes/directivas Angular (ui, cdk).
 *
 * Añade a `vitest.base`:
 *   - el plugin de Analog, que compila plantillas/decoradores de Angular (AOT)
 *     dentro de Vite, para poder testear componentes reales con Vitest (SPEC §3);
 *   - entorno `jsdom` (DOM);
 *   - el setup que inicializa TestBed zoneless (`vitest.setup.angular.ts`).
 *
 * Los paquetes lo extienden y solo fijan `name` y su cobertura.
 */
export const angularVitestConfig = mergeConfig(
  baseVitestConfig,
  defineConfig({
    plugins: [angular()],
    test: {
      environment: 'jsdom',
      // `globals` permite que el auto-cleanup de @testing-library/angular
      // registre su `afterEach` (resetea TestBed entre tests). Sin esto, el
      // segundo `render` del fichero falla («TestBed already instantiated»).
      globals: true,
      setupFiles: ['../../vitest.setup.angular.ts'],
    },
  }),
);
