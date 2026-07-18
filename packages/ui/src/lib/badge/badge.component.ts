import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AegisBadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type AegisBadgeSize = 'sm' | 'md';

/**
 * `<aegis-badge>` — etiqueta corta de estado o categoría ("Activo", "Beta").
 *
 * **Sin brain en `@aegisui/cdk`**, igual que la Card y por la misma razón: no hay
 * lógica que separar (sin foco, sin teclado, sin estado). Es texto estilado.
 *
 * **Todas las variantes son TINTE + texto oscuro, nunca sólido con texto blanco**
 * (ADR-014/015, contrato §Riel de color). Un badge es ESTADO, no acción: _jade es
 * lo que pulsas, el estado es lo que lees_. Por eso `danger` mapea a
 * `state.danger.*` y **nunca** a `destructive.*` (que es la acción que borra), y
 * `accent` usa el par de tinte `accent.bg`/`accent.text`, no el par sólido del
 * botón primario. Tres tests de raíl lo verifican sobre el CSS.
 *
 * **El color NO comunica solo** (1.4.1): `variant` es refuerzo visual redundante,
 * nunca el portador del significado. El componente no puede impedir que alguien
 * ponga cinco badges con el texto "Estado" y distinto color, así que se documenta
 * como regla de uso — ver la story y el contrato.
 *
 * **Uso decorativo:** si el badge duplica información ya presente en el texto
 * adyacente, el consumidor lo oculta con `aria-hidden="true"` en el host. Funciona
 * sin ayuda del componente precisamente porque el Badge no es enfocable ni
 * contiene nada enfocable — no se crea el fallo clásico de `aria-hidden`. No se
 * expone un input `decorative`: sería una segunda forma de hacer lo que un
 * atributo HTML estándar ya hace, y solo el consumidor sabe si hay duplicación.
 */
@Component({
  selector: 'aegis-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
  styleUrl: './badge.component.css',
})
export class AegisBadgeComponent {
  /** Familia de color del tinte. Solo comunica JUNTO al texto, nunca en su lugar. */
  readonly variant = input<AegisBadgeVariant>('neutral');

  readonly size = input<AegisBadgeSize>('md');

  protected readonly classes = computed(
    () => `aegis-badge aegis-badge--${this.variant()} aegis-badge--${this.size()}`,
  );
}
