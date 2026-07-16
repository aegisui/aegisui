import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Validación de la FUENTE de tokens (capa 1 primitivos + capa 2 semánticos).
 * No prueba el build (eso llega en el commit 2): prueba que la fuente JSON es
 * coherente, que toda referencia resuelve, que el dark vive en la capa 2, y —lo
 * importante de esta paleta— que la separación jade/estado está garantizada por
 * AUSENCIA de token (ADR-014), no por disciplina.
 *
 * El contraste se comprueba aquí con la MISMA fórmula WCAG que usa el gate
 * `contrast` (scripts/gates/lib/util.mjs). En el commit 3 el gate pasa a validar
 * esta capa semántica real; este test es la red que evita commitear un color que
 * no pase, sin esperar a CI.
 */

const readJson = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8'));

const primitives = readJson('primitives.json');
const semantic = readJson('semantic.json');

// --- WCAG (idéntico a scripts/gates/lib/util.mjs) ------------------------
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    throw new Error(`color no reconocido (se espera #rrggbb): ${hex}`);
  }
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(fg: string, bg: string): number {
  const hi = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const lo = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (hi + 0.05) / (lo + 0.05);
}

// --- Utilidades de navegación -------------------------------------------
type Json = Record<string, unknown>;
const at = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, k) => (acc as Json)?.[k], obj);

const isRef = (v: unknown): v is string => typeof v === 'string' && /^\{[^}]+\}$/.test(v);

/** Resuelve `{color.jade.600}` -> hex primitivo (o lanza si no existe). */
function resolveRef(ref: string): string {
  const path = ref.slice(1, -1);
  const value = at(primitives, path);
  if (typeof value !== 'string') {
    throw new Error(`referencia sin destino en primitives: ${ref}`);
  }
  return value;
}

/** Resuelve un token semántico `{light|dark}` a hex para un tema dado. */
function semanticHex(path: string, theme: 'light' | 'dark'): string {
  const token = at(semantic, `color.${path}`) as Json | undefined;
  const ref = token?.[theme];
  if (!isRef(ref)) {
    throw new Error(`token semántico color.${path}.${theme} no es una referencia`);
  }
  return resolveRef(ref);
}

// --- Estructura ----------------------------------------------------------
describe('capa 1 — primitivos', () => {
  it('cubre color y todas las escalas de §5', () => {
    for (const group of ['color', 'font', 'space', 'radius', 'elevation', 'motion']) {
      expect(primitives, `falta el grupo primitivo "${group}"`).toHaveProperty(group);
    }
  });

  it('incluye las rampas de color de la dirección B (jade + neutros + estados)', () => {
    for (const ramp of ['neutral', 'jade', 'green', 'amber', 'red', 'blue']) {
      expect(primitives['color']).toHaveProperty(ramp);
    }
  });

  it('incluye las escalas estructurales de riel-2 (border-width, focus-ring) — ADR-016', () => {
    expect(primitives['border']).toHaveProperty('width');
    const bw = at(primitives, 'border.width') as Record<string, string>;
    for (const step of ['none', 'hairline', 'thin']) {
      expect(bw).toHaveProperty(step);
    }
    expect(at(primitives, 'focus.ring.width')).toBeDefined();
    expect(at(primitives, 'focus.ring.offset')).toBeDefined();
  });

  it('la familia de fuente por defecto es pila de sistema (cero webfonts)', () => {
    const sans = at(primitives, 'font.family.sans') as string;
    expect(sans).toMatch(/^system-ui/);
    expect(sans).not.toMatch(/url\(|https?:|\.woff/);
  });
});

describe('capa 3 — de componente', () => {
  it('está VACÍA en esta fase (nace con el contrato del componente, Fase 3)', () => {
    const componentFile = fileURLToPath(new URL('component.json', import.meta.url));
    expect(existsSync(componentFile), 'capa 3 no debe existir todavía').toBe(false);
    expect(semantic['color']).not.toHaveProperty('component');
  });
});

// --- Integridad de referencias ------------------------------------------
describe('capa 2 — semánticos', () => {
  const leaves: Array<{ path: string; theme: string; ref: unknown }> = [];
  const walk = (node: Json, trail: string[]): void => {
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === 'object' && 'light' in (v as Json) && 'dark' in (v as Json)) {
        for (const theme of ['light', 'dark']) {
          leaves.push({ path: trail.concat(k).join('.'), theme, ref: (v as Json)[theme] });
        }
      } else if (v && typeof v === 'object') {
        walk(v as Json, trail.concat(k));
      }
    }
  };
  walk(semantic['color'] as Json, []);

  it('todo token declara light Y dark (el dark vive aquí, §5.2)', () => {
    expect(leaves.length).toBeGreaterThan(0);
    for (const { path, theme, ref } of leaves) {
      expect(isRef(ref), `color.${path}.${theme} debe ser una referencia {…}`).toBe(true);
    }
  });

  it('toda referencia resuelve a un primitivo existente', () => {
    for (const { path, theme, ref } of leaves) {
      expect(() => resolveRef(ref as string), `color.${path}.${theme} → ${ref}`).not.toThrow();
    }
  });
});

// --- El raíl de la paleta: separación por AUSENCIA de token (ADR-014) ----
describe('rol de estado garantizado por estructura, no por disciplina', () => {
  const states = (semantic['color'] as Json)['state'] as Record<string, Json>;
  const allowed = new Set(['bg', 'text', 'border', 'point']);
  const forbidden = ['solid', 'solid-hover', 'on-solid'];

  it.each(Object.keys(states))(
    'state.%s solo existe como tinte + texto + punto (nunca sólido con texto encima)',
    (name) => {
      const keys = Object.keys(states[name]);
      for (const k of keys) {
        expect(allowed.has(k), `state.${name}.${k} no es un rol de estado válido`).toBe(true);
        expect(k.startsWith('on-'), `state.${name}.${k}: un estado no lleva texto encima`).toBe(
          false,
        );
      }
      for (const bad of forbidden) {
        expect(keys, `state.${name} no debe tener "${bad}" (invitaría a mal uso)`).not.toContain(
          bad,
        );
      }
    },
  );

  it('solo los roles de ACCIÓN (accent, destructive) son superficie sólida: tienen solid + on-solid', () => {
    const color = semantic['color'] as Json;
    for (const role of ['accent', 'destructive']) {
      const node = color[role] as Json;
      expect(node, `falta el rol de acción color.${role}`).toBeDefined();
      expect(node, `color.${role} debe tener "solid"`).toHaveProperty('solid');
      expect(node, `color.${role} debe tener "on-solid"`).toHaveProperty('on-solid');
    }
    // El raíl ADR-014 se refuerza: ningún ESTADO gana la superficie sólida de acción.
    const states = color['state'] as Record<string, Json>;
    for (const name of Object.keys(states)) {
      expect(states[name], `state.${name} no debe ser superficie de acción`).not.toHaveProperty(
        'solid',
      );
      expect(states[name]).not.toHaveProperty('on-solid');
    }
  });
});

// --- Contraste: la capa semántica pasa WCAG en light Y dark --------------
describe('contraste WCAG de la capa semántica (4.5:1 texto / 3:1 UI)', () => {
  const TEXT = 4.5;
  const UI = 3;
  const states = ['success', 'warning', 'danger', 'info'];

  const pairs = (): Array<[string, string, string, number]> => {
    const out: Array<[string, string, string, number]> = [];
    for (const surf of ['surface.canvas', 'surface.raised']) {
      out.push([`text.strong / ${surf}`, 'text.strong', surf, TEXT]);
      out.push([`text.muted / ${surf}`, 'text.muted', surf, TEXT]);
    }
    out.push(['accent.on-solid / accent.solid', 'accent.on-solid', 'accent.solid', TEXT]);
    out.push(['accent.text / canvas', 'accent.text', 'surface.canvas', TEXT]);
    out.push(['accent.border / canvas', 'accent.border', 'surface.canvas', UI]);
    out.push(['accent.ring / canvas', 'accent.ring', 'surface.canvas', UI]);
    // Acción destructiva sólida (ADR-015)
    out.push([
      'destructive.on-solid / destructive.solid',
      'destructive.on-solid',
      'destructive.solid',
      TEXT,
    ]);
    out.push([
      'destructive.on-solid / destructive.solid-hover',
      'destructive.on-solid',
      'destructive.solid-hover',
      TEXT,
    ]);
    out.push(['destructive.ring / canvas', 'destructive.ring', 'surface.canvas', UI]);
    for (const s of states) {
      out.push([`${s}.text / bg`, `state.${s}.text`, `state.${s}.bg`, TEXT]);
      out.push([`${s}.text / canvas`, `state.${s}.text`, 'surface.canvas', TEXT]);
      out.push([`${s}.point / canvas`, `state.${s}.point`, 'surface.canvas', UI]);
      out.push([`${s}.point / bg`, `state.${s}.point`, `state.${s}.bg`, UI]);
    }
    return out;
  };

  for (const theme of ['light', 'dark'] as const) {
    it.each(pairs())(`[${theme}] %s ≥ %s:1`, (_label, fg, bg, min) => {
      const ratio = contrastRatio(semanticHex(fg, theme), semanticHex(bg, theme));
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  }
});
