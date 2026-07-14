/**
 * Gate `contrast` (§9.2, WCAG 2.2 AA 1.4.3). Sobre el DOM renderizado (con los
 * tokens ya resueltos) exige que todo par fg/bg de texto llegue a 4.5:1. Se
 * comprueba en light y en dark: un par puede cumplir en un tema y fallar en el
 * otro.
 *
 * Dos direcciones (ADR-013): `good/` cumple en ambos temas (~17:1); `bad/` no
 * llega (~2.5:1) en ninguno. Si `bad()` dejara de devolver violaciones, el
 * cálculo de contraste se habría roto.
 */
import { read, parseHtml, contrastRatio } from './lib/util.mjs';
import { rendered } from './lib/fixtures.mjs';

const AA_TEXT = 4.5;

function inspectTheme(htmlPath, theme) {
  const { elements } = parseHtml(read(htmlPath));
  const violations = [];
  for (const el of elements) {
    const fg = el.style.color;
    const bg = el.style.background || el.style['background-color'];
    if (!fg || !bg) {
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio < AA_TEXT) {
      violations.push(
        `[${theme}] <${el.tag}> ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 (< ${AA_TEXT}:1). Ajusta los tokens de color.`,
      );
    }
  }
  return violations;
}

function inspect(variant) {
  return [
    ...inspectTheme(rendered[variant].light, 'light'),
    ...inspectTheme(rendered[variant].dark, 'dark'),
  ];
}

export default {
  id: 'contrast',
  phase: 2,
  badExpectation: 'par fg/bg de texto por debajo de 4.5:1',
  good: () => inspect('good'),
  bad: () => inspect('bad'),
};
