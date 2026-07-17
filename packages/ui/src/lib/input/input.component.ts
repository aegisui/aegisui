import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  viewChild,
} from '@angular/core';
import { AegisInput } from '@aegisui/cdk';

export type AegisInputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
export type AegisInputSize = 'sm' | 'md' | 'lg';

let nextId = 0;

/**
 * `<aegis-input>` — piel estilada sobre el brain `AegisInput` de `@aegisui/cdk`
 * (ADR-002, brain/skin). API signals-only, OnPush, standalone.
 *
 * Renderiza un `<label>` **y** un `<input>` nativos reales (contrato
 * §Selector). El componente POSEE la relación `for`/`id` entre ambos — no la
 * delega al consumidor — precisamente para que sea verificable en CI (contrato
 * §Accesibilidad, «el corazón de la a11y de un input»): el consumidor solo
 * aporta el *texto* de la etiqueta.
 *
 * El anuncio del error usa DOS nodos separados (ADR-019, patrón `srId` del
 * Button generalizado): el `<span id>` enlazado por `aria-describedby` está
 * SIEMPRE presente (vacío si no hay error) — la relación describedby nunca se
 * crea ni se destruye con el campo ya enfocado, solo cambia su texto — y un
 * `<span role="alert">` aparte, oculto y fuera de `aria-describedby`, cuyo
 * único trabajo es disparar el anuncio dinámico. Mezclar ambos papeles en un
 * solo nodo hacía que NVDA anunciara el error dos veces (una por la región
 * live, otra al releer la descripción cuya relación acababa de aparecer);
 * VoiceOver lo colapsaba, por eso no se veía en el primer pase manual.
 * Verificación MANUAL con lector de pantalla obligatoria antes de release
 * (SPEC §8.5): NVDA debe anunciarlo una sola vez al aparecer, y seguir
 * reanunciándolo al reenfocar más tarde.
 */
@Component({
  selector: 'aegis-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisInput],
  // El `id` del host se anula: el que importa es el del `<input>` interno (que
  // el `<label for>` referencia). Sin esto, un `id` estático en `<aegis-input
  // id="...">` quedaría duplicado en el DOM (host + input interno).
  host: {
    '[attr.id]': 'null',
  },
  template: `
    <label [for]="resolvedId()" class="aegis-input__label">
      {{ label() }}
      @if (required()) {
        <span class="aegis-input__required" aria-hidden="true">*</span>
      }
    </label>
    <input
      aegisInput
      #brain="aegisInput"
      [class]="classes()"
      [attr.type]="type()"
      [attr.placeholder]="placeholder()"
      [id]="resolvedId()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [required]="required()"
      [invalid]="invalid()"
      [helpId]="helpId()"
      [errorId]="errorId()"
      [value]="value()"
      (input)="onInput($event)"
    />
    @if (helpText()) {
      <span class="aegis-input__help" [id]="helpId()">{{ helpText() }}</span>
    }
    <span class="aegis-input__error" [id]="errorId()">
      @if (invalid() && errorMessage()) {
        {{ errorMessage() }}
      }
    </span>
    <span class="aegis-input__error-live" role="alert">
      @if (invalid() && errorMessage()) {
        {{ errorMessage() }}
      }
    </span>
  `,
  styleUrl: './input.component.css',
})
export class AegisInputComponent {
  /** Texto del `<label>` que el propio componente renderiza y asocia. */
  readonly label = input('');

  /** Tipo del `<input>` nativo. */
  readonly type = input<AegisInputType>('text');

  /** Contenido del campo, two-way. Siempre `string` (v1 no hace coerción numérica). */
  readonly value = model('');

  readonly placeholder = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  /** Señal manual de validez (el consumidor decide cuándo el campo es inválido). */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Solo se PINTA (y se anuncia) cuando `invalid()` es `true`; el `<span>` de
   * descripción existe siempre (ADR-019), así que el texto se muestra u oculta
   * pero la relación `aria-describedby` nunca se crea en caliente. */
  readonly errorMessage = input<string | undefined>(undefined);

  /** Texto de ayuda persistente, independiente de `invalid`. */
  readonly helpText = input<string | undefined>(undefined);

  readonly size = input<AegisInputSize>('md');

  /** `id` propio del campo; si no se aporta, se autogenera (ver `resolvedId`). */
  readonly id = input<string | undefined>(undefined);

  protected readonly classes = computed(() => `aegis-input aegis-input--${this.size()}`);

  /** Id estable por instancia, usado solo si el consumidor no aporta el suyo. */
  private readonly autoId = `aegis-input-${nextId++}`;

  protected readonly resolvedId = computed(() => this.id() ?? this.autoId);

  protected readonly helpId = computed(() =>
    this.helpText() ? `${this.resolvedId()}-help` : undefined,
  );

  /** Siempre definido (ADR-019): la relación aria-describedby con el error
   * nunca se crea/destruye en caliente, solo cambia el texto del span. */
  protected readonly errorId = computed(() => `${this.resolvedId()}-error`);

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  private readonly brain = viewChild.required(AegisInput);

  /**
   * Enfoca el campo real. Delega en el brain (`.focus()` real vive en
   * `AegisInput.focus()`, `@aegisui/cdk`); esta línea solo REENVÍA la llamada.
   * `cdk-before-ui` reconoce el patrón `this.<viewChild>().focus()` como
   * forwarding, no como lógica de foco (ver docstring de la regla).
   */
  focus(): void {
    this.brain().focus();
  }
}
