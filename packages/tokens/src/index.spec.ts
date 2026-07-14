import { describe, expect, it } from 'vitest';
import { AEGIS_TOKENS_VERSION } from './index';

describe('@aegisui/tokens', () => {
  it('expone la versión del paquete', () => {
    expect(AEGIS_TOKENS_VERSION).toBe('0.1.0');
  });
});
