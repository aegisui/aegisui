/**
 * Generadores puros JSON -> artefactos. Sin dependencias, sin IO: reciben los
 * objetos ya parseados y devuelven strings. Así el build (build-tokens.mjs) y el
 * test (src/build.spec.ts) comparten EXACTAMENTE la misma lógica.
 *
 * Regla de nombres de CSS custom property:
 *   - capa 1 (primitivos): se omite el segmento "color" -> `--aegis-jade-600`,
 *     `--aegis-space-4`, `--aegis-font-size-lg` (SPEC §5.1: `--aegis-blue-500`).
 *   - capa 2 (semánticos): se conserva -> `--aegis-color-accent-solid`
 *     (SPEC §5.1: `--aegis-color-primary`). El prefijo `color-` distingue capa.
 *
 * Una sola fuente de verdad: los primitivos son los únicos con valores literales.
 * Semánticos, dark y preset de Tailwind son SIEMPRE `var(--aegis-*)`. Cero
 * duplicación (lo verifica build.spec.ts).
 */

const PREFIX = '--aegis';

/** Segmentos de path -> nombre de var de primitivo (omite "color"). */
export function primitiveVarName(segments) {
  const parts = segments[0] === 'color' ? segments.slice(1) : segments;
  return `${PREFIX}-${parts.join('-')}`;
}

/** Segmentos de path -> nombre de var de semántico (conserva "color"). */
export function semanticVarName(segments) {
  return `${PREFIX}-${segments.join('-')}`;
}

/** `{color.jade.600}` -> `--aegis-jade-600`. */
export function refToVarName(ref) {
  const m = /^\{([^}]+)\}$/.exec(ref);
  if (!m) {
    throw new Error(`referencia mal formada: ${ref}`);
  }
  return primitiveVarName(m[1].split('.'));
}

/** Recorre un árbol y devuelve las hojas string como { segments, value }. */
function walkLeaves(node, trail, onLeaf) {
  for (const [key, value] of Object.entries(node)) {
    const segments = trail.concat(key);
    if (typeof value === 'string') {
      onLeaf(segments, value);
    } else if (value && typeof value === 'object') {
      walkLeaves(value, segments, onLeaf);
    }
  }
}

/** Primitivos aplanados: [{ name, value }] en orden estable. */
export function flattenPrimitives(primitives) {
  const out = [];
  walkLeaves(primitives, [], (segments, value) => {
    out.push({ name: primitiveVarName(segments), value });
  });
  return out;
}

/**
 * Semánticos aplanados: [{ name, lightVar, darkVar }]. Una hoja semántica es un
 * objeto `{ light, dark }` con dos referencias a primitivos.
 */
export function flattenSemantic(semantic) {
  const out = [];
  const walk = (node, trail) => {
    for (const [key, value] of Object.entries(node)) {
      const segments = trail.concat(key);
      if (value && typeof value === 'object' && 'light' in value && 'dark' in value) {
        out.push({
          name: semanticVarName(segments),
          lightVar: refToVarName(value.light),
          darkVar: refToVarName(value.dark),
        });
      } else if (value && typeof value === 'object') {
        walk(value, segments);
      }
    }
  };
  walk(semantic, []);
  return out;
}

const declBlock = (decls, indent = '  ') =>
  decls.map(({ prop, val }) => `${indent}${prop}: ${val};`).join('\n');

/**
 * tokens.css — el fichero que se carga. Da los DOS mecanismos de §5.2:
 *   - `light-dark()` + `color-scheme` donde hay soporte (auto por
 *     prefers-color-scheme; manual conmutando color-scheme con [data-theme]);
 *   - un fallback `@supports not(light-dark)` que replica ambos con overrides.
 */
export function renderTokensCss(primitives, semantic) {
  const prims = flattenPrimitives(primitives);
  const sems = flattenSemantic(semantic);

  const primDecls = declBlock(prims.map((p) => ({ prop: p.name, val: p.value })));
  const semLightDark = declBlock(
    sems.map((s) => ({ prop: s.name, val: `light-dark(var(${s.lightVar}), var(${s.darkVar}))` })),
  );
  const semLight = (indent) =>
    declBlock(
      sems.map((s) => ({ prop: s.name, val: `var(${s.lightVar})` })),
      indent,
    );
  const semDark = (indent) =>
    declBlock(
      sems.map((s) => ({ prop: s.name, val: `var(${s.darkVar})` })),
      indent,
    );

  return `/* Aegis UI — tokens (generado desde packages/tokens/src/*.json; no editar a mano). */
:root {
  color-scheme: light dark;

  /* Capa 1 — primitivos (estables entre temas) */
${primDecls}

  /* Capa 2 — semánticos: light-dark() sigue el tema activo */
${semLightDark}
}

/* Conmutación manual del tema (§5.2). light-dark() lee color-scheme. */
:root[data-theme='light'] {
  color-scheme: light;
}
:root[data-theme='dark'] {
  color-scheme: dark;
}

/* Fallback sin light-dark(): los mismos dos mecanismos, con overrides explícitos. */
@supports not (color: light-dark(#fff, #000)) {
  :root {
${semLight('    ')}
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
${semDark('      ')}
    }
  }

  :root[data-theme='dark'] {
${semDark('    ')}
  }
}
`;
}

/**
 * tokens.dark.css — la capa 2 en su forma dark, aislada. Se carga DESPUÉS de
 * tokens.css (reutiliza sus primitivos). Fuerza el tema oscuro sin depender de
 * color-scheme/light-dark(): útil para SSR, correo o carga condicional por media.
 */
export function renderDarkCss(semantic) {
  const sems = flattenSemantic(semantic);
  const decls = declBlock(sems.map((s) => ({ prop: s.name, val: `var(${s.darkVar})` })));
  return `/* Aegis UI — capa 2 en dark, aislada (generado; no editar). Cárgalo tras tokens.css. */
:root {
${decls}
}
`;
}

/** Convierte una lista de segmentos + valor en un objeto anidado. */
function nest(target, segments, value) {
  let node = target;
  for (let i = 0; i < segments.length - 1; i++) {
    node[segments[i]] ??= {};
    node = node[segments[i]];
  }
  node[segments[segments.length - 1]] = value;
}

/**
 * tailwind-preset.js — preset que mapea utilidades a `var(--aegis-*)`. Los
 * colores apuntan a la capa semántica (responden al tema); las escalas, a los
 * primitivos. Nunca lleva valores literales: cero duplicación con el CSS.
 */
export function renderTailwindPreset(primitives, semantic) {
  const colors = {};
  const walk = (node, trail) => {
    for (const [key, value] of Object.entries(node)) {
      const segments = trail.concat(key);
      if (value && typeof value === 'object' && 'light' in value && 'dark' in value) {
        // color.surface.canvas -> aegis.surface.canvas
        nest(colors, ['aegis', ...segments.slice(1)], `var(${semanticVarName(segments)})`);
      } else if (value && typeof value === 'object') {
        walk(value, segments);
      }
    }
  };
  walk(semantic['color'], ['color']);

  const scale = (group) => {
    const out = {};
    for (const [key, value] of Object.entries(primitives[group])) {
      if (typeof value === 'string') {
        out[`aegis-${key}`] = `var(${primitiveVarName([group, key])})`;
      } else {
        for (const sub of Object.keys(value)) {
          out[`aegis-${key}-${sub}`] = `var(${primitiveVarName([group, key, sub])})`;
        }
      }
    }
    return out;
  };

  const preset = {
    theme: {
      extend: {
        colors,
        spacing: scale('space'),
        borderRadius: scale('radius'),
        boxShadow: scale('elevation'),
        fontSize: (() => {
          const out = {};
          for (const key of Object.keys(primitives.font.size)) {
            out[`aegis-${key}`] = `var(${primitiveVarName(['font', 'size', key])})`;
          }
          return out;
        })(),
        fontFamily: (() => {
          const out = {};
          for (const key of Object.keys(primitives.font.family)) {
            out[`aegis-${key}`] = `var(${primitiveVarName(['font', 'family', key])})`;
          }
          return out;
        })(),
      },
    },
  };

  return `/* Aegis UI — preset de Tailwind (generado; no editar). */
export default ${JSON.stringify(preset, null, 2)};
`;
}

/** Nombres de todos los tokens, capa 1 y capa 2, para tipos y runtime. */
export function tokenNames(primitives, semantic) {
  return {
    primitive: flattenPrimitives(primitives).map((p) => p.name),
    semantic: flattenSemantic(semantic).map((s) => s.name),
  };
}

/** index.d.ts — tipos: unión de nombres de token (autocompletado) + helper. */
export function renderTypes(primitives, semantic, version) {
  const { primitive, semantic: sem } = tokenNames(primitives, semantic);
  const union = (names) => names.map((n) => `  | '${n}'`).join('\n');
  return `/* Aegis UI — tipos de token (generado; no editar). */
export type AegisPrimitiveToken =
${union(primitive)};

export type AegisSemanticToken =
${union(sem)};

export type AegisTokenName = AegisPrimitiveToken | AegisSemanticToken;

export declare const AEGIS_TOKEN_NAMES: readonly AegisTokenName[];

/** Envuelve un nombre de token en \`var(--aegis-*)\` con tipado del nombre. */
export declare function token(name: AegisTokenName): \`var(\${AegisTokenName})\`;

export declare const AEGIS_TOKENS_VERSION: '${version}';
`;
}

/** index.js — runtime: array de nombres + helper token() + versión. */
export function renderIndex(primitives, semantic, version) {
  const { primitive, semantic: sem } = tokenNames(primitives, semantic);
  const all = primitive.concat(sem);
  return `/* Aegis UI — runtime de tokens (generado; no editar). */
export const AEGIS_TOKEN_NAMES = ${JSON.stringify(all, null, 2)};

export function token(name) {
  return \`var(\${name})\`;
}

export const AEGIS_TOKENS_VERSION = '${version}';
`;
}
