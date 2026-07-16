import { booleanAttribute, computed, Directive, input } from '@angular/core';

/**
 * Brain (headless) del Button — `@aegisui/cdk` (ADR-002, brain/skin).
 *
 * Se aplica a un `<button>` NATIVO real (`button[aegisButton]`): heredamos su
 * semántica, foco y activación por teclado, y no reimplementamos lo que la
 * plataforma ya hace bien (contrato §Selector, §Accesibilidad).
 *
 * Aquí vive la ÚNICA fuente de verdad de la regla «se activa salvo si `disabled`
 * o `loading`» y del reparto de estado:
 *
 * - `disabled` → atributo NATIVO `disabled` (fuera de tabulación, sin activación;
 *   el navegador ni siquiera emite `click`).
 * - `loading`  → `aria-busy` + `aria-disabled`, **sin** `disabled` nativo, para
 *   conservar el foco; la activación se suprime interceptando el `click`.
 * - Precedencia: si `disabled` y `loading`, gana `disabled` (sin spinner ni busy).
 *
 * Teclado: NO se interceptan `Enter`/`Space`. El `<button>` nativo ya activa con
 * Enter (keydown) y Space (keyup, previniendo el scroll en keydown) emitiendo un
 * `click`; basta con gatear ese `click`. `data-handles` lo declara para el gate
 * `keyboard`.
 */
@Directive({
  selector: 'button[aegisButton]',
  exportAs: 'aegisButton',
  host: {
    '[disabled]': 'nativeDisabled()',
    '[attr.aria-busy]': "busy() ? 'true' : null",
    '[attr.aria-disabled]': "busy() ? 'true' : null",
    'data-handles': 'Enter Space',
    '(click)': 'onClick($event)',
  },
})
export class AegisButton {
  /** Deshabilitado permanente (no por carga). Refleja el `disabled` nativo. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Acción en curso. Suprime la activación conservando el foco (no usa `disabled`). */
  readonly loading = input(false, { transform: booleanAttribute });

  /** `disabled` nativo: solo por deshabilitado real (gana sobre `loading`). */
  protected readonly nativeDisabled = computed(() => this.disabled());

  /** Estado «ocupado» efectivo: cargando y no deshabilitado (precedencia). */
  readonly busy = computed(() => this.loading() && !this.disabled());

  /** Ningún `click` escapa mientras `disabled` o `loading` (evita doble envío). */
  protected onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
