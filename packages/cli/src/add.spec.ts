import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addComponent, findUiLibDir } from './add';

const repoUiLib = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ui', 'src', 'lib');

describe('addComponent', () => {
  let target: string;
  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), 'aegisui-cli-'));
  });
  afterEach(() => {
    rmSync(target, { recursive: true, force: true });
  });

  it('copia la piel del button (.component.ts + .css), sin specs ni stories', () => {
    const result = addComponent({ component: 'button', uiLibDir: repoUiLib, targetDir: target });
    expect(result.files).toContain('button.component.ts');
    expect(result.files).toContain('button.component.css');
    expect(result.files).not.toContain('button.component.spec.ts');
    expect(result.files.some((f) => f.endsWith('.stories.ts'))).toBe(false);
    expect(existsSync(join(target, 'button', 'button.component.ts'))).toBe(true);
    expect(existsSync(join(target, 'button', 'button.component.spec.ts'))).toBe(false);
  });

  it('la piel copiada sigue dependiendo del brain (importa @aegisui/cdk)', () => {
    addComponent({ component: 'button', uiLibDir: repoUiLib, targetDir: target });
    const source = readFileSync(join(target, 'button', 'button.component.ts'), 'utf8');
    expect(source).toContain("from '@aegisui/cdk'");
  });

  it('falla con un componente inexistente', () => {
    expect(() =>
      addComponent({ component: 'nope', uiLibDir: repoUiLib, targetDir: target }),
    ).toThrow(/No existe/);
  });
});

describe('findUiLibDir', () => {
  it('encuentra packages/ui/src/lib subiendo desde el monorepo', () => {
    const found = findUiLibDir(process.cwd());
    expect(found).not.toBeNull();
    expect(found?.replace(/\\/g, '/')).toMatch(/ui\/src\/lib$/);
  });
});
