import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

let nextId = 0;

/**
 * Brain (headless) del Input — `@aegisui/cdk` (ADR-002, brain/skin).
 *
 * Se aplica a un `<input>` NATIVO real (`input[aegisInput]`): heredamos su
 * edición de texto, selección, portapapeles y autocompletado, y no
 * reimplementamos nada de eso (contrato §Selector, §Accesibilidad).
 *
 * Aquí vive la ÚNICA fuente de verdad de:
 * - el `id` del campo (auto-generado si el consumidor no aporta uno, para que
 *   el `<label for>` que pinta `ui` siempre tenga a qué apuntar).
 * - la composición de `aria-describedby` (ayuda + error, omitiendo el que
 *   falte — nunca un `aria-describedby=""` vacío).
 * - el reflejo de `aria-invalid`/`aria-required` (ausentes, no `"false"`,
 *   cuando no aplican: una AT no necesita que se le diga "no inválido").
 * - `focused`, el estado de foco real del campo (ADR-019 regla 4): `ui` lo usa
 *   para congelar el texto que `aria-describedby` señala mientras el campo
 *   tiene foco — territorio de foco, vive aquí, no en `ui`.
 * - `focus()`, porque `.focus()` es territorio del cdk (regla
 *   `cdk-before-ui`): ninguna llamada a `.focus()` puede vivir en `ui`.
 */
@Directive({
  selector: 'input[aegisInput]',
  exportAs: 'aegisInput',
  host: {
    '[attr.id]': 'id()',
    '[disabled]': 'disabled()',
    '[readOnly]': 'readonly()',
    '[required]': 'required()',
    '[attr.aria-required]': "required() ? 'true' : null",
    '[attr.aria-invalid]': "invalid() ? 'true' : null",
    '[attr.aria-describedby]': 'describedBy()',
    '(focus)': 'focused.set(true)',
    '(blur)': 'focused.set(false)',
  },
})
export class AegisInput {
  private readonly elementRef = inject(ElementRef<HTMLInputElement>);

  /** id propio del campo. Auto-generado si el consumidor no aporta uno. */
  readonly id = input<string>(`aegis-input-${nextId++}`);

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });

  /** ids de `helpText`/`errorMessage` en `ui`, o `undefined` si no existen. */
  readonly helpId = input<string | undefined>(undefined);
  readonly errorId = input<string | undefined>(undefined);

  /** `aria-describedby` compuesto: solo los ids que de verdad existen. */
  readonly describedBy = computed(() => {
    const ids = [this.helpId(), this.errorId()].filter((v): v is string => !!v);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /**
   * Estado de foco real del `<input>` (ADR-019 regla 4). `(focus)`/`(blur)`
   * nativos, escuchados aquí directamente sobre el propio elemento — no hay
   * problema de burbujeo porque el host de esta directiva ES el elemento.
   */
  readonly focused = signal(false);

  /** Enfoca el campo real. Expuesto para consumidores (p. ej. tras validar un formulario). */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }
}
