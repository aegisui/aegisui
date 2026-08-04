#!/usr/bin/env node
/**
 * Gate `size-marginal` — presupuesto FIJO + presupuesto MARGINAL por componente.
 *
 * Por qué existe, y por qué NO usa esbuild
 * ----------------------------------------
 * El agregado de `size-limit` sobre el FESM medía algo que nadie paga: el peso de
 * la librería entera. Nadie instala los cinco componentes para usar uno. Lo que un
 * consumidor paga de verdad se descompone en dos:
 *
 *   - COSTE FIJO: el peaje que paga CUALQUIERA que use la librería, aunque solo
 *     use un componente. Es el número más importante del archivo.
 *   - COSTE MARGINAL: lo que añade CADA componente por encima de ese peaje.
 *
 * La medición se hace con una app Angular REAL construida con `@angular/build`
 * contra los artefactos de `dist/`, no con esbuild sobre el FESM. La diferencia
 * no es cosmética: los paquetes de ng-packagr traen *partial declarations*
 * (`ɵɵngDeclareComponent`) que SOLO el linker de Angular resuelve. esbuild a
 * secas no las sacude y hace parecer que la librería no se tree-shakea — un
 * falso negativo que ya nos costó una investigación entera. La herramienta
 * correcta es el compilador de Angular, y con él el `dist` publicado SÍ se
 * sacude por componente (verificado: una app de solo-Badge no contiene ni una
 * referencia a `@floating-ui/dom`).
 *
 * Método de descomposición
 * ------------------------
 * Se mide Δ(componente) = |app que usa SOLO ese componente| − |app vacía|.
 * Ese Δ incluye el coste fijo. Para separarlos:
 *
 *   fijo      = Δ(el componente más barato) − marginal_LOO(ese componente)
 *   marginal_i = Δ(componente i) − fijo
 *
 * donde marginal_LOO (leave-one-out) = |los cinco| − |los cinco menos ese|, es
 * decir lo que ese componente aporta cuando el coste fijo YA lo paga otro. Se usa
 * el componente más barato porque es el que menos contamina la cuenta del fijo.
 *
 * Honestidad sobre el método: brotli no es aditivo (código parecido comprime
 * mejor junto), así que la descomposición es una ESTIMACIÓN con método declarado,
 * no una constante física. Lo que el gate garantiza no es que el reparto sea
 * exacto, sino que cualquier regresión real mueve los números y los presupuestos
 * chillan. Los Δ medidos sí son directos y exactos.
 *
 * Anti-verde-falso (SPEC §13): si no encuentra componentes que medir, FALLA.
 * `--canary` corre con presupuestos absurdamente bajos y DEBE fallar; si pasa,
 * es que el gate no está midiendo nada.
 */

import { execFileSync } from 'node:child_process';
import { brotliCompressSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROBE = resolve(ROOT, '.size-probe');
const UI_LIB = resolve(ROOT, 'packages/ui/src/lib');
const CONTRACTS = resolve(ROOT, 'docs/contracts');
const NG = resolve(ROOT, 'node_modules/.bin/ng');

const isCanary = process.argv.includes('--canary');

/** Presupuesto del coste fijo, en bytes brotli. Ceñido, no cómodo (ver README del gate). */
const FIXED_BUDGET = isCanary ? 100 : 4864; // medido 4633 B + ~5 % de margen

const kb = (n) => `${(n / 1024).toFixed(2)} kB`;

/**
 * Descubre los componentes de `ui` desde el FUENTE, no desde una lista a mano:
 * un componente nuevo entra en el gate solo. Devuelve { name, cls, selector }.
 */
function discoverComponents() {
  const out = [];
  for (const dir of readdirSync(UI_LIB, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const file = resolve(UI_LIB, dir.name, `${dir.name}.component.ts`);
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const cls = src.match(/^export class (\w+)/m)?.[1];
    const selector = src.match(/selector:\s*'([^']+)'/)?.[1];
    if (!cls || !selector) {
      console.error(`✖ ${dir.name}: no se pudo derivar la clase o el selector de ${file}`);
      process.exit(1);
    }
    out.push({ name: dir.name, cls, selector });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Lee el presupuesto marginal DECLARADO en el contrato del componente.
 * Sin declaración no hay medición válida: es el mismo principio que la matriz
 * visual del gate `coverage`. Un componente sin presupuesto declarado no es
 * "presupuesto cero", es presupuesto DESCONOCIDO — y eso es violación.
 */
function declaredBudget(name) {
  const file = resolve(CONTRACTS, `${name}.md`);
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    return { error: `no existe su contrato (${file})` };
  }
  const m = src.match(/\*\*Presupuesto marginal:\*\*\s*([\d.]+)\s*kB/);
  if (!m) {
    return {
      error:
        `su contrato no declara "**Presupuesto marginal:** X.XX kB". ` +
        `Sin declaración no es presupuesto cero, es presupuesto DESCONOCIDO ` +
        `(mismo principio que la matriz visual en el gate coverage).`,
    };
  }
  return { bytes: Math.round(parseFloat(m[1]) * 1024) };
}

function scaffold() {
  rmSync(PROBE, { recursive: true, force: true });
  mkdirSync(resolve(PROBE, 'src'), { recursive: true });

  writeFileSync(
    resolve(PROBE, 'angular.json'),
    JSON.stringify(
      {
        version: 1,
        projects: {
          probe: {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            architect: {
              build: {
                builder: '@angular/build:application',
                options: {
                  outputPath: 'dist',
                  index: 'src/index.html',
                  browser: 'src/main.ts',
                  tsConfig: 'tsconfig.app.json',
                  polyfills: [],
                  optimization: true,
                  outputHashing: 'none',
                },
              },
            },
          },
        },
      },
      null,
      2,
    ),
  );

  writeFileSync(
    resolve(PROBE, 'tsconfig.app.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'preserve',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM'],
          strict: true,
          skipLibCheck: true,
          outDir: './out-tsc',
          types: [],
          paths: {
            // Se mide contra dist/, que es lo que instala un consumidor real,
            // NO contra el fuente: el objetivo es probar que el ARTEFACTO
            // PUBLICADO se sacude.
            '@aegisui/ui': [resolve(ROOT, 'dist/packages/ui')],
            '@aegisui/cdk': [resolve(ROOT, 'dist/packages/cdk')],
            // pnpm no eleva las deps de un paquete del workspace a la raíz. Un
            // consumidor de npm la recibe como transitiva; aquí hay que apuntarla.
            '@floating-ui/dom': [resolve(ROOT, 'packages/cdk/node_modules/@floating-ui/dom')],
          },
        },
        files: ['src/main.ts'],
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    resolve(PROBE, 'src/index.html'),
    '<!doctype html><html><body><app-root></app-root></body></html>\n',
  );
}

/** Escribe un main.ts que usa exactamente `comps` y mide el bundle en brotli. */
function measure(comps) {
  const hasAny = comps.length > 0;
  const importLine = hasAny
    ? `import { ${comps.map((c) => c.cls).join(', ')} } from '@aegisui/ui';\n`
    : '';
  const importsMeta = hasAny ? `  imports: [${comps.map((c) => c.cls).join(', ')}],\n` : '';
  const tpl = hasAny
    ? comps.map((c) => `<${c.selector}>x</${c.selector}>`).join('')
    : '<p>baseline</p>';

  writeFileSync(
    resolve(PROBE, 'src/main.ts'),
    `import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
${importLine}
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
${importsMeta}  template: \`${tpl}\`,
})
export class AppComponent {}

bootstrapApplication(AppComponent, { providers: [provideZonelessChangeDetection()] });
`,
  );

  try {
    execFileSync(NG, ['build'], { cwd: PROBE, stdio: 'pipe' });
  } catch (err) {
    console.error(`✖ falló la construcción de la app sonda con [${comps.map((c) => c.name)}]`);
    console.error(err.stdout?.toString() ?? err.message);
    process.exit(1);
  }
  return brotliCompressSync(readFileSync(resolve(PROBE, 'dist/browser/main.js'))).length;
}

// ---------------------------------------------------------------------------

const components = discoverComponents();

// Anti-verde-falso: un gate sin objetivos que analizar falla ruidosamente.
if (components.length < 2) {
  console.error(
    `✖ el gate necesita al menos 2 componentes para descomponer fijo/marginal; encontró ${components.length}.`,
  );
  process.exit(1);
}

console.log(
  `\n${isCanary ? '[CANARIO] ' : ''}size-marginal — app Angular real contra dist/ (brotli)\n`,
);
console.log(`  Componentes descubiertos: ${components.map((c) => c.name).join(', ')}\n`);

scaffold();

const baseline = measure([]);
console.log(`  baseline (sin aegis): ${kb(baseline)}`);

const alone = new Map();
for (const c of components) {
  alone.set(c.name, measure([c]) - baseline);
}

const all = measure(components) - baseline;

// El más barato en solitario: el que menos contamina la cuenta del coste fijo.
const cheapest = [...alone.entries()].sort((a, b) => a[1] - b[1])[0][0];
const withoutCheapest = measure(components.filter((c) => c.name !== cheapest)) - baseline;
const cheapestLoo = all - withoutCheapest;
const fixed = alone.get(cheapest) - cheapestLoo;

console.log(`  Δ los ${components.length} juntos: ${kb(all)}`);
console.log(
  `  referencia del fijo: "${cheapest}" (el más barato), marginal LOO ${cheapestLoo} B\n`,
);

const failures = [];

// --- Coste fijo: el peaje que paga TODO consumidor -------------------------
console.log('  COSTE FIJO — el peaje que paga cualquiera que use la librería');
const fixedOk = fixed <= FIXED_BUDGET;
console.log(
  `    ${fixedOk ? '✓' : '✗'} medido ${kb(fixed)} · presupuesto ${kb(FIXED_BUDGET)}` +
    (fixedOk ? '' : `  ← EXCEDIDO en ${kb(fixed - FIXED_BUDGET)}`),
);
if (!fixedOk) {
  failures.push(
    `coste fijo ${kb(fixed)} > ${kb(FIXED_BUDGET)}. Es el número que paga TODO el mundo: ` +
      `antes de subir el presupuesto, averigua qué entró en el tronco común.`,
  );
}

// --- Marginal por componente ----------------------------------------------
console.log('\n  COSTE MARGINAL — lo que añade cada componente sobre el peaje');
for (const c of components) {
  const marginal = alone.get(c.name) - fixed;
  const declared = declaredBudget(c.name);

  if (declared.error) {
    console.log(`    ✗ ${c.name}: medido ${kb(marginal)} · SIN PRESUPUESTO DECLARADO`);
    failures.push(`${c.name}: ${declared.error}`);
    continue;
  }

  const budget = isCanary ? 1 : declared.bytes;
  const ok = marginal <= budget;
  console.log(
    `    ${ok ? '✓' : '✗'} ${c.name}: medido ${kb(marginal)} · declarado ${kb(budget)}` +
      (ok ? '' : `  ← EXCEDIDO en ${kb(marginal - budget)}`),
  );
  if (!ok) {
    failures.push(`${c.name}: marginal ${kb(marginal)} > ${kb(budget)} declarado en su contrato.`);
  }
}

// --- Agregado: INFORMATIVO, no bloquea ------------------------------------
console.log(
  `\n  AGREGADO (informativo, NO bloquea): los ${components.length} juntos cuestan ${kb(all)} ` +
    `sobre una app vacía.`,
);
console.log(
  `    Un salto aquí sin que se mueva ningún marginal significa que creció el tronco común.`,
);

rmSync(PROBE, { recursive: true, force: true });

// --- Veredicto -------------------------------------------------------------
if (isCanary) {
  if (failures.length > 0) {
    console.log(
      `\n✓ Canario correcto: con presupuestos absurdos el gate falla (${failures.length} violaciones). Sí mide.`,
    );
    process.exit(0);
  }
  console.error(
    '\n✖ CANARIO EN VERDE: el gate pasó con presupuestos imposibles. No está midiendo.',
  );
  process.exit(1);
}

if (failures.length > 0) {
  console.error('\n✖ size-marginal: presupuestos incumplidos\n');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}

console.log('\n✓ size-marginal: coste fijo y todos los marginales dentro de presupuesto.');
