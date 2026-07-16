import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AegisButton } from '@aegisui/cdk';

export type AegisButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type AegisButtonSize = 'sm' | 'md' | 'lg';
export type AegisButtonType = 'button' | 'submit' | 'reset';

/**
 * `<aegis-button>` — piel estilada sobre el brain `AegisButton` de `@aegisui/cdk`
 * (ADR-002, brain/skin). API signals-only, OnPush, standalone.
 *
 * Renderiza un `<button>` NATIVO real (contrato §Selector). La lógica de estado,
 * teclado, foco y supresión de activación vive en el brain (`aegisButton`); aquí
 * solo se pinta con tokens de capa 3 `--aegis-btn-*` (definidos en el CSS, dos
 * rieles: color→capa 2, estructura→capa 1; ADR-016) y se compone el spinner, la
 * etiqueta proyectada y la región `aria-live` de carga.
 */
@Component({
  selector: 'aegis-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisButton],
  // El nombre accesible vive en el `<button>` interno, no en el host `<aegis-button>`
  // (que no tiene rol). Reenviamos aria-label/labelledby al botón y los quitamos del
  // host para que no queden huérfanos ni se anuncien dos veces.
  host: {
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
  },
  template: `
    <button
      [class]="classes()"
      [attr.type]="type()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby()"
      aegisButton
      #brain="aegisButton"
      [disabled]="disabled()"
      [loading]="loading()"
    >
      @if (brain.busy()) {
        <span class="aegis-btn__spinner" aria-hidden="true"></span>
      }
      <span class="aegis-btn__label"><ng-content /></span>
      <span class="aegis-btn__sr" aria-live="polite">
        @if (brain.busy()) {
          {{ loadingLabel() }}
        }
      </span>
    </button>
  `,
  styleUrl: './button.component.css',
})
export class AegisButtonComponent {
  /** Énfasis visual/semántico. */
  readonly variant = input<AegisButtonVariant>('primary');

  /** Escala de padding, tipografía y área táctil (todas ≥ 24×24, WCAG 2.5.8). */
  readonly size = input<AegisButtonSize>('md');

  /** Deshabilitado permanente (`disabled` nativo). */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Acción en curso: spinner + `aria-busy`, conserva el foco, sin activación. */
  readonly loading = input(false, { transform: booleanAttribute });

  /** Tipo del `<button>` nativo. Default `button`: evita envíos accidentales. */
  readonly type = input<AegisButtonType>('button');

  /** Texto anunciado por lector de pantalla mientras `loading` (`aria-live`). */
  readonly loadingLabel = input('Cargando…');

  /**
   * Nombre accesible cuando no hay texto proyectado (botón solo-icono). Se
   * reenvía al `<button>` interno; obligatorio si el contenido es solo un icono.
   */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });

  /** `aria-labelledby` reenviado al `<button>` interno. */
  readonly ariaLabelledby = input<string | undefined>(undefined, { alias: 'aria-labelledby' });

  protected readonly classes = computed(
    () => `aegis-btn aegis-btn--${this.variant()} aegis-btn--${this.size()}`,
  );
}
