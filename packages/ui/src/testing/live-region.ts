/**
 * Raíl automático para el patrón canónico de anuncio dinámico (ADR-019, regla
 * 3): el contenido de una región `role="alert"`/`aria-live` debe mutarse por
 * `characterData` (interpolación plana), nunca recrearse por `childList`
 * (`@if`/estructural alrededor del texto) — una recreación dispara un anuncio
 * doble en NVDA aunque el `<span>` contenedor sea permanente y el texto final
 * sea idéntico. Hallado con MutationObserver sobre DOM real (Input, Fase 4) y
 * confirmado como el mismo defecto latente en el `aria-live` del Button.
 *
 * NO sustituye el pase manual con lector de pantalla (SPEC §8.4/§8.5): cachea
 * el patrón de recreación de nodo, no si el anuncio en sí suena bien. Un test
 * que pase aquí y falle al oído sigue exigiendo el pase manual.
 */
export async function expectLiveRegionMutatesInPlace(
  liveRegion: Element,
  triggerChange: () => void | Promise<void>,
): Promise<void> {
  const mutations: MutationRecord[] = [];
  const observer = new MutationObserver((records) => mutations.push(...records));
  observer.observe(liveRegion, { childList: true, subtree: true, characterData: true });

  await triggerChange();
  // Deja asentar cualquier microtarea de Angular pendiente antes de leer las mutaciones.
  await new Promise((resolve) => setTimeout(resolve, 0));
  observer.disconnect();

  const structural = mutations.filter(
    (m) => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0),
  );
  if (structural.length > 0) {
    throw new Error(
      `La región live/alert recreó su contenido (childList, ${structural.length} mutación(es)) ` +
        'en vez de solo cambiar el texto (characterData). Esto dispara un anuncio doble en NVDA ' +
        '(ADR-019): usa interpolación plana ({{ expr }}) dentro del nodo live, nunca @if/estructural.',
    );
  }
}
