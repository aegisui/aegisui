#!/usr/bin/env node
import { join } from 'node:path';
import { addComponent, findUiLibDir } from './add.js';

/** `aegisui add <component> [--to <dir>]` — copia-fuente estilo shadcn (ADR-003). */
function main(argv: readonly string[]): void {
  const [command, component, ...rest] = argv;

  if (command !== 'add' || !component) {
    console.error('Uso: aegisui add <component> [--to <dir>]');
    console.error('  p. ej.: npx aegisui add button');
    process.exit(1);
  }

  const toIndex = rest.indexOf('--to');
  const targetDir =
    toIndex >= 0 && rest[toIndex + 1]
      ? rest[toIndex + 1]
      : join(process.cwd(), 'src', 'components', 'aegisui');

  const uiLibDir = findUiLibDir(process.cwd());
  if (!uiLibDir) {
    console.error(
      'No encuentro la fuente de @aegisui/ui. Instálalo (`npm i @aegisui/ui`) o ejecuta dentro del monorepo.',
    );
    process.exit(1);
  }

  try {
    const result = addComponent({ component, uiLibDir, targetDir });
    console.log(`✔ ${result.component}: ${result.files.length} fichero(s) → ${result.targetDir}`);
    for (const file of result.files) {
      console.log(`  + ${file}`);
    }
    console.log(
      '\nAhora eres dueño de esta piel. Dependencias del motor compartido:\n' +
        '  npm i @aegisui/cdk @aegisui/tokens',
    );
  } catch (error) {
    console.error(`✖ ${(error as Error).message}`);
    process.exit(1);
  }
}

main(process.argv.slice(2));
