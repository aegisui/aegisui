/* Tipos de las funciones de generación (el módulo es JS ESM sin dependencias). */
export function primitiveVarName(segments: string[]): string;
export function semanticVarName(segments: string[]): string;
export function refToVarName(ref: string): string;
export function flattenPrimitives(primitives: unknown): Array<{ name: string; value: string }>;
export function flattenSemantic(
  semantic: unknown,
): Array<{ name: string; lightVar: string; darkVar: string }>;
export function renderTokensCss(primitives: unknown, semantic: unknown): string;
export function renderDarkCss(semantic: unknown): string;
export function renderTailwindPreset(primitives: unknown, semantic: unknown): string;
export function tokenNames(
  primitives: unknown,
  semantic: unknown,
): { primitive: string[]; semantic: string[] };
export function renderTypes(primitives: unknown, semantic: unknown, version: string): string;
export function renderIndex(primitives: unknown, semantic: unknown, version: string): string;
