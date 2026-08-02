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
export type AegisInputLabelMode = 'stacked' | 'floating';
export type AegisInputLabelFloatStyle = 'inset' | 'notched';

let nextId = 0;

/**
 * `<aegis-input>` — piel estilada sobre el brain `AegisInput` de `@aegisui/cdk`
 * (ADR-002, brain/skin). API signals-only, OnPush, standalone.
 *
 * Renderiza un `<label>` **y** un `<input>` nativos reales (contrato §Selector).
 * El componente POSEE la relación `for`/`id` entre ambos — no la delega al
 * consumidor — para que sea verificable en CI: el consumidor solo aporta el
 * *texto* de la etiqueta.
 *
 * Error: solo `aria-describedby` + `aria-invalid`, sin región live (ADR-019).
 * NVDA/JAWS reannuncian nativamente la descripción del campo enfocado; añadir
 * aria-live lo duplica en NVDA/JAWS y rompe describedby en VoiceOver.
 *
 * `labelMode='floating'`: etiqueta dentro del campo en reposo, elevada al
 * enfocar / rellenar / autocompletar, exclusivamente por CSS (contrato §Autofill).
 * La relación label/input no cambia entre modos — el AT no percibe diferencia.
 */
@Component({
  selector: 'aegis-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisInput],
  // El `id` del host se anula: el que importa es el del `<input>` interno (que
  // el `<label for>` referencia). Sin esto, un `id` estático en `<aegis-input
  // id="...">` quedaría duplicado en el DOM (host + input interno).
  host: { '[attr.id]': 'null' },
  template: `
    @if (labelMode() === 'stacked') {
      <!-- STACKED (default): estructura original inalterada — label encima del input -->
      <label [for]="resolvedId()" class="aegis-input__label">
        {{ label() }}
        @if (required()) {
          <span class="aegis-input__required" aria-hidden="true">*</span>
        }
      </label>
      <input
        aegisInput
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
    } @else {
      <!-- FLOATING: wrapper provee position:relative y :focus-within.
           El input va ANTES que la etiqueta como hermano para que los selectores
           CSS sibling (~) puedan apuntar al label desde el estado del input. -->
      <div class="aegis-input__float-wrapper">
        <input
          aegisInput
          [class]="classes()"
          [attr.type]="type()"
          [attr.placeholder]="floatPlaceholder()"
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
        <label [for]="resolvedId()" class="aegis-input__label aegis-input__label--float">
          {{ label() }}
          @if (required()) {
            <span class="aegis-input__required" aria-hidden="true">*</span>
          }
        </label>
      </div>
    }
    @if (helpText()) {
      <span class="aegis-input__help" [id]="helpId()">{{ helpText() }}</span>
    }
    <span class="aegis-input__error" [id]="errorId()">{{ errorText() }}</span>
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

  /** Solo se pinta (y describe) cuando `invalid()` es `true`. El `<span>` de
   * error existe siempre (vacío si no hay error): la relación `aria-describedby`
   * es estable, nunca se crea/destruye en caliente (ADR-019). */
  readonly errorMessage = input<string | undefined>(undefined);

  /** Texto de ayuda persistente, independiente de `invalid`. */
  readonly helpText = input<string | undefined>(undefined);

  readonly size = input<AegisInputSize>('md');

  /**
   * Modo de presentación de la etiqueta. `'stacked'` (default) = etiqueta encima
   * del campo. `'floating'` = etiqueta dentro del campo en reposo, elevada al
   * enfocar / rellenar / autocompletar. Retrocompatible: ningún consumidor
   * existente cambia de comportamiento.
   */
  readonly labelMode = input<AegisInputLabelMode>('stacked');

  /**
   * Solo con `labelMode='floating'`. `'inset'` (default) = la etiqueta flotada
   * permanece dentro del borde. `'notched'` = la etiqueta flota sobre el borde
   * superior, cortándolo visualmente (estilo Material).
   */
  readonly labelFloatStyle = input<AegisInputLabelFloatStyle>('inset');

  /** `id` propio del campo; si no se aporta, se autogenera. */
  readonly id = input<string | undefined>(undefined);

  protected readonly classes = computed(() => {
    const base = `aegis-input aegis-input--${this.size()}`;
    if (this.labelMode() !== 'floating') {
      return base;
    }
    return `${base} aegis-input--floating aegis-input--float-${this.labelFloatStyle()}`;
  });

  /**
   * Placeholder que llega al `<input>` en modo floating: si el consumidor pasó
   * uno propio, se usa. Si no, se pasa un espacio para habilitar
   * `:placeholder-shown` como detector de campo vacío (sin espacio, el selector
   * no podría distinguir vacío de relleno cuando no hay placeholder visible).
   */
  protected readonly floatPlaceholder = computed(
    () => this.placeholder() ?? ' ',
  );

  /** Id estable por instancia, usado solo si el consumidor no aporta el suyo. */
  private readonly autoId = `aegis-input-${nextId++}`;

  protected readonly resolvedId = computed(() => this.id() ?? this.autoId);

  protected readonly helpId = computed(() =>
    this.helpText() ? `${this.resolvedId()}-help` : undefined,
  );

  /** Siempre definido (ADR-019): la relación aria-describedby con el error
   * nunca se crea/destruye en caliente, solo cambia el texto del span. */
  protected readonly errorId = computed(() => `${this.resolvedId()}-error`);

  /** Texto del `<span>` de error: el mensaje cuando `invalid`, o `''`.
   * Interpolación plana (no `@if` alrededor): muta el nodo in situ en vez de
   * recrearlo — sin sorpresas de reannuncio si algún AT trata la descripción
   * como región viva. */
  protected readonly errorText = computed(() =>
    this.invalid() && this.errorMessage() ? this.errorMessage()! : '',
  );

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
