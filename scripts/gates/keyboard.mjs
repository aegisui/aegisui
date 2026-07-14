/**
 * Gate `keyboard` (§9.2, WCAG 2.2 AA 2.1.1). El contrato declara qué teclas debe
 * manejar el componente (sección "## Teclado"); el DOM renderizado declara las
 * que efectivamente maneja (`data-handles`). El gate exige que se implementen
 * todas las declaradas.
 *
 * Dos direcciones (ADR-013): la fuente de verdad es SIEMPRE el contrato de
 * `good/` (Enter + Space). `good/` maneja las dos; `bad/` deja `Space` sin
 * manejar y el gate lo caza. Si `bad()` dejara de devolver violaciones, el gate
 * ya no verifica que el teclado del contrato esté implementado.
 */
import { read, parseHtml } from './lib/util.mjs';
import { rendered, goodContract } from './lib/fixtures.mjs';

/**
 * Teclas declaradas bajo "## Teclado": el primer backtick de cada ítem de lista
 * (`- \`Enter\` → ...`). Se ignora el resto de backticks de la sección (prosa
 * como `activated` o `data-handles`), que no son teclas.
 */
function declaredKeys(contractPath) {
  const text = read(contractPath);
  const section = /##\s*Teclado\s*([\s\S]*?)(?:\n##\s|$)/.exec(text);
  if (!section) {
    return [];
  }
  const keys = new Set();
  for (const line of section[1].split('\n')) {
    const m = /^\s*[-*]\s+`([A-Za-z][\w+-]*)`/.exec(line);
    if (m) {
      keys.add(m[1]);
    }
  }
  return [...keys];
}

/** Teclas que el DOM renderizado dice manejar (`data-handles="Enter Space"`). */
function handledKeys(htmlPath) {
  const { elements } = parseHtml(read(htmlPath));
  const set = new Set();
  for (const el of elements) {
    for (const k of (el.attrs['data-handles'] || '').split(/\s+/).filter(Boolean)) {
      set.add(k);
    }
  }
  return set;
}

function inspect(htmlPath) {
  const declared = declaredKeys(goodContract);
  const handled = handledKeys(htmlPath);
  return declared
    .filter((k) => !handled.has(k))
    .map(
      (k) =>
        `el contrato declara la tecla "${k}" pero el componente no la maneja (falta en data-handles).`,
    );
}

export default {
  id: 'keyboard',
  phase: 3,
  badExpectation: 'una interacción de teclado del contrato sin implementar',
  good: () => inspect(rendered.good.light),
  bad: () => inspect(rendered.bad.light),
};
