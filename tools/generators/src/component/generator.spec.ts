import { beforeEach, describe, expect, it } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { componentGenerator } from './generator';

/** Barrels de partida, como en el repo real. */
function seed(tree: Tree): void {
  tree.write('packages/cdk/src/public-api.ts', `export const AEGIS_CDK_VERSION = '0.1.0';\n`);
  tree.write('packages/ui/src/public-api.ts', `export const AEGIS_UI_VERSION = '0.1.0';\n`);
}

describe('componentGenerator', () => {
  let tree: Tree;
  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('raíl contrato-primero: falla si no existe docs/contracts/<name>.md', async () => {
    await expect(componentGenerator(tree, { name: 'button' })).rejects.toThrow(/contrato/i);
    // Y no deja nada a medias.
    expect(tree.exists('packages/ui/src/lib/button/button.component.ts')).toBe(false);
  });

  it('rechaza nombres que no son kebab-case', async () => {
    tree.write('docs/contracts/Button.md', '# x');
    await expect(componentGenerator(tree, { name: 'Button' })).rejects.toThrow(/kebab/i);
  });

  describe('con contrato presente', () => {
    beforeEach(() => {
      tree.write('docs/contracts/button.md', '# Contrato: Button\n');
    });

    it('genera el brain en cdk y la piel en ui', async () => {
      await componentGenerator(tree, { name: 'button' });
      expect(tree.exists('packages/cdk/src/lib/button/button.ts')).toBe(true);
      expect(tree.exists('packages/cdk/src/lib/button/button.spec.ts')).toBe(true);
      expect(tree.exists('packages/ui/src/lib/button/button.component.ts')).toBe(true);
      expect(tree.exists('packages/ui/src/lib/button/button.component.css')).toBe(true);
      expect(tree.exists('packages/ui/src/lib/button/button.component.spec.ts')).toBe(true);
      expect(tree.exists('packages/ui/src/lib/button/button.stories.ts')).toBe(true);
    });

    it('el componente de ui es OnPush, standalone (sin NgModule), selector aegis-button', async () => {
      await componentGenerator(tree, { name: 'button' });
      const c = tree.read('packages/ui/src/lib/button/button.component.ts', 'utf-8') ?? '';
      expect(c).toContain("selector: 'aegis-button'");
      expect(c).toContain('ChangeDetectionStrategy.OnPush');
      expect(c).toContain('export class AegisButtonComponent');
      expect(c).not.toMatch(/@NgModule/);
      expect(c).not.toMatch(/@Input\(|@Output\(/);
    });

    it('el brain de cdk es una directiva sin estilos', async () => {
      await componentGenerator(tree, { name: 'button' });
      const d = tree.read('packages/cdk/src/lib/button/button.ts', 'utf-8') ?? '';
      expect(d).toContain('@Directive');
      expect(d).toContain('export class AegisButton');
      expect(d).not.toContain('styleUrl');
    });

    it('el CSS de la piel no lleva literales de diseño ni la palabra dark', async () => {
      await componentGenerator(tree, { name: 'button' });
      const css = tree.read('packages/ui/src/lib/button/button.component.css', 'utf-8') ?? '';
      expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
      expect(css).not.toMatch(/\bdark\b/);
    });

    it('engancha ambos barrels public-api y es idempotente', async () => {
      await componentGenerator(tree, { name: 'button' });
      const ui = tree.read('packages/ui/src/public-api.ts', 'utf-8') ?? '';
      const cdk = tree.read('packages/cdk/src/public-api.ts', 'utf-8') ?? '';
      expect(ui).toContain("export * from './lib/button/button.component';");
      expect(cdk).toContain("export * from './lib/button/button';");

      await componentGenerator(tree, { name: 'button' });
      const ui2 = tree.read('packages/ui/src/public-api.ts', 'utf-8') ?? '';
      expect(ui2.match(/lib\/button\/button\.component/g)?.length).toBe(1);
    });

    it('usa PascalCase en nombres compuestos (form-field -> AegisFormField)', async () => {
      tree.write('docs/contracts/form-field.md', '# x');
      await componentGenerator(tree, { name: 'form-field' });
      const c = tree.read('packages/ui/src/lib/form-field/form-field.component.ts', 'utf-8') ?? '';
      expect(c).toContain('export class AegisFormFieldComponent');
      expect(c).toContain("selector: 'aegis-form-field'");
    });
  });
});
