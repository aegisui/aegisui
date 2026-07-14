/**
 * Gate `peer-floor` (§3.1, §9.2).
 *
 * Lee el `minVersion` embebido en cada FESM CONSTRUIDO (no en el package.json
 * fuente) y falla si supera 20.0.0, para garantizar el peerDependencies
 * "^20 || ^21 || ^22". Anti-verde-falso: si no encuentra ningún FESM que analizar,
 * falla ruidosamente en vez de pasar en silencio.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FLOOR = [20, 0, 0];
const DIST = 'dist/packages';

function cmp(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) - (b[i] ?? 0);
    }
  }
  return 0;
}

function findFesm(dir) {
  const out = [];
  if (!existsSync(dir)) {
    return out;
  }
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findFesm(full));
    } else if (/\.m?js$/.test(entry) && full.includes('fesm')) {
      out.push(full);
    }
  }
  return out;
}

const files = findFesm(DIST);
if (files.length === 0) {
  console.error(
    `❌ peer-floor: no se encontró ningún FESM en ${DIST}/. ¿Se han construido los paquetes? (no targets found)`,
  );
  process.exit(1);
}

let worst = null;
const violations = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/minVersion:\s*"(\d+)\.(\d+)\.(\d+)"/g)) {
    const version = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (!worst || cmp(version, worst) > 0) {
      worst = version;
    }
    if (cmp(version, FLOOR) > 0) {
      violations.push({ file, version });
    }
  }
}

if (violations.length > 0) {
  console.error(
    '❌ peer-floor: hay un minVersion embebido por encima del suelo 20.0.0 (peer "^20 || ^21 || ^22", §3.1):',
  );
  for (const { file, version } of violations) {
    console.error(`   ${file}: minVersion ${version.join('.')}`);
  }
  console.error('   Subir el suelo es un cambio MAJOR con justificación explícita (§3.1).');
  process.exit(1);
}

console.log(
  `✅ peer-floor: ${files.length} FESM analizados; minVersion máximo = ${
    worst ? worst.join('.') : '(ninguno)'
  } ≤ 20.0.0.`,
);
