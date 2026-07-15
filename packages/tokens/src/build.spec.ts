import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  flattenPrimitives,
  flattenSemantic,
  renderTokensCss,
  renderDarkCss,
  renderTailwindPreset,
  renderTypes,
  renderIndex,
} from '../scripts/lib/generate.mjs';

/**
 * Valida la SALIDA del build (commit 2) sin tocar disco: ejercita las mismas
 * funciones puras que usa build-tokens.mjs. Prueba los dos mecanismos de dark de
 * §5.2, la cero-duplicación (semánticos/dark/preset son solo `var()`), la
 * integridad de referencias y que tipos + runtime salen coherentes.
 */

const readJson = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8'));

const primitives = readJson('primitives.json');
const semantic = readJson('semantic.json');
const version = readJson('../package.json').version as string;

const HEX = /#[0-9a-f]{6}\b/i;
const evalModule = (src: string) =>
  import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(src)}`);

describe('tokens.css — dos mecanismos de dark (§5.2)', () => {
  const css = renderTokensCss(primitives, semantic);

  it('activa light-dark() vía color-scheme en :root', () => {
    expect(css).toContain('color-scheme: light dark;');
    expect(css).toContain(
      '--aegis-color-surface-canvas: light-dark(var(--aegis-neutral-0), var(--aegis-neutral-950));',
    );
  });

  it('permite conmutación manual con [data-theme]', () => {
    expect(css).toContain(":root[data-theme='dark'] {\n  color-scheme: dark;");
    expect(css).toContain(":root[data-theme='light'] {\n  color-scheme: light;");
  });

  it('trae fallback para navegadores sin light-dark(): prefers-color-scheme + [data-theme]', () => {
    expect(css).toContain('@supports not (color: light-dark(');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(":root:not([data-theme='light'])");
  });

  it('los primitivos son los únicos con valores literales', () => {
    expect(css).toContain('--aegis-jade-600: #0a7d63;');
    expect(css).toContain('--aegis-space-4: 1rem;');
  });
});

describe('cero duplicación — una sola fuente de verdad', () => {
  it('tokens.dark.css no repite ningún hex: solo referencia primitivos', () => {
    expect(renderDarkCss(semantic)).not.toMatch(HEX);
  });

  it('el preset de Tailwind no repite ningún hex: solo var(--aegis-*)', () => {
    expect(renderTailwindPreset(primitives, semantic)).not.toMatch(HEX);
  });

  it('toda referencia semántica apunta a un primitivo existente', () => {
    const primNames = new Set(flattenPrimitives(primitives).map((p) => p.name));
    for (const s of flattenSemantic(semantic)) {
      expect(primNames, `${s.name} → ${s.lightVar}`).toContain(s.lightVar);
      expect(primNames, `${s.name} → ${s.darkVar}`).toContain(s.darkVar);
    }
  });
});

describe('preset de Tailwind — ejecutable y mapeado a semánticos', () => {
  it('expone colores que apuntan a la capa 2', async () => {
    const mod = await evalModule(renderTailwindPreset(primitives, semantic));
    const colors = mod.default.theme.extend.colors;
    expect(colors.aegis.accent.solid).toBe('var(--aegis-color-accent-solid)');
    expect(colors.aegis.state.success.bg).toBe('var(--aegis-color-state-success-bg)');
    expect(mod.default.theme.extend.spacing['aegis-4']).toBe('var(--aegis-space-4)');
  });
});

describe('tipos + runtime — autocompletado de nombres de token', () => {
  it('los tipos incluyen la unión capa 1 + capa 2 y la versión', () => {
    const dts = renderTypes(primitives, semantic, version);
    expect(dts).toContain("| '--aegis-jade-600'");
    expect(dts).toContain("| '--aegis-color-accent-solid'");
    expect(dts).toContain('export type AegisTokenName');
    expect(dts).toContain(`export declare const AEGIS_TOKENS_VERSION: '${version}';`);
  });

  it('el runtime expone token(), los nombres y la versión', async () => {
    const mod = await evalModule(renderIndex(primitives, semantic, version));
    expect(mod.AEGIS_TOKENS_VERSION).toBe(version);
    expect(mod.token('--aegis-color-accent-solid')).toBe('var(--aegis-color-accent-solid)');
    expect(mod.AEGIS_TOKEN_NAMES).toContain('--aegis-jade-600');
    expect(mod.AEGIS_TOKEN_NAMES).toContain('--aegis-color-state-danger-text');
  });
});
