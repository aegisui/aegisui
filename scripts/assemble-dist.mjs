/**
 * Ensambla los artefactos publicables en `dist/packages/*` (issue #19).
 *
 * Los builders dejan cada paquete a medias para PUBLICAR:
 *
 *  1. **Falta la fuente.** `ng-packagr` (ui, cdk) emite FESM + tipos y nada más.
 *     Pero ADR-001 dice que el código fuente viaja SIEMPRE con el paquete, y
 *     ADR-003 (distribución dual) se apoya en eso: el CLI copia-fuente busca
 *     `node_modules/@aegisui/ui/src/lib` en el proyecto del consumidor. Sin
 *     `src/` en el artefacto, `npx aegisui add <x>` no encuentra nada — que es
 *     exactamente el fallo de #19.
 *  2. **Falta el `package.json`** en `cli` e `icons` (sus builders son `tsc` a
 *     secas, que no lo copia). Un artefacto sin manifiesto no es publicable.
 *  3. **El bin del CLI no queda ejecutable.**
 *  4. **`workspace:^` sobrevive al artefacto.** `@aegisui/ui` declara
 *     `"@aegisui/cdk": "workspace:^"` en `peerDependencies`. Ese protocolo es de
 *     pnpm y solo se resuelve DENTRO del workspace: empaquetar `dist/packages/ui`
 *     falla en seco (`ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`), y si llegara a
 *     publicarse, un consumidor con npm/yarn se encontraría un rango inválido. Se
 *     reescribe al rango real del grupo lockstep (ADR-008).
 *
 * Este script cierra los tres huecos. NO se limita a copiar: verifica lo que
 * deja, porque la lección de #19 es justamente que nadie comprobaba el
 * artefacto (ver `scripts/publish-smoke.mjs`, que lo prueba desde FUERA).
 */
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO_ROOT, 'dist', 'packages');

/**
 * Paquetes que publican su FUENTE además del bundle (ADR-001). `ui` es el que
 * el CLI lee (ADR-003); `cdk` viaja igual porque la piel copiada depende de él
 * y queremos que el consumidor pueda leerlo y depurarlo.
 */
const SHIPS_SOURCE = ['ui', 'cdk'];

/** Paquetes cuyo builder no copia el manifiesto (tsc a secas). */
const NEEDS_MANIFEST = ['cli', 'icons'];

/** No se publica lo que es andamiaje de desarrollo, no producto. */
const isDevOnly = (p) => /\.(spec|stories)\.ts$/.test(p) || p.includes('__snapshots__');

const problems = [];

function assembleSource(pkg) {
  const from = join(REPO_ROOT, 'packages', pkg, 'src');
  const to = join(DIST, pkg, 'src');
  if (!existsSync(from)) {
    problems.push(`${pkg}: no existe packages/${pkg}/src`);
    return;
  }
  cpSync(from, to, {
    recursive: true,
    filter: (src) => !isDevOnly(src),
  });

  // Verificación, no fe ciega: la fuente tiene que haber llegado de verdad.
  const libDir = join(to, 'lib');
  if (!existsSync(libDir)) {
    problems.push(`${pkg}: src/lib no llegó al artefacto`);
  }
}

function assembleManifest(pkg) {
  const from = join(REPO_ROOT, 'packages', pkg, 'package.json');
  const to = join(DIST, pkg, 'package.json');
  if (!existsSync(from)) {
    problems.push(`${pkg}: no existe packages/${pkg}/package.json`);
    return;
  }
  if (!existsSync(join(DIST, pkg))) {
    mkdirSync(join(DIST, pkg), { recursive: true });
  }
  cpSync(from, to);
}

/**
 * Reescribe `workspace:<rango>` a un rango publicable. El grupo lockstep
 * (tokens/cdk/ui/icons, ADR-008) comparte versión, así que `workspace:^` pasa a
 * `^<versión>`. Sin esto, ni siquiera se puede empaquetar el artefacto.
 */
function resolveWorkspaceProtocol(pkg) {
  const manifestPath = join(DIST, pkg, 'package.json');
  if (!existsSync(manifestPath)) {
    return;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let rewrote = false;

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = manifest[field];
    if (!deps) {
      continue;
    }
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== 'string' || !range.startsWith('workspace:')) {
        continue;
      }
      const localName = name.replace(/^@aegisui\//, '');
      const localManifest = join(REPO_ROOT, 'packages', localName, 'package.json');
      if (!existsSync(localManifest)) {
        problems.push(`${pkg}: ${field}.${name} usa workspace: y no encuentro su paquete local`);
        continue;
      }
      const { version } = JSON.parse(readFileSync(localManifest, 'utf8'));
      const spec = range.slice('workspace:'.length); // '^', '~', '*' o una versión
      deps[name] = spec === '*' || spec === '' ? version : `${spec}${version}`;
      rewrote = true;
    }
  }

  if (rewrote) {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  // Verificación: no puede quedar NINGÚN workspace: en el artefacto.
  if (readFileSync(manifestPath, 'utf8').includes('workspace:')) {
    problems.push(`${pkg}: el manifiesto publicable todavía contiene "workspace:"`);
  }
}

/** Todo lo publicable, para la pasada de `workspace:`. */
const PUBLISHABLE = ['tokens', 'cdk', 'ui', 'icons', 'cli'];

for (const pkg of SHIPS_SOURCE) {
  assembleSource(pkg);
}
for (const pkg of NEEDS_MANIFEST) {
  assembleManifest(pkg);
}
for (const pkg of PUBLISHABLE) {
  resolveWorkspaceProtocol(pkg);
}

// El bin del CLI tiene que ser ejecutable y conservar su shebang.
const cliBin = join(DIST, 'cli', 'cli.js');
if (existsSync(cliBin)) {
  if (!readFileSync(cliBin, 'utf8').startsWith('#!')) {
    problems.push('cli: cli.js perdió el shebang');
  }
  chmodSync(cliBin, 0o755);
} else {
  problems.push('cli: falta dist/packages/cli/cli.js');
}

// Comprobación de que el artefacto de `ui` sirve para lo que promete ADR-003:
// el CLI busca `<paquete>/src/lib/<componente>/`, así que tiene que existir al
// menos un componente con su CSS ahí.
const uiLib = join(DIST, 'ui', 'src', 'lib');
if (existsSync(uiLib)) {
  const button = join(uiLib, 'button');
  for (const f of ['button.component.ts', 'button.component.css']) {
    if (!existsSync(join(button, f))) {
      problems.push(`ui: el artefacto no incluye src/lib/button/${f} (ADR-003 seguiría roto)`);
    }
  }
  // Y que NO viajen specs ni stories (son andamiaje, no producto).
  for (const f of ['button.component.spec.ts', 'button.stories.ts']) {
    if (existsSync(join(button, f))) {
      problems.push(`ui: el artefacto incluye ${f}, que no debería publicarse`);
    }
  }
}

if (problems.length > 0) {
  console.error('❌ assemble-dist: el artefacto no quedó publicable:');
  for (const p of problems) {
    console.error(`   - ${p}`);
  }
  process.exit(1);
}

console.log(
  `✅ assemble-dist: fuente publicada en ${SHIPS_SOURCE.join(', ')}; ` +
    `manifiesto en ${NEEDS_MANIFEST.join(', ')}; bin del CLI ejecutable.`,
);

// Deja constancia de qué se ensambló, para que el smoke lo pueda contrastar.
writeFileSync(
  join(DIST, 'assemble-report.json'),
  `${JSON.stringify({ shipsSource: SHIPS_SOURCE, needsManifest: NEEDS_MANIFEST }, null, 2)}\n`,
);
