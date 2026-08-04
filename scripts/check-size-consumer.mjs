/**
 * Gate de tamaño para el coste REAL del consumidor de @aegisui/cdk.
 *
 * @size-limit/file mide el FESM sin bundlear @floating-ui/dom (lo deja externo):
 * verde falso de manual (ADR-023 §6). Este script cierra ese punto ciego:
 *
 *   Bundle = @aegisui/cdk FESM + @floating-ui/dom incluido
 *   External = @angular/core, @angular/common, tslib
 *
 * Dos direcciones (ADR-013):
 *   - pnpm size           → incluye este script; espera PASS
 *   - pnpm size:canary    → invoca check-size-consumer.mjs --canary; espera FAIL
 *
 * nodePaths: @floating-ui/dom está en packages/cdk/node_modules porque pnpm
 * no lo iza al raíz. @size-limit/esbuild no acepta nodePaths por entrada,
 * y NODE_PATH no llega al API JS de esbuild, así que usamos esbuild directo.
 */

import { build } from 'esbuild';
import { brotliCompressSync } from 'zlib';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = resolve(ROOT, 'dist/packages/cdk/fesm2022/aegisui-cdk.mjs');
const REAL_LIMIT_KB = 12;
const CANARY_LIMIT_KB = 3; // deliberadamente bajo: debe FALLAR para probar que medimos bien

const isCanary = process.argv.includes('--canary');
const limitKb = isCanary ? CANARY_LIMIT_KB : REAL_LIMIT_KB;

async function measure() {
  let result;
  try {
    result = await build({
      entryPoints: [ENTRY],
      bundle: true,
      write: false,
      external: ['@angular/core', '@angular/common', 'tslib'],
      // @floating-ui/dom está en packages/cdk/node_modules (pnpm no lo iza al raíz).
      nodePaths: [resolve(ROOT, 'packages/cdk/node_modules')],
      format: 'esm',
      minify: true,
    });
  } catch (err) {
    console.error('Error al construir el bundle de consumidor:', err.message);
    process.exit(1);
  }

  const code = result.outputFiles[0].contents;
  const brotlied = brotliCompressSync(Buffer.from(code));
  const bytes = brotlied.length;
  const kbActual = (bytes / 1024).toFixed(2);
  const limitBytes = limitKb * 1024;

  const label = isCanary
    ? `[CANARIO] @aegisui/cdk coste-de-consumidor — límite ${limitKb} kB (debe fallar)`
    : `@aegisui/cdk coste-de-consumidor — límite ${limitKb} kB`;

  console.log(`\n${label}`);
  console.log(`  Medido: ${kbActual} kB brotli`);

  if (bytes > limitBytes) {
    if (isCanary) {
      console.log('  ✓ Canario correcto: el gate sí mide Floating UI (supera el límite bajo)');
      process.exit(0);
    } else {
      console.error(`  ✗ ${kbActual} kB > ${limitKb} kB — límite superado`);
      process.exit(1);
    }
  } else {
    if (isCanary) {
      console.error(
        `  ✗ Canario roto: ${kbActual} kB ≤ ${limitKb} kB — Floating UI NO está siendo medido.`,
      );
      console.error(
        '    Comprueba que @floating-ui/dom está en dist/packages/cdk/ y que esbuild lo bundlea.',
      );
      process.exit(1);
    } else {
      console.log(`  ✓ ${kbActual} kB ≤ ${limitKb} kB — dentro del presupuesto`);
      process.exit(0);
    }
  }
}

measure();
