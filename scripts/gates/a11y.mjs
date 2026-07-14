/**
 * Gate `a11y` (§9.2, WCAG 2.2 AA — SPEC §8). Analiza el DOM renderizado de los
 * fixtures buscando violaciones de semántica ARIA que un `<button>` real no
 * debería tener: un rol que anula su semántica interactiva, o la ausencia de
 * nombre accesible.
 *
 * Dos direcciones (ADR-013): sobre `good/` no encuentra nada; sobre `bad/`
 * encuentra las violaciones deliberadas (role="presentation" + sin nombre). Si
 * `bad()` deja de devolver violaciones, el raíl a11y ha muerto.
 */
import { read, parseHtml, isInteractive, accessibleName } from './lib/util.mjs';
import { rendered } from './lib/fixtures.mjs';

// Roles que borran la semántica interactiva: ponerlos sobre un botón lo saca del
// árbol de accesibilidad como control.
const ROLE_HIDES_INTERACTION = new Set([
  'presentation',
  'none',
  'heading',
  'img',
  'paragraph',
  'separator',
  'generic',
]);

function inspect(htmlPath) {
  const doc = parseHtml(read(htmlPath));
  const violations = [];
  for (const el of doc.elements) {
    if (!isInteractive(el)) {
      continue;
    }
    const role = (el.attrs.role || '').toLowerCase();
    if (ROLE_HIDES_INTERACTION.has(role)) {
      violations.push(
        `<${el.tag}> con role="${role}": anula su semántica interactiva. Quita el role o usa uno interactivo.`,
      );
    }
    if (!accessibleName(el, doc)) {
      violations.push(
        `<${el.tag}> sin nombre accesible: añade texto, aria-label o un aria-labelledby que apunte a un id existente.`,
      );
    }
  }
  return violations;
}

export default {
  id: 'a11y',
  phase: 3,
  badExpectation: 'rol que anula la interacción + sin nombre accesible',
  good: () => inspect(rendered.good.light),
  bad: () => inspect(rendered.bad.light),
};
