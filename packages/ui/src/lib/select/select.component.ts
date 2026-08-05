import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { AegisListbox, AegisOverlay, type AegisPlacement } from '@aegisui/cdk';

export type AegisSelectSize = 'sm' | 'md' | 'lg';

let nextId = 0;

/**
 * `<aegis-select>` — piel estilada sobre `AegisOverlay` + `AegisListbox`
 * (ADR-002, brain/skin). API signals-only, OnPush, standalone.
 *
 * Es **configuración fina**, no lógica nueva: el foco virtual, el teclado de la
 * lista, el cap de resultados y el posicionamiento viven en `@aegisui/cdk`. Lo
 * único que decide esta piel es *cuándo abrir y cerrar*, y con qué valores
 * configura los primitivos (contrato §Configuración de los primitivos).
 *
 * El disparador es un `<button>` propio y NO reutiliza `<aegis-button>`: un
 * disparador de select se lee como campo de formulario, no como CTA, y traer la
 * piel de botón obligaría a neutralizarla entera (contrato §Selector).
 *
 * `Space` selecciona porque el listbox va con `editable=false` — explícito, nunca
 * inferido del estado de `typeahead` (enmienda 2 de `listbox.md`).
 */
@Component({
  selector: 'aegis-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisOverlay, AegisListbox],
  host: { '[attr.id]': 'null' },
  template: `
    <label [for]="triggerId()" class="aegis-select__label">
      {{ label() }}
    </label>

    <!--
      El panel se declara DESPUÉS del disparador pero \`lb\` se referencia ANTES:
      Angular instancia las directivas de una vista en la pasada de creación y
      evalúa los bindings en la de actualización, así que la instancia ya existe.
      Es el mismo cableado que usan los tests del propio listbox.
    -->
    <button
      #trigger
      type="button"
      role="combobox"
      class="aegis-select__trigger"
      [id]="triggerId()"
      [class.aegis-select__trigger--invalid]="invalid()"
      [class.aegis-select__trigger--placeholder]="value() === undefined"
      [disabled]="disabled()"
      [attr.aria-expanded]="open() ? 'true' : 'false'"
      [attr.aria-controls]="panelId()"
      aria-haspopup="listbox"
      [attr.aria-activedescendant]="open() ? (lb.activeDescendantId() ?? null) : null"
      [attr.aria-invalid]="invalid() ? 'true' : null"
      [attr.aria-describedby]="describedBy()"
      data-handles="Enter Space ArrowDown ArrowUp Home End"
      (click)="toggle()"
      (keydown)="onKeydown($event, lb)"
    >
      <span class="aegis-select__value">{{ displayText(lb) }}</span>
      <span class="aegis-select__indicator" aria-hidden="true"></span>
    </button>

    <div
      aegisOverlay
      aegisListbox
      #lb="aegisListbox"
      class="aegis-select__panel"
      [id]="panelId()"
      [anchor]="triggerEl()?.nativeElement"
      [(open)]="open"
      [placement]="placement()"
      [matchAnchorWidth]="true"
      [maxHeightFromViewport]="true"
      [options]="options()"
      [optionLabel]="optionLabel()"
      [disabledOptions]="disabledOptions()"
      [maxVisible]="maxVisible()"
      [editable]="false"
      [typeahead]="true"
      [value]="value()"
      (optionSelected)="onOptionSelected($event)"
    >
      @for (option of lb.visibleOptions(); track $index) {
        <div
          class="aegis-select__option"
          role="option"
          [id]="lb.optionId($index)"
          [attr.aria-selected]="lb.isSelected($index)"
          [attr.aria-disabled]="lb.isDisabledAt($index) ? 'true' : null"
          [class.aegis-select__option--active]="lb.activeIndex() === $index"
          (click)="lb.selectAt($index)"
        >
          {{ lb.labelOf(option) }}
        </div>
      }
      @if (lb.statusMessage()) {
        <div class="aegis-select__status">{{ lb.statusMessage() }}</div>
      }
    </div>

    @if (helpText()) {
      <span class="aegis-select__help" [id]="helpId()">{{ helpText() }}</span>
    }
    <span class="aegis-select__error" [id]="errorId()">{{ errorMessage() ?? '' }}</span>
  `,
  styleUrl: './select.component.css',
})
export class AegisSelectComponent<T> {
  protected readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  private readonly uid = `aegis-select-${nextId++}`;

  readonly label = input('');
  readonly options = input<readonly T[]>([]);
  readonly optionLabel = input<string | ((option: T) => string) | undefined>(undefined);
  readonly placeholder = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly errorMessage = input<string | undefined>(undefined);
  readonly helpText = input<string | undefined>(undefined);
  readonly size = input<AegisSelectSize>('md');
  readonly disabledOptions = input<readonly T[]>([]);
  readonly maxVisible = input(100);
  readonly placement = input<AegisPlacement>('bottom-start');

  readonly value = model<T | undefined>(undefined);
  readonly open = model(false);

  readonly selectionChange = output<T>();

  protected readonly triggerId = computed(() => `${this.uid}-trigger`);
  protected readonly panelId = computed(() => `${this.uid}-listbox`);
  protected readonly helpId = computed(() => `${this.uid}-help`);
  protected readonly errorId = computed(() => `${this.uid}-error`);

  /** Solo los ids que existen de verdad: nunca un `aria-describedby=""` vacío. */
  protected readonly describedBy = computed(() => {
    const ids = [
      this.helpText() ? this.helpId() : undefined,
      this.errorMessage() ? this.errorId() : undefined,
    ].filter((v): v is string => !!v);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /**
   * Texto del disparador. La etiqueta la resuelve el LISTBOX (`labelOf`), no una
   * copia local: `optionLabel` es su contrato, y duplicar su semántica aquí
   * dejaría dos sitios donde el filtro y el disparador podrían divergir.
   */
  protected displayText(lb: AegisListbox<T>): string {
    const current = this.value();
    return current === undefined ? this.placeholder() : lb.labelOf(current);
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.open.update((v) => !v);
  }

  protected onOptionSelected(option: T): void {
    this.value.set(option);
    this.selectionChange.emit(option);
    this.open.set(false);
  }

  /**
   * Abrir/cerrar es lo ÚNICO que decide esta piel; la navegación se delega
   * entera al listbox. Con el panel abierto, cada tecla pasa tal cual: si el
   * Select la reinterpretara, habría dos fuentes de verdad para el teclado.
   */
  protected onKeydown(event: KeyboardEvent, lb: AegisListbox<T>): void {
    if (this.disabled()) {
      return;
    }

    if (!this.open()) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.open.set(true);
        this.activateSelected(lb);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.open.set(true);
        // Sin selección previa, se delega la tecla: el listbox entra por el
        // extremo correcto (primera con ArrowDown, última con ArrowUp).
        if (!this.activateSelected(lb)) {
          lb.onKeydown(event);
        }
      }
      return;
    }

    lb.onKeydown(event);

    // Comprometer cierra. `Escape` no se toca: lo cierra la Popover API nativa,
    // que además devuelve el foco al disparador.
    if (event.key === 'Enter' || event.key === ' ') {
      this.open.set(false);
    }
  }

  /** Activa la opción ya seleccionada, si la hay. `false` si no había. */
  private activateSelected(lb: AegisListbox<T>): boolean {
    const current = this.value();
    if (current === undefined) {
      return false;
    }
    const index = lb.visibleOptions().indexOf(current);
    if (index < 0) {
      return false;
    }
    lb.activateAt(index);
    return true;
  }
}
