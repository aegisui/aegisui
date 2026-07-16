import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Ficheros que el CLI copia: la PIEL que el usuario poseerá. No specs ni stories. */
function isSource(file: string): boolean {
  return /\.(ts|css)$/.test(file) && !/\.(spec|stories)\.ts$/.test(file);
}

/**
 * Localiza `.../ui/src/lib` — la fuente ÚNICA de la que lee el CLI (ADR-003: no
 * mantiene copia paralela). Subiendo desde `startDir`, prefiere el paquete
 * instalado (`@aegisui/ui` viaja con su fuente, ADR-001) y cae al monorepo (dev).
 */
export function findUiLibDir(startDir: string): string | null {
  let dir = startDir;
  for (;;) {
    for (const rel of [
      ['node_modules', '@aegisui', 'ui', 'src', 'lib'],
      ['packages', 'ui', 'src', 'lib'],
    ]) {
      const candidate = join(dir, ...rel);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

export interface AddResult {
  readonly component: string;
  readonly targetDir: string;
  readonly files: readonly string[];
}

/**
 * Copia la fuente de la piel de `<component>` (de `uiLibDir/<component>/`) a
 * `targetDir/<component>/`. Idempotente (sobrescribe). El brain (`@aegisui/cdk`)
 * y los tokens (`@aegisui/tokens`) NO se copian: son el motor compartido del que
 * la piel depende.
 */
export function addComponent(opts: {
  component: string;
  uiLibDir: string;
  targetDir: string;
}): AddResult {
  const src = join(opts.uiLibDir, opts.component);
  if (!existsSync(src)) {
    throw new Error(
      `No existe el componente "${opts.component}" en ${opts.uiLibDir}. ` +
        `¿Está bien escrito el nombre (p. ej. "button")?`,
    );
  }
  const dest = join(opts.targetDir, opts.component);
  mkdirSync(dest, { recursive: true });

  const files: string[] = [];
  for (const entry of readdirSync(src)) {
    if (isSource(entry)) {
      cpSync(join(src, entry), join(dest, entry));
      files.push(entry);
    }
  }
  if (files.length === 0) {
    throw new Error(`El componente "${opts.component}" no tiene fuentes que copiar.`);
  }
  return { component: opts.component, targetDir: dest, files };
}
