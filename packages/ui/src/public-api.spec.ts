import { describe, expect, it } from 'vitest';
import { AEGIS_UI_VERSION } from './public-api';

describe('@aegisui/ui', () => {
  it('expone la versión del paquete', () => {
    expect(AEGIS_UI_VERSION).toBe('0.0.0');
  });
});
