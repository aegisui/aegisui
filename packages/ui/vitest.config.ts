import { mergeConfig } from 'vitest/config';
import { angularVitestConfig } from '../../vitest.angular';

export default mergeConfig(angularVitestConfig, {
  test: {
    name: 'ui',
    coverage: {
      enabled: true,
      include: ['src/**/*.ts'],
      // Las stories son documentación viva (Storybook), no código de librería.
      exclude: ['src/**/*.spec.ts', 'src/**/*.stories.ts'],
      thresholds: { lines: 90, statements: 90 },
    },
  },
});
