/**
 * Smoke test de PUBLICACIÓN (issue #19). Verifica los artefactos desde un
 * CONSUMIDOR EXTERNO REAL, que es la única forma válida de comprobarlo.
 *
 * ## Por qué existe
 *
 * Button, Input, Switch, Card y Badge reportaron todos "CLI copia-fuente ✓", y
 * los cinco se probaron DENTRO del monorepo — donde `findUiLibDir()` encuentra
 * `packages/ui/src/lib` por su segundo candidato. El primero,
 * `node_modules/@aegisui/ui/src/lib` (el que usa un consumidor de verdad), NUNCA
 * se ejercitó. Cinco verdes que no significaban lo que parecían.
 *
 * Al mirar el artefacto de verdad aparecieron TRES fallos que ningún test veía:
 *
 *   1. `dist/packages/ui` no incluía `src/` -> `npx aegisui add <x>` no
 *      encontraba nada fuera del monorepo (ADR-001/ADR-003 rotos).
 *   2. `cli` e `icons` no tenían `package.json` en `dist` -> ni publicables.
 *   3. `@aegisui/ui` arrastraba `"@aegisui/cdk": "workspace:^"` -> el artefacto
 *      ni siquiera se podía EMPAQUETAR fuera del workspace.
 *
 * ## Qué hace, y por qué así
 *
 * Nada de esto se puede comprobar desde dentro del repo: ahí el fallback del CLI
 * siempre salva la papeleta y pnpm siempre resuelve `workspace:`. Por eso:
 *
 *   1. `pnpm pack` de cada artefacto -> tarballs reales.
 *   2. Proyecto temporal FUERA del árbol del monorepo (`os.tmpdir()`).
 *   3. `npm install` de los tarballs — con **npm**, no pnpm, y sin workspace:
 *      así se ejercita la resolución que tendrá el consumidor.
 *   4. Comprobar que la FUENTE llegó a `node_modules` (lo que ADR-003 necesita).
 *   5. Ejecutar el binario real `aegisui add button` y comprobar qué copia.
 *   6. `tsc --noEmit` sobre un componente que importa los CINCO componentes del
 *      paquete instalado: que resuelva y tipe de verdad, no solo que exista.
 *
 * Uso: `pnpm publish-smoke` (requiere `pnpm nx run-many -t build` antes).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO_ROOT, 'dist', 'packages');

/** Lo que instala el consumidor. `icons` no entra: no lo usa el smoke. */
const PACKAGES = [
  { dir: 'tokens', tarball: 'aegisui-tokens-' },
  { dir: 'cdk', tarball: 'aegisui-cdk-' },
  { dir: 'ui', tarball: 'aegisui-ui-' },
  { dir: 'cli', tarball: 'aegisui-' },
];

const ANGULAR = ['@angular/core@22', '@angular/common@22', '@angular/compiler@22', 'typescript'];

const step = (n, msg) => console.log(`\n[${n}/6] ${msg}`);
const fail = (msg) => {
  console.error(`\n❌ publish-smoke: ${msg}`);
  process.exit(1);
};

function run(cmd, args, cwd, label) {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    console.error(error.stdout ?? '');
    console.error(error.stderr ?? '');
    fail(`${label} falló (${cmd} ${args.join(' ')})`);
    return '';
  }
}

// Anti-verde-falso: sin artefactos no hay nada que verificar -> falla ruidosamente.
for (const { dir } of PACKAGES) {
  if (!existsSync(join(DIST, dir, 'package.json'))) {
    fail(
      `no existe dist/packages/${dir}/package.json. Corre ` +
        `"pnpm nx run-many -t build && node scripts/assemble-dist.mjs" antes.`,
    );
  }
}

const workDir = mkdtempSync(join(tmpdir(), 'aegis-publish-smoke-'));
const packDir = join(workDir, 'tarballs');
const consumer = join(workDir, 'consumer');
mkdirSync(packDir, { recursive: true });
mkdirSync(join(consumer, 'src'), { recursive: true });

// El consumidor vive FUERA del monorepo a propósito: dentro, el CLI encontraría
// `packages/ui/src/lib` por fallback y el smoke sería un verde vacío.
if (consumer.startsWith(REPO_ROOT)) {
  fail('el proyecto de prueba quedó DENTRO del monorepo: el smoke no probaría nada');
}

try {
  step(1, 'Empaquetando artefactos (pnpm pack)…');
  for (const { dir } of PACKAGES) {
    run('pnpm', ['pack', '--pack-destination', packDir], join(DIST, dir), `pack de ${dir}`);
  }

  const tarballs = PACKAGES.map(({ dir, tarball }) => {
    const found = readdirSync(packDir).find(
      (f) => f.startsWith(tarball) && f.endsWith('.tgz') && !f.startsWith(`${tarball}ui-`),
    );
    if (!found) {
      fail(`no se generó el tarball de ${dir}`);
    }
    return join(packDir, found);
  });

  step(2, 'Creando proyecto consumidor fuera del monorepo…');
  writeFileSync(
    join(consumer, 'package.json'),
    `${JSON.stringify(
      { name: 'aegis-consumer-smoke', version: '0.0.0', private: true, type: 'module' },
      null,
      2,
    )}\n`,
  );

  step(3, 'Instalando con NPM (no pnpm, sin workspace)…');
  run(
    'npm',
    ['install', '--silent', '--no-audit', '--no-fund', ...ANGULAR, ...tarballs],
    consumer,
    'npm install de los tarballs',
  );

  step(4, 'Comprobando que la FUENTE viaja en el paquete (ADR-001/ADR-003)…');
  const installedLib = join(consumer, 'node_modules', '@aegisui', 'ui', 'src', 'lib');
  if (!existsSync(installedLib)) {
    fail('el paquete instalado no incluye src/lib: `npx aegisui add` no encontraría nada (#19)');
  }
  for (const f of ['button.component.ts', 'button.component.css']) {
    if (!existsSync(join(installedLib, 'button', f))) {
      fail(`el paquete instalado no incluye src/lib/button/${f}`);
    }
  }
  // Y el andamiaje NO debe publicarse.
  for (const f of ['button.component.spec.ts', 'button.stories.ts']) {
    if (existsSync(join(installedLib, 'button', f))) {
      fail(`el paquete instalado incluye ${f}, que no debería publicarse`);
    }
  }

  step(5, 'Ejecutando el binario real: aegisui add button…');
  const out = run(
    'npx',
    ['aegisui', 'add', 'button', '--to', './src/components'],
    consumer,
    'npx aegisui add button',
  );
  const copied = join(consumer, 'src', 'components', 'button');
  for (const f of ['button.component.ts', 'button.component.css']) {
    if (!existsSync(join(copied, f))) {
      console.error(out);
      fail(`el CLI no copió ${f} en un consumidor externo (#19 seguiría roto)`);
    }
  }

  step(6, 'Typecheck del consumidor con los CINCO componentes…');
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: 'ES2022',
          module: 'preserve',
          moduleResolution: 'bundler',
          experimentalDecorators: true,
          skipLibCheck: true,
          noEmit: true,
          types: [],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(consumer, 'src', 'usa-aegis.ts'),
    `// Consumidor externo: importa del PAQUETE instalado, no del monorepo.
import { Component, signal } from '@angular/core';
import {
  AegisButtonComponent,
  AegisSwitchComponent,
  AegisCardComponent,
  AegisBadgeComponent,
  AegisInputComponent,
  type AegisBadgeVariant,
} from '@aegisui/ui';

@Component({
  selector: 'app-usa-aegis',
  imports: [
    AegisButtonComponent,
    AegisSwitchComponent,
    AegisCardComponent,
    AegisBadgeComponent,
    AegisInputComponent,
  ],
  template: \`
    <aegis-card>
      <aegis-badge [variant]="variante()">Activo</aegis-badge>
      <aegis-input label="Correo" [(value)]="correo" />
      <aegis-switch label="Avisos" [(checked)]="avisos" />
      <aegis-button>Guardar</aegis-button>
    </aegis-card>
  \`,
})
export class UsaAegisComponent {
  readonly variante = signal<AegisBadgeVariant>('success');
  readonly correo = signal('');
  readonly avisos = signal(false);
}
`,
  );
  run('npx', ['tsc', '--noEmit'], consumer, 'typecheck del consumidor');

  console.log(
    '\n✅ publish-smoke: los artefactos son consumibles desde fuera del monorepo.\n' +
      '   - fuente incluida en el paquete (ADR-001)\n' +
      '   - `aegisui add button` copia la piel (ADR-003)\n' +
      '   - los 5 componentes resuelven y tipan en un proyecto con npm',
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
