/**
 * Build de @aegisui/tokens: una fuente JSON -> CSS + preset Tailwind + tipos TS.
 * Es el comando del target `build` (project.json). Cero dependencias: solo Node.
 *
 *   node scripts/build-tokens.mjs
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderTokensCss,
  renderDarkCss,
  renderTailwindPreset,
  renderTypes,
  renderIndex,
} from './lib/generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const outDir = join(pkgRoot, '..', '..', 'dist', 'packages', 'tokens');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const primitives = readJson(join(pkgRoot, 'src', 'primitives.json'));
const semantic = readJson(join(pkgRoot, 'src', 'semantic.json'));
const pkg = readJson(join(pkgRoot, 'package.json'));

mkdirSync(outDir, { recursive: true });

const artifacts = {
  'tokens.css': renderTokensCss(primitives, semantic),
  'tokens.dark.css': renderDarkCss(semantic),
  'tailwind-preset.js': renderTailwindPreset(primitives, semantic),
  'index.d.ts': renderTypes(primitives, semantic, pkg.version),
  'index.js': renderIndex(primitives, semantic, pkg.version),
};

for (const [name, content] of Object.entries(artifacts)) {
  writeFileSync(join(outDir, name), content);
}

// La raíz de publicación es dist/packages/tokens: el package.json debe viajar con
// los artefactos (sus `exports` son relativos a esta carpeta).
copyFileSync(join(pkgRoot, 'package.json'), join(outDir, 'package.json'));

console.log(`✅ tokens: ${Object.keys(artifacts).length + 1} artefactos en ${outDir}`);
