import { Directive } from '@angular/core';

/**
 * Brain (headless) de `Button` — `@aegisui/cdk` (ADR-002).
 *
 * Aquí vive la LÓGICA reutilizable (estado, teclado, foco, ARIA). Sin estilos:
 * la piel estilada la pone `@aegisui/ui`. Compón esta directiva en el componente
 * de `ui` vía `hostDirectives`.
 */
@Directive({
  selector: '[aegisButton]',
})
export class AegisButton {}
