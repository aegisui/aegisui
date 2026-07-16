// API pública del CLI (también consumible como librería). El ejecutable vive en
// `cli.ts` (bin). Copia-fuente estilo shadcn (ADR-003): lee de la fuente de
// `@aegisui/ui` y copia la piel; el brain (`@aegisui/cdk`) y los tokens quedan
// como dependencias del motor compartido.
export const AEGIS_CLI_VERSION = '0.1.0';
export { addComponent, findUiLibDir, type AddResult } from './add.js';
