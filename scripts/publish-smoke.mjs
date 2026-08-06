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
 * se ejercitó. Cinco verdes que no significaban lo que parecían. Select y
 * Combobox (Fase 5) llegaron después y heredaron el mismo agujero: aquí van los
 * SIETE, y `COMPONENTS` se amplía con cada componente nuevo.
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
 *   5. Ejecutar el binario real `aegisui add <x>` con los SIETE componentes y
 *      comprobar qué copia.
 *   6. `tsc --noEmit` sobre un componente que importa los SIETE del paquete
 *      instalado: que resuelva y tipe de verdad, no solo que exista.
 *
 * Uso: `pnpm publish-smoke` (requiere `pnpm nx run-many -t build` antes).
 *      `pnpm publish-smoke:canary` reintroduce cada fallo y exige que se cace.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * De dónde salen los artefactos. Se puede apuntar a otro sitio para el CANARIO
 * (`--canary`), que trabaja sobre una COPIA mutada de `dist/` — nunca sobre la
 * de verdad, para no dejar el árbol sucio si algo revienta a mitad.
 */
const DIST = process.env.AEGIS_SMOKE_DIST ?? join(REPO_ROOT, 'dist', 'packages');

/**
 * Lo que instala el consumidor. `icons` no entra: no lo usa el smoke.
 *
 * `pkg` es el nombre npm real, no un prefijo: el tarball de `aegisui` empieza
 * igual que el de `aegisui-cdk` y el de `aegisui-tokens`, así que casar por
 * prefijo elegiría el primero por orden alfabético y el smoke instalaría el
 * paquete equivocado creyendo que instala el CLI.
 */
const PACKAGES = [
  { dir: 'tokens', pkg: '@aegisui/tokens' },
  { dir: 'cdk', pkg: '@aegisui/cdk' },
  { dir: 'ui', pkg: '@aegisui/ui' },
  { dir: 'cli', pkg: 'aegisui' },
];

/**
 * Los componentes que el consumidor externo tiene que poder copiar y tipar.
 * **Todo componente de `packages/ui/src/lib` va aquí**: si un componente nuevo
 * no entra, su distribución vuelve a ser el verde vacío de #19. El paso 0 lo
 * comprueba contra el disco, para que olvidarse no sea silencioso.
 */
const COMPONENTS = ['button', 'input', 'switch', 'card', 'badge', 'select', 'combobox'];

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

/**
 * CANARIO (`--canary`). Un gate que no se ha visto fallar no es un gate: es una
 * afirmación. Reintroduce, de uno en uno, los TRES fallos reales de #19 sobre una
 * copia de `dist/` y exige que el smoke los cace. Si alguno pasa en verde, el
 * smoke ha dejado de proteger lo que dice proteger y ESO es lo que falla aquí.
 *
 * Los tres son los que se reprodujeron a mano desde un consumidor externo antes
 * de escribir nada: no son fallos inventados para tener canario.
 */
const FALLOS = [
  {
    id: 'ui-sin-src',
    porQue: 'ADR-001/ADR-003: sin src/ en el paquete, `aegisui add` no encuentra la piel',
    romper: (dist) => rmSync(join(dist, 'ui', 'src'), { recursive: true, force: true }),
  },
  {
    id: 'cli-sin-manifiesto',
    porQue: 'sin package.json en dist, el CLI no es publicable (y `pack` sube al workspace)',
    romper: (dist) => rmSync(join(dist, 'cli', 'package.json'), { force: true }),
  },
  {
    id: 'workspace-protocol',
    porQue: '`workspace:^` no resuelve fuera de pnpm: el artefacto ni se puede empaquetar',
    romper: (dist) => {
      const p = join(dist, 'ui', 'package.json');
      const m = JSON.parse(readFileSync(p, 'utf8'));
      m.peerDependencies['@aegisui/cdk'] = 'workspace:^';
      writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
    },
  },
];

if (process.argv.includes('--canary')) {
  const base = join(REPO_ROOT, 'dist', 'packages');
  if (!existsSync(join(base, 'ui', 'package.json'))) {
    fail('no hay artefactos que romper. Corre "pnpm publish-smoke" antes del canario.');
  }

  let vivos = 0;
  for (const { id, porQue, romper } of FALLOS) {
    const sandbox = mkdtempSync(join(tmpdir(), `aegis-canary-${id}-`));
    const dist = join(sandbox, 'packages');
    cpSync(base, dist, { recursive: true });
    romper(dist);

    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, AEGIS_SMOKE_DIST: dist },
      encoding: 'utf8',
    });
    rmSync(sandbox, { recursive: true, force: true });

    if (r.status === 0) {
      console.error(`\n   ✖ ${id}: el smoke PASÓ con el fallo reintroducido.`);
      console.error(`     ${porQue}`);
      vivos++;
    } else {
      console.log(`   ✔ ${id}: cazado (exit ${r.status})`);
    }
  }

  if (vivos > 0) {
    fail(`${vivos} de ${FALLOS.length} fallos de #19 pasarían hoy sin que el smoke los cace`);
  }
  console.log(`\n✅ publish-smoke --canary: los ${FALLOS.length} fallos de #19 siguen cazados.`);
  process.exit(0);
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

// Anti-verde-falso, segunda mitad: la lista de arriba tiene que ser TODOS los
// componentes. Un componente nuevo que nadie añada aquí pasaría el smoke sin que
// su distribución se haya probado nunca — que es literalmente el fallo de #19.
const enDisco = readdirSync(join(REPO_ROOT, 'packages', 'ui', 'src', 'lib'), {
  withFileTypes: true,
})
  .filter((e) => e.isDirectory())
  .map((e) => e.name);
const sinCubrir = enDisco.filter((c) => !COMPONENTS.includes(c));
if (sinCubrir.length > 0) {
  fail(
    `estos componentes existen en packages/ui/src/lib pero no están en COMPONENTS: ` +
      `${sinCubrir.join(', ')}. Añádelos (y al typecheck del paso 6).`,
  );
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

  // El nombre del tarball es determinista: `npm pack` sustituye "/" por "-" y
  // quita el "@" del scope. Se construye, no se adivina por prefijo.
  const tarballs = PACKAGES.map(({ dir, pkg }) => {
    const { version } = JSON.parse(readFileSync(join(DIST, dir, 'package.json'), 'utf8'));
    const esperado = `${pkg.replace('@', '').replace('/', '-')}-${version}.tgz`;
    if (!existsSync(join(packDir, esperado))) {
      fail(`no se generó el tarball de ${dir} (esperaba ${esperado})`);
    }
    return join(packDir, esperado);
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
  for (const c of COMPONENTS) {
    for (const f of [`${c}.component.ts`, `${c}.component.css`]) {
      if (!existsSync(join(installedLib, c, f))) {
        fail(`el paquete instalado no incluye src/lib/${c}/${f}`);
      }
    }
    // Y el andamiaje NO debe publicarse.
    for (const f of [`${c}.component.spec.ts`, `${c}.stories.ts`]) {
      if (existsSync(join(installedLib, c, f))) {
        fail(`el paquete instalado incluye ${c}/${f}, que no debería publicarse`);
      }
    }
  }

  step(5, `Ejecutando el binario real: aegisui add — los ${COMPONENTS.length} componentes…`);
  for (const c of COMPONENTS) {
    const out = run(
      'npx',
      ['aegisui', 'add', c, '--to', './src/components'],
      consumer,
      `npx aegisui add ${c}`,
    );
    const copied = join(consumer, 'src', 'components', c);
    for (const f of [`${c}.component.ts`, `${c}.component.css`]) {
      if (!existsSync(join(copied, f))) {
        console.error(out);
        fail(`el CLI no copió ${f} en un consumidor externo (#19 seguiría roto)`);
      }
    }
    console.log(`      ✔ ${c}`);
  }

  step(6, `Typecheck del consumidor con los ${COMPONENTS.length} componentes…`);
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
  AegisSelectComponent,
  AegisComboboxComponent,
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
    AegisSelectComponent,
    AegisComboboxComponent,
  ],
  template: \`
    <aegis-card>
      <aegis-badge [variant]="variante()">Activo</aegis-badge>
      <aegis-input label="Correo" [(value)]="correo" />
      <aegis-switch label="Avisos" [(checked)]="avisos" />
      <aegis-select label="País" [options]="paises" [(value)]="pais" />
      <aegis-combobox label="Ciudad" [options]="paises" [(value)]="ciudad" />
      <aegis-button>Guardar</aegis-button>
    </aegis-card>
  \`,
})
export class UsaAegisComponent {
  readonly variante = signal<AegisBadgeVariant>('success');
  readonly correo = signal('');
  readonly avisos = signal(false);
  // Genéricos: el consumidor tiene que poder instanciarlos con SU tipo.
  readonly paises: readonly string[] = ['España', 'Portugal'];
  readonly pais = signal<string | undefined>(undefined);
  readonly ciudad = signal<string | undefined>(undefined);
}
`,
  );
  run('npx', ['tsc', '--noEmit'], consumer, 'typecheck del consumidor');

  console.log(
    '\n✅ publish-smoke: los artefactos son consumibles desde fuera del monorepo.\n' +
      '   - fuente incluida en el paquete (ADR-001)\n' +
      `   - \`aegisui add\` copia la piel de los ${COMPONENTS.length} componentes (ADR-003)\n` +
      `   - los ${COMPONENTS.length} resuelven y tipan en un proyecto con npm`,
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
