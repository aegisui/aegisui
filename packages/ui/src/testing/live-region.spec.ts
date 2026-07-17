import { describe, expect, it } from 'vitest';
import { expectLiveRegionMutatesInPlace } from './live-region';

describe('expectLiveRegionMutatesInPlace', () => {
  it('resuelve cuando el cambio es characterData (texto existente mutado)', async () => {
    const span = document.createElement('span');
    const text = document.createTextNode('');
    span.appendChild(text);
    document.body.appendChild(span);

    await expect(
      expectLiveRegionMutatesInPlace(span, () => {
        text.data = 'Formato inválido';
      }),
    ).resolves.toBeUndefined();

    document.body.removeChild(span);
  });

  it('lanza cuando el cambio RECREA el nodo de texto (childList) — el patrón que dispara el anuncio doble en NVDA', async () => {
    const span = document.createElement('span');
    document.body.appendChild(span);

    await expect(
      expectLiveRegionMutatesInPlace(span, () => {
        span.appendChild(document.createTextNode('Formato inválido'));
      }),
    ).rejects.toThrow(/recreó su contenido/);

    document.body.removeChild(span);
  });
});
