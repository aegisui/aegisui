import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import {
  autoUpdate,
  computePosition,
  flip as flipMw,
  offset as offsetMw,
  shift as shiftMw,
  size as sizeMw,
} from '@floating-ui/dom';

// AegisPlacement es nuestra unión propia — no el tipo Placement de @floating-ui/dom.
// Mantenerla separada es lo que hace real la condición de salida del ADR-023: el día
// que @position-try sea widely available, Floating UI se retira sin tocar la API
// pública ni romper a nadie. Filtrar un solo tipo de la librería convierte esa
// retirada en un breaking change.
export type AegisPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end';

@Directive({
  selector: '[aegisOverlay]',
  exportAs: 'aegisOverlay',
  host: {
    popover: 'auto',
    '(toggle)': 'onNativeToggle($event)',
  },
})
export class AegisOverlay {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly anchor = input<HTMLElement | undefined>(undefined);
  readonly placement = input<AegisPlacement>('bottom-start');
  readonly offset = input<number>(0);
  readonly flip = input<boolean>(true);
  readonly shift = input<boolean>(true);
  readonly matchAnchorWidth = input<boolean>(false);
  readonly maxHeightFromViewport = input<boolean>(true);

  readonly open = model<boolean>(false);
  readonly placementChange = output<AegisPlacement>();

  private cleanupFn: (() => void) | null = null;
  private lastPlacement: AegisPlacement | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    if (this.isBrowser) {
      effect(() => {
        const isOpen = this.open();
        const anchorEl = this.anchor();
        if (isOpen && anchorEl) {
          this.startPositioning(anchorEl);
        } else {
          this.stopPositioning();
        }
      });
    }

    destroyRef.onDestroy(() => {
      this.cleanupFn?.();
      this.cleanupFn = null;
    });
  }

  // Sincroniza open con el estado real del popover (Esc, clic fuera).
  // Una sola fuente de verdad: el DOM notifica; nosotros actualizamos la señal.
  protected onNativeToggle(event: Event): void {
    if ((event as unknown as { newState: string }).newState === 'closed') {
      this.cleanupFn?.();
      this.cleanupFn = null;
      this.open.set(false);
    }
  }

  private startPositioning(anchorEl: HTMLElement): void {
    const floatingEl = this.el.nativeElement;

    this.cleanupFn?.();
    this.cleanupFn = null;
    this.lastPlacement = null;

    try {
      floatingEl.showPopover();
    } catch {
      // Idempotente: showPopover lanza si ya está abierto.
    }

    this.cleanupFn = autoUpdate(anchorEl, floatingEl, () => {
      if (!anchorEl.isConnected) {
        this.open.set(false);
        return;
      }
      this.updatePosition(anchorEl, floatingEl);
    });
  }

  private stopPositioning(): void {
    this.cleanupFn?.();
    this.cleanupFn = null;

    try {
      this.el.nativeElement.hidePopover();
    } catch {
      // hidePopover lanza si el elemento no está en la pila del popover.
    }
  }

  private updatePosition(anchorEl: HTMLElement, floatingEl: HTMLElement): void {
    const middleware = [];

    if (this.offset() !== 0) {
      middleware.push(offsetMw(this.offset()));
    }
    if (this.flip()) {
      middleware.push(flipMw());
    }
    if (this.shift()) {
      middleware.push(shiftMw({ padding: 8 }));
    }
    if (this.maxHeightFromViewport()) {
      middleware.push(
        sizeMw({
          apply({ availableHeight }: { availableHeight: number }) {
            floatingEl.style.setProperty(
              '--aegis-overlay-available-height',
              `${availableHeight}px`,
            );
          },
        }),
      );
    }

    computePosition(anchorEl, floatingEl, {
      placement: this.placement(),
      middleware,
    }).then(({ x, y, placement: effectivePlacement }) => {
      floatingEl.style.setProperty('--aegis-overlay-x', `${x}px`);
      floatingEl.style.setProperty('--aegis-overlay-y', `${y}px`);
      floatingEl.setAttribute('data-placement', effectivePlacement);

      if (this.matchAnchorWidth()) {
        floatingEl.style.setProperty('--aegis-overlay-anchor-width', `${anchorEl.offsetWidth}px`);
      }

      if (effectivePlacement !== this.lastPlacement) {
        this.lastPlacement = effectivePlacement as AegisPlacement;
        this.placementChange.emit(effectivePlacement as AegisPlacement);
      }
    });
  }
}
