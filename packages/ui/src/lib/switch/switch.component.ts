import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  viewChild,
} from '@angular/core';
import { AegisSwitch } from '@aegisui/cdk';

export type AegisSwitchSize = 'sm' | 'md' | 'lg';

let nextId = 0;

/**
 * `<aegis-switch>` — piel estilada sobre el brain `AegisSwitch` de
 * `@aegisui/cdk` (ADR-002, brain/skin). API signals-only, OnPush, standalone.
 *
 * Renderiza un `<label>` **y** un `<button role="switch">` nativos reales
 * (contrato §Selector). Igual que el Input, el componente POSEE la relación
 * `for`/`id` entre ambos — no la delega al consumidor — para que sea
 * verificable en CI: el consumidor solo aporta el *texto* de la etiqueta.
 *
 * El texto del `<label>` NO incluye el estado ("Notificaciones", nunca
 * "Notificaciones activadas"): el estado lo aporta `aria-checked`; meterlo en
 * el nombre accesible lo anunciaría dos veces y rompería 2.5.3 al cambiar.
 *
 * SIN región live, y es deliberado (ADR-019 + contrato §Anuncios): `aria-checked`
 * es un cambio de estado ARIA sobre un control enfocado, que los lectores ya
 * anuncian nativamente. No hay `aria-live`, ni `role="alert"`, ni `role="status"`
 * en ningún nodo de este componente, y un test de regresión lo verifica para que
 * nadie añada uno "por si acaso".
 *
 * La pista y el pulgar son `aria-hidden`: son ornamento: el estado ya viaja por
 * `aria-checked` del `<button>`, y exponerlos duplicaría la información.
 */
@Component({
  selector: 'aegis-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisSwitch],
  // El `id` del host se anula: el que importa es el del `<button>` interno (al
  // que apunta el `<label for>`). Sin esto, un `id` estático en
  // `<aegis-switch id="...">` quedaría duplicado en el DOM. Mismo patrón que el Input.
  host: {
    '[attr.id]': 'null',
  },
  template: `
    <button
      aegisSwitch
      #brain="aegisSwitch"
      [class]="classes()"
      [id]="resolvedId()"
      [checked]="checked()"
      (checkedChange)="checked.set($event)"
      [disabled]="disabled()"
    >
      <span class="aegis-switch__track" aria-hidden="true">
        <span class="aegis-switch__thumb"></span>
      </span>
    </button>
    <label [for]="resolvedId()" class="aegis-switch__label">{{ label() }}</label>
  `,
  styleUrl: './switch.component.css',
})
export class AegisSwitchComponent {
  /** Texto del `<label>` que el propio componente renderiza y asocia. */
  readonly label = input('');

  /** Estado del interruptor, two-way. */
  readonly checked = model(false);

  readonly disabled = input(false, { transform: booleanAttribute });

  readonly size = input<AegisSwitchSize>('md');

  /** `id` propio; si no se aporta, se autogenera (ver `resolvedId`). */
  readonly id = input<string | undefined>(undefined);

  protected readonly classes = computed(() => `aegis-switch aegis-switch--${this.size()}`);

  /** Id estable por instancia, usado solo si el consumidor no aporta el suyo. */
  private readonly autoId = `aegis-switch-${nextId++}`;

  protected readonly resolvedId = computed(() => this.id() ?? this.autoId);

  private readonly brain = viewChild.required(AegisSwitch);

  /**
   * Enfoca el control real. Delega en el brain (`.focus()` real vive en
   * `AegisSwitch.focus()`); esta línea solo REENVÍA la llamada, patrón que
   * `cdk-before-ui` reconoce como forwarding y no como lógica de foco.
   */
  focus(): void {
    this.brain().focus();
  }
}
