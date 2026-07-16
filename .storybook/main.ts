import type { StorybookConfig } from '@storybook/angular-vite';
import { mergeConfig } from 'vite';

/**
 * Vía Vite/esbuild (@storybook/angular-vite), no la clásica webpack
 * (@storybook/angular): esa última solo compila a través de internals de
 * @angular-devkit/build-angular, que Angular tiene deprecado en favor de
 * @angular/build — el mismo builder que ya usa apps/sandbox. Ver ADR-017.
 */
const config: StorybookConfig = {
  stories: ['../packages/ui/src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      tsconfig: '.storybook/tsconfig.json',
      // Las stories ya declaran argTypes a mano; compodoc no aporta nada aquí
      // y evita sumar esa dependencia solo para autodocs.
      compodoc: false,
    },
  },
  // Resuelve @aegisui/cdk vía los "paths" de .storybook/tsconfig.json (Vite 8
  // los lee de forma nativa con resolve.tsconfigPaths).
  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      resolve: { tsconfigPaths: true },
    });
  },
};

export default config;
