import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeFesmFiles } from '../../../scripts/check-peer-floor.mjs';

/**
 * Gate `peer-floor` (§3.1, §9.2): reutiliza el montaje del spike de
 * compatibilidad (build Angular 22 -> linkers 20/21) pero, en vez de invocar
 * el compilador Angular en cada test (lento, no determinista de instalar),
 * usa dos fragmentos de FESM realistas ya escritos a mano
 * (tools/fixtures/peer-floor/{good,bad}.fesm.mjs) que reproducen exactamente
 * la forma que vimos en el spike: `minVersion: "17.1.0"` para un componente
 * normal, `minVersion: "22.0.0"` simulando una feature exclusiva de Angular 22.
 * La lógica ejercitada (analyzeFesmFiles) es la misma que corre en CI.
 */

const here = dirname(fileURLToPath(import.meta.url));
const GOOD_FESM = join(here, '../peer-floor/good.fesm.mjs');
const BAD_FESM = join(here, '../peer-floor/bad.fesm.mjs');
const SCRIPT = join(here, '../../../scripts/check-peer-floor.mjs');

describe('peer-floor: analyzeFesmFiles', () => {
  it('good: minVersion 17.1.0 <= suelo 20.0.0 -> sin violaciones', () => {
    const { violations, worst } = analyzeFesmFiles([GOOD_FESM]);
    expect(violations).toEqual([]);
    expect(worst).toEqual([17, 1, 0]);
  });

  it('bad: minVersion 22.0.0 > suelo 20.0.0 -> violación', () => {
    const { violations } = analyzeFesmFiles([BAD_FESM]);
    expect(violations).toHaveLength(1);
    expect(violations[0].version).toEqual([22, 0, 0]);
  });

  it('anti-verde-falso: sin ficheros que analizar, lanza en vez de pasar en silencio', () => {
    expect(() => analyzeFesmFiles([])).toThrow(/no se encontró ningún FESM/);
  });
});

describe('peer-floor: CLI end-to-end (scripts/check-peer-floor.mjs)', () => {
  it('directorio vacío falla ruidosamente (no targets found)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'peer-floor-empty-'));
    try {
      expect(() => execFileSync('node', [SCRIPT, dir], { stdio: 'pipe' })).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('FESM bueno -> exit 0', () => {
    const dir = mkdtempSync(join(tmpdir(), 'peer-floor-good-'));
    const fesmDir = join(dir, 'fesm2022');
    mkdirSync(fesmDir, { recursive: true });
    copyFileSync(GOOD_FESM, join(fesmDir, 'good.mjs'));
    try {
      expect(() => execFileSync('node', [SCRIPT, dir], { stdio: 'pipe' })).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('FESM malo -> exit distinto de 0, con mensaje accionable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'peer-floor-bad-'));
    const fesmDir = join(dir, 'fesm2022');
    mkdirSync(fesmDir, { recursive: true });
    copyFileSync(BAD_FESM, join(fesmDir, 'bad.mjs'));
    try {
      execFileSync('node', [SCRIPT, dir], { stdio: 'pipe' });
      throw new Error('esperaba que el CLI fallase con minVersion 22.0.0');
    } catch (err) {
      const e = err as { status?: number; stderr?: Buffer };
      expect(e.status).not.toBe(0);
      expect(String(e.stderr)).toMatch(/peer-floor/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
