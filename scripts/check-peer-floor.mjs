/**
 * Gate `peer-floor` (§3.1, §9.2).
 *
 * Lee el `minVersion` embebido en cada FESM CONSTRUIDO (no en el package.json
 * fuente) y falla si supera 20.0.0, para garantizar el peerDependencies
 * "^20 || ^21 || ^22". Anti-verde-falso: si no encuentra ningún FESM que analizar,
 * falla ruidosamente en vez de pasar en silencio.
 *
 * La lógica se exporta (findFesmFiles/analyzeFesmFiles) para que
 * tools/fixtures/src/peer-floor.spec.ts la ejercite en las dos direcciones sin
 * tener que reconstruir Angular en cada test (ver ese fichero para el porqué).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PEER_FLOOR = [20, 0, 0];

export function compareVersions(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) - (b[i] ?? 0);
    }
  }
  return 0;
}

export function findFesmFiles(dir) {
  const out = [];
  if (!existsSync(dir)) {
    return out;
  }
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findFesmFiles(full));
    } else if (/\.m?js$/.test(entry) && full.includes('fesm')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Analiza una lista de ficheros FESM buscando `minVersion` embebido.
 * Lanza si la lista está vacía: nada que analizar es un fallo ruidoso, nunca un
 * verde silencioso (anti-verde-falso, §13).
 */
export function analyzeFesmFiles(files, floor = PEER_FLOOR) {
  if (files.length === 0) {
    throw new Error('peer-floor: no se encontró ningún FESM que analizar (no targets found).');
  }
  let worst = null;
  const violations = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/minVersion:\s*"(\d+)\.(\d+)\.(\d+)"/g)) {
      const version = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (!worst || compareVersions(version, worst) > 0) {
        worst = version;
      }
      if (compareVersions(version, floor) > 0) {
        violations.push({ file, version });
      }
    }
  }
  return { worst, violations };
}

function main(argv) {
  const dir = argv[2] ?? 'dist/packages';
  try {
    const files = findFesmFiles(dir);
    const { worst, violations } = analyzeFesmFiles(files);
    if (violations.length > 0) {
      console.error(
        `❌ peer-floor: hay un minVersion embebido por encima del suelo ${PEER_FLOOR.join('.')} (peer "^20 || ^21 || ^22", §3.1):`,
      );
      for (const { file, version } of violations) {
        console.error(`   ${file}: minVersion ${version.join('.')}`);
      }
      console.error('   Subir el suelo es un cambio MAJOR con justificación explícita (§3.1).');
      process.exit(1);
    }
    console.log(
      `✅ peer-floor: ${files.length} FESM analizados en ${dir}/; minVersion máximo = ${
        worst ? worst.join('.') : '(ninguno)'
      } ≤ ${PEER_FLOOR.join('.')}.`,
    );
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv);
}
