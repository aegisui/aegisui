import { mergeConfig } from 'vitest/config';
import { baseVitestConfig } from '../../vitest.base';

export default mergeConfig(baseVitestConfig, {
  test: {
    name: 'ui',
    coverage: {
      enabled: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: { lines: 90, statements: 90 },
    },
  },
});
