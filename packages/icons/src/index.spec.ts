import { describe, expect, it } from 'vitest';
import { AEGIS_ICONS_VERSION } from './index';

describe('@aegisui/icons', () => {
  it('expone la versión del paquete', () => {
    expect(AEGIS_ICONS_VERSION).toBe('0.1.0');
  });
});
