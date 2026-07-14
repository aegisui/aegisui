import { describe, expect, it } from 'vitest';
import { AEGIS_CLI_VERSION } from './index';

describe('aegisui (cli)', () => {
  it('expone la versión del paquete', () => {
    expect(AEGIS_CLI_VERSION).toBe('0.0.0');
  });
});
