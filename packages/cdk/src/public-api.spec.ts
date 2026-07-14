import { describe, expect, it } from 'vitest';
import { AEGIS_CDK_VERSION } from './public-api';

describe('@aegisui/cdk', () => {
  it('expone la versión del paquete', () => {
    expect(AEGIS_CDK_VERSION).toBe('0.0.0');
  });
});
