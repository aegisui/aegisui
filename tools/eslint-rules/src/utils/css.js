/**
 * Utilidades para recorrer el AST de `@eslint/css` (basado en css-tree).
 */

const SKIP_KEYS = new Set(['loc', 'parent']);

/** Nodos hijo directos (con `.type`) de un nodo del AST CSS. */
export function childNodes(node) {
  const out = [];
  if (!node || typeof node !== 'object') {
    return out;
  }
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }
    const value = node[key];
    if (!value || typeof value !== 'object') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && child.type) {
          out.push(child);
        }
      }
    } else if (value.type) {
      out.push(value);
    } else if (typeof value.forEach === 'function') {
      value.forEach((child) => {
        if (child && child.type) {
          out.push(child);
        }
      });
    }
  }
  return out;
}

/** Recorre `node` y todos sus descendientes (incluido él mismo), aplicando `fn`. */
export function walkNode(node, fn) {
  if (!node || typeof node !== 'object') {
    return;
  }
  fn(node);
  for (const child of childNodes(node)) {
    walkNode(child, fn);
  }
}

/** Texto fuente del fichero CSS bajo análisis. */
export function getCssText(context) {
  const sc = context.sourceCode ?? (context.getSourceCode && context.getSourceCode());
  if (!sc) {
    return '';
  }
  return typeof sc.getText === 'function' ? sc.getText() : (sc.text ?? '');
}
