/**
 * Runner de un gate de §9.2 contra los fixtures, en las dos direcciones
 * (ADR-013). Es el comando que corre cada job de CI: su `name:` está fijado como
 * required en la protección de rama, así que el job existe siempre; lo que
 * cambia es que ahora tiene objetivos reales que analizar (los fixtures) en vez
 * de fallar con `pending-gate`.
 *
 *   node scripts/gates/run.mjs <gate>
 *
 * Verde solo si:
 *   - good/  NO produce violaciones (el gate no da falsos positivos), y
 *   - bad/   SÍ produce violaciones (el gate no da falsos negativos: el raíl
 *            sigue cazando la violación deliberada).
 *
 * Si el lado bad/ se queda sin violaciones, el gate ha DEJADO de detectar y hay
 * que enterarse en el acto: sale en rojo.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const GATES = ['a11y', 'contrast', 'target-size', 'keyboard', 'visual', 'contracts'];

async function run(id) {
  if (!GATES.includes(id)) {
    console.error(`❌ gate desconocido: "${id}". Válidos: ${GATES.join(', ')}.`);
    process.exit(2);
  }
  const gate = (await import(join(here, `${id}.mjs`))).default;

  const goodViolations = gate.good();
  const badViolations = gate.bad();
  let failed = false;

  // Dirección 1: good/ debe pasar limpio.
  if (goodViolations.length > 0) {
    failed = true;
    console.error(`❌ ${id}: FALSO POSITIVO — el gate marca violaciones sobre good/ (correcto):`);
    for (const v of goodViolations) {
      console.error(`   - ${v}`);
    }
  } else {
    console.log(`✅ ${id} · good/: sin violaciones (el gate no da falsos positivos).`);
  }

  // Dirección 2: bad/ debe fallar, si no el raíl ha muerto.
  if (badViolations.length === 0) {
    failed = true;
    console.error(
      `❌ ${id}: FALSO NEGATIVO — el raíl ha dejado de detectar su violación deliberada (${gate.badExpectation}).`,
    );
    console.error('   El fixture bad/ ya no dispara el gate: alguien aflojó la regla. Arréglalo.');
  } else {
    console.log(
      `✅ ${id} · bad/: ${badViolations.length} violación(es) detectada(s) (el gate no da falsos negativos):`,
    );
    for (const v of badViolations) {
      console.log(`   - ${v}`);
    }
  }

  // "Además de" los fixtures: reconciliación real cuando ya existan objetivos.
  if (typeof gate.realPackagesViolations === 'function') {
    const real = gate.realPackagesViolations();
    if (real.length > 0) {
      failed = true;
      console.error(`❌ ${id}: inconsistencias sobre objetivos reales:`);
      for (const v of real) {
        console.error(`   - ${v}`);
      }
    }
  }

  if (failed) {
    process.exit(1);
  }
  console.log(`\n✅ gate "${id}": las dos direcciones verdes sobre los fixtures.`);
}

run(process.argv[2]);
