import { booleanAttribute, Directive, ElementRef, inject, input, model } from '@angular/core';

let nextId = 0;

/**
 * Brain (headless) del Switch — `@aegisui/cdk` (ADR-002, brain/skin).
 *
 * Se aplica a un `<button type="button">` NATIVO real
 * (`button[aegisSwitch]`), NO a un `<input type="checkbox">` disfrazado ni a un
 * `<div>` con `tabindex` (contrato §Selector). Del `<button>` heredamos gratis
 * foco, `:disabled` real, y la activación por `Enter` y `Space` — que el
 * navegador ya sintetiza como `click`.
 *
 * Por eso aquí NO hay ningún `keydown`: interceptar teclas sería reimplementar
 * lo que la plataforma ya hace bien (SPEC §8, contrato §Teclado). Solo se
 * escucha `click`.
 *
 * `aria-checked` se refleja SIEMPRE con valor explícito (`"true"`/`"false"`), a
 * diferencia del `aria-invalid` del Input (donde la ausencia es la señal
 * neutra): `role="switch"` EXIGE `aria-checked` por especificación ARIA — un
 * switch sin él no es un switch, es un botón.
 *
 * El cambio de estado NO lleva región live (ADR-019): `aria-checked` es un
 * cambio de ESTADO ARIA sobre un control enfocado, que los lectores anuncian
 * nativamente. Añadir `aria-live` encima sería la Regla 3 de ADR-019 (dos
 * canales sobre el mismo contenido -> doble anuncio en NVDA/JAWS).
 */
@Directive({
  selector: 'button[aegisSwitch]',
  exportAs: 'aegisSwitch',
  host: {
    type: 'button',
    role: 'switch',
    '[attr.id]': 'id()',
    '[disabled]': 'disabled()',
    // Siempre explícito, nunca ausente: lo exige role="switch".
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
    '(click)': 'toggle()',
  },
})
export class AegisSwitch {
  private readonly elementRef = inject(ElementRef<HTMLButtonElement>);

  /** id propio del control. Auto-generado si el consumidor no aporta uno. */
  readonly id = input<string>(`aegis-switch-${nextId++}`);

  /** Estado del interruptor, two-way. */
  readonly checked = model(false);

  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Alterna el estado. No hace nada si está deshabilitado: el atributo nativo
   * `disabled` ya impide el `click` del usuario, pero `toggle()` es público y
   * un consumidor podría llamarlo directamente — la guarda mantiene la promesa
   * del contrato ("con `disabled`, activar no cambia `checked`") en las dos
   * vías, no solo en la que el navegador protege.
   */
  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.checked.set(!this.checked());
  }

  /** Enfoca el control real. `.focus()` es territorio del cdk (`cdk-before-ui`). */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }
}
