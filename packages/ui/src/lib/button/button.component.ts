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

let nextSrId = 0;

/**
 * `<aegis-button>` — piel estilada sobre el brain `AegisButton` de `@aegisui/cdk`
 * (ADR-002, brain/skin). API signals-only, OnPush, standalone.
 *
 * Renderiza un `<button>` NATIVO real (contrato §Selector). La lógica de estado,
 * teclado, foco y supresión de activación vive en el brain (`aegisButton`); aquí
 * solo se pinta con tokens de capa 3 `--aegis-btn-*` (definidos en el CSS, dos
 * rieles: color→capa 2, estructura→capa 1; ADR-016) y se compone el spinner, la
 * etiqueta proyectada y el texto de estado de carga.
 *
 * El estado de carga se anuncia con un `<span>` hermano con **`aria-live="polite"`,
 * SIN `aria-describedby` en el `<button>`** (ADR-019, Regla 2: notificación
 * transitoria de estado → solo aria-live). Su texto se interpola plano (muta in
 * situ, no recrea el nodo). VoiceOver NO reanuncía `aria-describedby` cuando cambia
 * el nodo descrito en caliente — `aria-live` es el único canal que VoiceOver honra
 * para notificaciones live. Si el span estuviera también en `aria-describedby`, NVDA
 * recibiría el anuncio dos veces (live + relectura nativa de la descripción). El
 * `<span>` es HERMANO del `<button>` (no anidado: una descripción anidada en un
 * control con nombre-por-contenido se computa como parte del nombre accesible, no
 * como descripción independiente). Distinto del Input: su error es una descripción
 * PERSISTENTE → describedby-solo, sin live region (ADR-019, Regla 1).
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
    </button>
    <span class="aegis-btn__sr" [id]="srId" aria-live="polite">{{
      brain.busy() ? loadingLabel() : ''
    }}</span>
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

  /** Texto anunciado por `aria-live` mientras `loading`. */
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

  /** Id único del `<span>` aria-live de estado (hermano del botón). */
  protected readonly srId = `aegis-btn-sr-${nextSrId++}`;
}
