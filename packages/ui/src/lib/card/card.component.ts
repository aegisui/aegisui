import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AegisCardPadding = 'none' | 'sm' | 'md' | 'lg';
export type AegisCardElevation = 'flat' | 'raised';

/**
 * `<aegis-card>` — contenedor con superficie, borde, radio y padding por tokens.
 *
 * **NO tiene brain en `@aegisui/cdk`, y es deliberado** (ADR-002): la Card no
 * tiene foco, ni teclado, ni posicionamiento, ni estado — no hay lógica que
 * separar. Un `AegisCard` vacío en `cdk` sería código muerto, del mismo tipo que
 * los tokens que `tokens-declared-in-contract` caza. El generador lo scaffoldea
 * por defecto; aquí se retiró a propósito.
 *
 * **Sin rol ARIA, también deliberado** (contrato §Rol ARIA): `role="region"`
 * convertiría ocho tarjetas de feature en ocho landmarks anónimos, inundando la
 * herramienta de navegación que existe para saltar rápido a lo importante. La
 * semántica la aporta el consumidor, envolviendo la Card en el elemento correcto
 * o proyectando dentro el encabezado del nivel que corresponda a SU página — el
 * componente no puede saber si es `h2` o `h4`, y fijar uno rompería la jerarquía
 * de encabezados (1.3.1) en la mitad de los usos.
 *
 * **No interactiva en v1** (contrato §Fuera de alcance): sin `hover`, sin
 * `click` propio, sin `tabindex`. Una card clicable entera tiene tres trampas de
 * a11y que no se resuelven aquí; un `<aegis-button>` o un enlace DENTRO cubre el
 * caso sin ninguna de ellas.
 */
@Component({
  selector: 'aegis-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
  styleUrl: './card.component.css',
})
export class AegisCardComponent {
  /** Espaciado interior. `none` para contenido a sangre (imagen de cabecera). */
  readonly padding = input<AegisCardPadding>('md');

  /** `flat`: superficie + borde (el borde es la señal de límite). `raised`: + sombra. */
  readonly elevation = input<AegisCardElevation>('flat');

  protected readonly classes = computed(
    () => `aegis-card aegis-card--p-${this.padding()} aegis-card--${this.elevation()}`,
  );
}
