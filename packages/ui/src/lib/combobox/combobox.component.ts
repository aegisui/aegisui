import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AegisListbox, AegisOverlay, type AegisPlacement } from '@aegisui/cdk';
import {
  AegisInputComponent,
  type AegisInputLabelFloatStyle,
  type AegisInputLabelMode,
  type AegisInputSize,
} from '../input/input.component';

let nextId = 0;

/**
 * `<aegis-combobox>` — elegir una opción **escribiendo para filtrar**.
 *
 * Como el Select, es **configuración fina** sobre `AegisOverlay` + `AegisListbox`.
 * Lo que lo distingue es el campo: **es un `<aegis-input>` real**, no una versión
 * paralela. No reimplementa etiqueta, etiqueta flotante, ayuda, error ni tamaños:
 * los consume.
 *
 * Eso es posible por el passthrough `controlAttrs` del Input, y solo por él: sin
 * pasarela, el ARIA del patrón aterrizaría en el host `<aegis-input>` y el
 * `<input>` real —el que recibe el foco— se quedaría sin `role` ni
 * `aria-activedescendant`, dejando el patrón inservible para un lector.
 *
 * `Space` NO selecciona porque el listbox va con `editable=true`: con un campo de
 * texto delante, el espacio pertenece a la escritura. Es el otro lado de la
 * enmienda 2 de `listbox.md`, y el que demuestra que hacían falta dos conceptos.
 */
@Component({
  selector: 'aegis-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisInputComponent, AegisOverlay, AegisListbox],
  host: { '[attr.id]': 'null' },
  template: `
    <aegis-input
      #campo
      [label]="label()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [required]="required()"
      [invalid]="invalid()"
      [errorMessage]="errorMessage()"
      [helpText]="helpText()"
      [size]="size()"
      [labelMode]="labelMode()"
      [labelFloatStyle]="labelFloatStyle()"
      [value]="fieldText(lb)"
      [controlAttrs]="controlAttrs(lb)"
      (valueChange)="onType($event)"
      (keydown)="onKeydown($event, lb)"
      (focusout)="onFocusOut()"
    />

    <!--
      Overlay y listbox en elementos SEPARADOS: compartiéndolo, la fila de estado
      quedaba como HIJA del "role="listbox" y NVDA la contaba como un item más
      ("1 item" con cero resultados). No basta con quitarle "role="option".
    -->
    <div
      aegisOverlay
      class="aegis-combobox__panel"
      [anchor]="anchorEl()"
      [(open)]="open"
      [placement]="placement()"
      [matchAnchorWidth]="true"
      [maxHeightFromViewport]="true"
    >
      <div
        aegisListbox
        #lb="aegisListbox"
        class="aegis-combobox__list"
        [id]="listboxId()"
        [options]="options()"
        [optionLabel]="optionLabel()"
        [filter]="filter()"
        [maxVisible]="maxVisible()"
        [disabledOptions]="disabledOptions()"
        [editable]="true"
        [value]="value()"
        (optionSelected)="onOptionSelected($event)"
      >
        @for (option of lb.visibleOptions(); track $index) {
          <div
            class="aegis-combobox__option"
            role="option"
            [id]="lb.optionId($index)"
            [attr.aria-selected]="lb.isSelected($index)"
            [attr.aria-disabled]="lb.isDisabledAt($index) ? 'true' : null"
            [class.aegis-combobox__option--active]="lb.activeIndex() === $index"
            (mousedown)="$event.preventDefault()"
            (click)="lb.selectAt($index)"
          >
            {{ lb.labelOf(option) }}
          </div>
        }
      </div>

      <!-- Hermana del listbox y "aria-hidden": la anuncia la región live. -->
      @if (lb.statusMessage()) {
        <div class="aegis-combobox__status" aria-hidden="true">{{ lb.statusMessage() }}</div>
      }
    </div>

    <!--
      Región live FUERA del popover (dentro saldría del árbol al cerrarse),
      presente desde el primer render, vacía en reposo, interpolación plana.
    -->
    <span class="aegis-combobox__sr" aria-live="polite">{{ lb.statusMessage() }}</span>
  `,
  styleUrl: './combobox.component.css',
})
export class AegisComboboxComponent<T> {
  private readonly campo = viewChild<AegisInputComponent>('campo');
  private readonly campoRef = viewChild('campo', { read: ElementRef });

  /**
   * Ancla del overlay. Misma razón que en el Select: la consulta `viewChild` se
   * resuelve DESPUÉS de la primera pasada, y con `open=true` desde el montaje
   * nada vuelve a evaluar el binding — el panel no abriría nunca. Escribirla tras
   * el render garantiza una pasada más. Lo destapó el e2e en Chromium real.
   */
  protected readonly anchorEl = signal<HTMLElement | undefined>(undefined);

  private readonly uid = `aegis-combobox-${nextId++}`;

  constructor() {
    afterNextRender(() =>
      this.anchorEl.set(this.campoRef()?.nativeElement as HTMLElement | undefined),
    );
  }

  readonly label = input('');
  readonly options = input<readonly T[]>([]);
  readonly optionLabel = input<string | ((option: T) => string) | undefined>(undefined);
  readonly placeholder = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly errorMessage = input<string | undefined>(undefined);
  readonly helpText = input<string | undefined>(undefined);
  readonly size = input<AegisInputSize>('md');
  readonly labelMode = input<AegisInputLabelMode>('stacked');
  readonly labelFloatStyle = input<AegisInputLabelFloatStyle>('inset');
  readonly disabledOptions = input<readonly T[]>([]);
  readonly maxVisible = input(100);
  readonly placement = input<AegisPlacement>('bottom-start');

  readonly value = model<T | undefined>(undefined);
  readonly open = model(false);

  readonly selectionChange = output<T>();

  /** Texto tecleado. `undefined` = el campo muestra la opción comprometida. */
  private readonly typed = signal<string | undefined>(undefined);

  protected readonly listboxId = computed(() => `${this.uid}-listbox`);
  protected readonly filter = computed(() => this.typed() ?? '');

  /**
   * Texto del campo. Mientras se teclea manda lo tecleado; en reposo manda la
   * etiqueta de la opción comprometida. Confundir las dos es lo que produce el
   * combobox que "pierde" lo que escribes (contrato §Texto del campo).
   */
  protected fieldText(lb: AegisListbox<T>): string {
    const escrito = this.typed();
    if (escrito !== undefined) {
      return escrito;
    }
    const actual = this.value();
    return actual === undefined ? '' : lb.labelOf(actual);
  }

  /**
   * El ARIA del patrón, que el passthrough deposita en el `<input>` INTERNO.
   * Ninguno está en el conjunto protegido del Input, así que conviven con su
   * `aria-invalid` y su `aria-describedby`: un combobox inválido sigue anunciando
   * su error por el canal de ADR-019.
   */
  protected controlAttrs(lb: AegisListbox<T>): Record<string, string | null> {
    return {
      role: 'combobox',
      'aria-expanded': this.open() ? 'true' : 'false',
      'aria-controls': this.listboxId(),
      // `null` RETIRA el atributo: sin opción activa no puede quedar colgando.
      'aria-activedescendant': this.open() ? (lb.activeDescendantId() ?? null) : null,
      'aria-autocomplete': 'list',
    };
  }

  /**
   * Teclear filtra. Vale igual para texto que el Combobox no originó (autofill):
   * se trata como tecleado — filtra y NO compromete (contrato §Autofill).
   */
  protected onType(texto: string): void {
    this.typed.set(texto);
    if (!this.open()) {
      this.open.set(true);
    }
  }

  protected onOptionSelected(option: T): void {
    this.value.set(option);
    this.typed.set(undefined);
    this.selectionChange.emit(option);
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent, lb: AegisListbox<T>): void {
    if (this.disabled()) {
      return;
    }

    if (!this.open() && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.open.set(true);
      lb.onKeydown(event);
      return;
    }

    if (!this.open()) {
      return;
    }

    lb.onKeydown(event);

    // Comprometer cierra. `Escape` lo cierra la Popover API nativa; al hacerlo,
    // `onFocusOut` no corre (el foco no se ha ido) y el texto se restaura abajo.
    if (event.key === 'Enter' && lb.activeIndex() >= 0) {
      this.typed.set(undefined);
    } else if (event.key === 'Escape') {
      this.typed.set(undefined);
    }
  }

  /**
   * Salir sin comprometer restaura la etiqueta de `value` (o vacío). Es la regla
   * que impide el estado imposible: el campo nunca se queda con texto huérfano,
   * porque este componente no acepta texto libre.
   */
  protected onFocusOut(): void {
    this.typed.set(undefined);
    this.open.set(false);
  }

  /** Enfoca el campo real, delegando en el Input (no se toca el DOM a mano). */
  focus(): void {
    this.campo()?.focus();
  }
}
