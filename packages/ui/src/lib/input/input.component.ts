import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
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
 * El anuncio del error usa DOS nodos separados (ADR-019): el `<span id>`
 * enlazado por `aria-describedby` está SIEMPRE presente (vacío si no hay
 * error) y un `<span role="alert">` aparte, oculto y fuera de
 * `aria-describedby`, que dispara el anuncio dinámico. Ninguno usa `@if`
 * alrededor del texto (regla 3: recrear el nodo dispara un anuncio doble).
 *
 * Regla 4 (ADR-019): el nodo de `aria-describedby` NUNCA muta mientras el
 * campo tiene foco — solo se pone al día al perderlo (`brain.focused()`,
 * `@aegisui/cdk`). NVDA relee la descripción del campo ENFOCADO cuando el
 * nodo que ella referencia cambia de texto, aunque el atributo
 * `aria-describedby` en sí no cambie — un segundo canal de anuncio, distinto
 * de la recreación de nodo (regla 3) y del "un nodo, dos papeles" original.
 * Verificado con `MutationObserver`: sacar el error de `aria-describedby`
 * elimina el doble anuncio; de ahí que deba, en su lugar, dejar de mutar
 * mientras hay foco (no desaparecer del todo, para no perder el reanuncio al
 * reenfocar). Si el texto cambia varias veces con el campo ya enfocado (p.
 * ej. una validación en vivo que corrige su propio mensaje), la región
 * `alert` anuncia cada cambio; el nodo de `describedby` se pone al día una
 * sola vez, al perder el foco, con el ÚLTIMO valor — nunca uno intermedio.
 *
 * Verificación MANUAL con lector de pantalla obligatoria antes de release
 * (SPEC §8.5): NVDA y VoiceOver deben anunciarlo una sola vez al aparecer, y
 * seguir reanunciando el mensaje ACTUALIZADO al reenfocar más tarde.
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
    <span class="aegis-input__error" [id]="errorId()">{{ describedErrorText() }}</span>
    <span class="aegis-input__error-live" role="alert">{{ errorText() }}</span>
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

  /**
   * Texto visible del error, o `''`. A propósito interpolación PLANA en el
   * template (nunca `@if` alrededor del texto, ADR-019 regla 3): `@if` es
   * estructural — recrea el nodo de texto (`childList`) en vez de mutar su
   * valor (`characterData`) — y una región `role="alert"` que RECREA su nodo
   * dispara un anuncio doble en NVDA, aunque el `<span>` contenedor ya sea
   * permanente. Verificado con MutationObserver sobre DOM real.
   */
  protected readonly errorText = computed(() =>
    this.invalid() && this.errorMessage() ? this.errorMessage()! : '',
  );

  private readonly brain = viewChild.required(AegisInput);

  /**
   * Texto que `aria-describedby` señala de verdad (ADR-019 regla 4). Se
   * mantiene congelado mientras `brain().focused()` es `true` — si `errorText`
   * cambia con el campo enfocado, este signal NO lo refleja todavía; lo hace
   * en cuanto el campo pierde el foco (o de inmediato si nunca lo tuvo, p. ej.
   * un campo que nace ya inválido). Así la región `describedby` nunca muta
   * mientras el AT está leyendo el elemento enfocado (evita el segundo canal
   * de anuncio), sin perder el reanuncio del texto ACTUALIZADO al reenfocar.
   */
  protected readonly describedErrorText = signal('');

  private readonly syncDescribedErrorText = effect(() => {
    const current = this.errorText();
    if (!this.brain().focused()) {
      this.describedErrorText.set(current);
    }
  });

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

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
