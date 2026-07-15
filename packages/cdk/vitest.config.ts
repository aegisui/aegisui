import { mergeConfig } from 'vitest/config';
import { angularVitestConfig } from '../../vitest.angular';

export default mergeConfig(angularVitestConfig, {
  test: {
    name: 'cdk',
    coverage: {
      enabled: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: { lines: 90, statements: 90 },
    },
  },
});
