import { mergeConfig } from 'vitest/config';
import { baseVitestConfig } from '../../vitest.base';

export default mergeConfig(baseVitestConfig, {
  test: {
    name: 'cli',
  },
});
