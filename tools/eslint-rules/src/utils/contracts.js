import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, parse } from 'node:path';

/**
 * Localiza el directorio `docs/contracts` subiendo desde `fromFile`. Cae de vuelta
 * a `cwd/docs/contracts`. Devuelve `null` si no lo encuentra.
 */
export function findContractsDir(fromFile, cwd) {
  let dir = fromFile ? dirname(fromFile) : cwd;
  if (dir) {
    const rootPath = parse(dir).root;
    for (;;) {
      const candidate = join(dir, 'docs', 'contracts');
      if (existsSync(candidate)) {
        return candidate;
      }
      if (dir === rootPath) {
        break;
      }
      const parent = dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }
  if (cwd) {
    const candidate = join(cwd, 'docs', 'contracts');
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Nombre de componente a partir de un selector `aegis-*`. */
export function selectorToName(selector) {
  return String(selector).replace(/^aegis-/, '');
}

/** Nombre de componente a partir del fichero CSS (`button.component.css` -> `button`). */
export function componentNameFromCssFile(filename) {
  return basename(String(filename))
    .replace(/\.css$/i, '')
    .replace(/\.component$/i, '');
}

/** Conjunto de tokens `--aegis-*` declarados (mencionados) en un fichero de contrato. */
export function declaredTokens(contractFile) {
  const set = new Set();
  const text = readFileSync(contractFile, 'utf8');
  for (const match of text.matchAll(/--aegis-[a-z0-9-]+/gi)) {
    set.add(match[0]);
  }
  return set;
}
