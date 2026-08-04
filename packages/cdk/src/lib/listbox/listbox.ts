import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';

let nextId = 0;

/**
 * Brain (headless) del patrón ARIA **listbox con foco virtual** — `@aegisui/cdk`.
 *
 * Se escribe entero a propósito (ADR-023 Hallazgos 3 y 4): `@angular/cdk/listbox`
 * arrastra `@angular/forms`, rxjs, `NgModule`, `@Input`/`@Output` y `NgZone`, y
 * `@angular/aria` exige suelo `^22` con pin exacto de CDK. Ninguna nos lo daba
 * resuelto sin acoplamiento.
 *
 * Aquí viven dos cosas que el contrato marca como el corazón del patrón:
 *
 * 1. **Activa ≠ seleccionada.** `activeIndex` es dónde está el foco VIRTUAL (se
 *    mueve con flechas y no compromete nada); `value` es lo elegido (`Enter`,
 *    click). Confundirlas produce el bug clásico de "seleccionar al navegar" que
 *    rompe a los usuarios de lector de pantalla.
 *
 * 2. **El foco DOM NUNCA se mueve a las opciones.** Se queda en el control
 *    (input o disparador) y la opción activa se comunica con
 *    `aria-activedescendant` apuntando a su `id`. Por eso el teclado entra por
 *    `onKeydown()`, que la piel cablea en el CONTROL, no en este contenedor:
 *    el `keydown` ocurre donde está el foco, y el foco está en el control.
 *
 * El cap de resultados (`maxVisible`, default 100) es comportamiento observable
 * fijado por ADR-023 §4: v1 **no virtualiza**. Gracias a eso
 * `activeDescendantId` apunta siempre a un elemento renderizado **por
 * construcción**, no por cuidado — que es justo el invariante que la
 * virtualización rompería.
 */
@Directive({
  selector: '[aegisListbox]',
  exportAs: 'aegisListbox',
  host: {
    role: 'listbox',
    'data-handles': 'ArrowDown ArrowUp Home End Enter Space',
  },
})
export class AegisListbox<T> {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Colección COMPLETA, sin recortar: el cap lo aplica el primitivo, no el consumidor. */
  readonly options = input<readonly T[]>([]);

  /** Texto de filtrado. `''` = sin filtrar. Coincidencia por subcadena. */
  readonly filter = input<string>('');

  /** Cap de opciones renderizadas (ADR-023 §4). Menor que 1 se trata como 1. */
  readonly maxVisible = input<number>(100);

  /** Opciones presentes pero no seleccionables. Siguen visibles y anunciadas. */
  readonly disabledOptions = input<readonly T[]>([]);

  /**
   * Salto a opción por escritura rápida.
   *
   * También distingue el modo del listbox, porque el contrato ata las dos cosas
   * a la MISMA condición ("dentro de un combobox editable"): con `typeahead`
   * activo el listbox no está en un campo de texto, así que `Space` selecciona;
   * con `typeahead` desactivado (el caso del combobox editable) la escritura
   * pertenece al campo y `Space` escribe un espacio — nunca se secuestra.
   */
  readonly typeahead = input<boolean>(true);

  /** `ArrowDown` en la última vuelve a la primera. */
  readonly loop = input<boolean>(true);

  /** Opción SELECCIONADA (compromiso del usuario). */
  readonly value = model<T | undefined>(undefined);

  /** Índice de la opción ACTIVA (foco virtual) dentro de las visibles. `-1` = ninguna. */
  readonly activeIndex = model<number>(-1);

  /** El usuario comprometió una opción. NO se emite al navegar. */
  readonly optionSelected = output<T>();

  private readonly uid = `aegis-listbox-${nextId++}`;
  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  /** Cap efectivo: un listbox que no muestra nada no es configuración válida. */
  private readonly effectiveMax = computed(() => {
    const raw = Math.floor(this.maxVisible());
    return Number.isFinite(raw) && raw >= 1 ? raw : 1;
  });

  /** Coincidencias con `filter`, ANTES del cap. */
  private readonly matched = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    const all = this.options();
    if (needle === '') {
      return all;
    }
    return all.filter((o) => String(o).toLowerCase().includes(needle));
  });

  /** Lo que se renderiza: `filter` primero y `maxVisible` DESPUÉS. */
  readonly visibleOptions = computed<readonly T[]>(() =>
    this.matched().slice(0, this.effectiveMax()),
  );

  /** Coincidencias TOTALES, no las visibles. */
  readonly matchCount = computed(() => this.matched().length);

  readonly truncated = computed(() => this.matchCount() > this.effectiveMax());

  readonly isEmpty = computed(() => this.matchCount() === 0);

  /**
   * `id` de la opción activa, o `undefined` si no hay ninguna.
   *
   * Invariante central: cuando no es `undefined`, apunta SIEMPRE a un elemento
   * presente en el DOM. La piel debe retirar `aria-activedescendant` cuando esto
   * es `undefined` (`[attr.aria-activedescendant]` con `null`/`undefined` lo
   * retira solo).
   */
  readonly activeDescendantId = computed<string | undefined>(() => {
    const i = this.activeIndex();
    // NO ELIMINAR la comprobación de rango: es defensa REDUNDANTE A PROPÓSITO.
    //
    // El effect de recolocación del constructor ya corrige `activeIndex` antes de
    // que este computed pueda devolver un id colgante, así que quitarla no pone
    // rojo ningún test (comprobado con mutación: el mutante SOBREVIVE). Eso la
    // hace parecer código muerto, y no lo es: `activeIndex` es un `model`
    // PÚBLICO, y un consumidor que lo escriba a mano fuera de rango se saltaría
    // el effect dentro del mismo tick. Sin esta guarda,
    // `aria-activedescendant` apuntaría a un id inexistente — exactamente el
    // invariante que ADR-023 §4 protege al no virtualizar.
    //
    // Las dos defensas cubren cosas distintas: el effect corrige el ESTADO
    // (el contrato exige "se recoloca a la primera visible"); esta guarda hace
    // seguro el ID DERIVADO pase lo que pase con el estado.
    return i >= 0 && i < this.visibleOptions().length ? this.optionId(i) : undefined;
  });

  /**
   * Texto de la fila de estado, y a la vez lo que la piel pone en la región
   * `aria-live`. Vacío en estado normal: el recuento normal NO se anuncia nunca
   * (ADR-019 Regla 3 — NVDA/JAWS ya lo dan de forma nativa y un segundo canal lo
   * duplicaría). Solo truncado y vacío tienen contenido, porque la truncación es
   * información que NINGÚN lector puede inferir.
   */
  readonly statusMessage = computed(() => {
    if (this.isEmpty()) {
      return 'Sin resultados.';
    }
    if (this.truncated()) {
      return `Mostrando los primeros ${this.effectiveMax()} de ${this.matchCount()}. Afina la búsqueda.`;
    }
    return '';
  });

  constructor() {
    // Recoloca la activa cuando cambia lo visible: nunca queda fuera de rango, y
    // al quedarse sin coincidencias vuelve a -1 para que `aria-activedescendant`
    // se retire en vez de apuntar a un id inexistente.
    effect(() => {
      const total = this.visibleOptions().length;
      const current = this.activeIndex();
      if (total === 0) {
        if (current !== -1) {
          this.activeIndex.set(-1);
        }
        return;
      }
      if (current >= total) {
        this.activeIndex.set(this.firstEnabledIndex());
      }
    });

    inject(DestroyRef).onDestroy(() => this.clearTypeahead());
  }

  /** `id` estable y único de la opción visible en `index`. */
  optionId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  isDisabledAt(index: number): boolean {
    const option = this.visibleOptions()[index];
    return index >= 0 && this.disabledOptions().includes(option);
  }

  isSelected(index: number): boolean {
    const current = this.value();
    return current !== undefined && this.visibleOptions()[index] === current;
  }

  /** Mueve el foco virtual. No compromete nada ni emite `optionSelected`. */
  activateAt(index: number): void {
    if (index < 0 || index >= this.visibleOptions().length) {
      return;
    }
    this.activeIndex.set(index);
    this.scrollActiveIntoView(index);
  }

  /** Compromete una opción: fija `value` y emite. Las deshabilitadas no se seleccionan. */
  selectAt(index: number): void {
    const list = this.visibleOptions();
    if (index < 0 || index >= list.length || this.isDisabledAt(index)) {
      return;
    }
    const option = list[index];
    this.value.set(option);
    this.activeIndex.set(index);
    this.optionSelected.emit(option);
  }

  /**
   * Teclado del patrón. La piel lo cablea en el CONTROL (donde vive el foco DOM),
   * no en este contenedor: mover el foco a las opciones es exactamente el error
   * que el foco virtual existe para evitar.
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveTo(this.step(+1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.moveTo(this.step(-1));
        return;
      case 'Home':
        event.preventDefault();
        this.moveTo(this.firstEnabledIndex());
        return;
      case 'End':
        event.preventDefault();
        this.moveTo(this.lastEnabledIndex());
        return;
      case 'Enter':
        if (this.activeIndex() >= 0) {
          event.preventDefault();
          this.selectAt(this.activeIndex());
        }
        return;
      case ' ':
        // Solo selecciona fuera de un campo de texto. Dentro de un combobox
        // editable (typeahead desactivado) el espacio pertenece a la escritura.
        if (this.typeahead() && this.activeIndex() >= 0) {
          event.preventDefault();
          this.selectAt(this.activeIndex());
        }
        return;
      default:
        this.handleTypeahead(event);
    }
  }

  // --- interno ---------------------------------------------------------------

  private moveTo(index: number): void {
    if (index >= 0) {
      this.activateAt(index);
    }
  }

  /** Siguiente habilitada en la dirección dada, saltando deshabilitadas. */
  private step(direction: 1 | -1): number {
    const total = this.visibleOptions().length;
    if (total === 0) {
      return -1;
    }

    const current = this.activeIndex();
    // Sin activa, la primera pulsación entra por el extremo correspondiente,
    // haya bucle o no: todavía no hay ningún extremo donde detenerse.
    if (current < 0) {
      return direction === 1 ? this.firstEnabledIndex() : this.lastEnabledIndex();
    }

    let index = current;
    for (let tries = 0; tries < total; tries++) {
      index += direction;
      if (index < 0 || index >= total) {
        if (!this.loop()) {
          return -1;
        }
        index = index < 0 ? total - 1 : 0;
      }
      if (!this.isDisabledAt(index)) {
        return index;
      }
    }
    // Todas deshabilitadas: no se activa nada (y no se busca en bucle infinito).
    return -1;
  }

  private firstEnabledIndex(): number {
    const total = this.visibleOptions().length;
    for (let i = 0; i < total; i++) {
      if (!this.isDisabledAt(i)) {
        return i;
      }
    }
    return -1;
  }

  private lastEnabledIndex(): number {
    for (let i = this.visibleOptions().length - 1; i >= 0; i--) {
      if (!this.isDisabledAt(i)) {
        return i;
      }
    }
    return -1;
  }

  private handleTypeahead(event: KeyboardEvent): void {
    if (!this.typeahead() || event.key.length !== 1 || event.key === ' ') {
      return;
    }

    this.typeaheadBuffer += event.key.toLowerCase();
    if (this.typeaheadTimer !== null) {
      clearTimeout(this.typeaheadTimer);
    }
    this.typeaheadTimer = setTimeout(() => {
      this.typeaheadBuffer = '';
      this.typeaheadTimer = null;
    }, 1000);

    const list = this.visibleOptions();
    for (let i = 0; i < list.length; i++) {
      if (!this.isDisabledAt(i) && String(list[i]).toLowerCase().startsWith(this.typeaheadBuffer)) {
        this.activateAt(i);
        return;
      }
    }
  }

  private clearTypeahead(): void {
    if (this.typeaheadTimer !== null) {
      clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = null;
    }
    this.typeaheadBuffer = '';
  }

  /**
   * Mantiene la activa a la vista. Es posible sin trucos precisamente porque el
   * elemento SIEMPRE existe (no virtualizamos): se busca dentro del host, no en
   * todo el documento, para no colisionar con otro listbox de la página.
   */
  private scrollActiveIntoView(index: number): void {
    if (!this.isBrowser) {
      return;
    }
    const el = this.elementRef.nativeElement.querySelector<HTMLElement>(
      `#${CSS.escape(this.optionId(index))}`,
    );
    el?.scrollIntoView?.({ block: 'nearest' });
  }
}
