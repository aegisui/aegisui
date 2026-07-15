import { formatFiles, generateFiles, names, Tree, joinPathFragments } from '@nx/devkit';
import { ComponentGeneratorSchema } from './schema';

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Generador `@aegisui/generators:component` (SPEC §4, Fase 3/4).
 *
 * Scaffolda un componente con la arquitectura brain/skin (ADR-002):
 *   - `packages/cdk/src/lib/<name>/`  → primitiva headless (la lógica).
 *   - `packages/ui/src/lib/<name>/`   → piel estilada sobre el brain + spec + story.
 * y engancha ambos `public-api.ts`.
 *
 * Raíl contrato-primero (SPEC §6): se NIEGA a scaffoldar si no existe
 * `docs/contracts/<name>.md`. Sin contrato aprobado no hay código; el propio
 * `nx g` lo hace cumplir, no solo el lint.
 */
export async function componentGenerator(
  tree: Tree,
  options: ComponentGeneratorSchema,
): Promise<void> {
  const name = options.name?.trim();
  if (!name || !KEBAB.test(name)) {
    throw new Error(
      `Nombre inválido: "${options.name}". Usa kebab-case (p. ej. "button", "form-field").`,
    );
  }

  const contractPath = joinPathFragments('docs', 'contracts', `${name}.md`);
  if (!tree.exists(contractPath)) {
    throw new Error(
      `No existe el contrato ${contractPath}. Contrato-primero (SPEC §6): apruébalo en un PR aparte antes de generar el componente.`,
    );
  }

  const n = names(name); // { fileName, className, propertyName, constantName }
  const substitutions = {
    ...n,
    name,
    selector: `aegis-${n.fileName}`,
    tmpl: '', // convención devkit: sufijo de plantilla que se elimina
  };

  // El nombre de la carpeta del componente lo pone la plantilla `__fileName__`,
  // así que el target es el `lib/` del paquete (no `lib/<name>`).
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files', 'cdk'),
    joinPathFragments('packages', 'cdk', 'src', 'lib'),
    substitutions,
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files', 'ui'),
    joinPathFragments('packages', 'ui', 'src', 'lib'),
    substitutions,
  );

  addBarrelExport(tree, 'packages/cdk/src/public-api.ts', `./lib/${n.fileName}/${n.fileName}`);
  addBarrelExport(
    tree,
    'packages/ui/src/public-api.ts',
    `./lib/${n.fileName}/${n.fileName}.component`,
  );

  await formatFiles(tree);
}

/** Añade `export * from '<path>';` al barrel si no está ya. Idempotente. */
function addBarrelExport(tree: Tree, barrel: string, path: string): void {
  const line = `export * from '${path}';`;
  const current = tree.exists(barrel) ? (tree.read(barrel, 'utf-8') ?? '') : '';
  if (current.includes(line)) {
    return;
  }
  const next = current.endsWith('\n') || current === '' ? current : `${current}\n`;
  tree.write(barrel, `${next}${line}\n`);
}

export default componentGenerator;
