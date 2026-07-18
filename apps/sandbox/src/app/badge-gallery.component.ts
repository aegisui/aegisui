import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AegisBadgeComponent, type AegisBadgeVariant } from '@aegisui/ui';

/**
 * Galería de <aegis-badge> REALES (variantes × tamaños), en la app zoneless del
 * sandbox. Es el OBJETIVO de los gates DOM de §9.2 para el Badge.
 *
 * El par que hay que medir es TEXTO SOBRE SU PROPIO TINTE, con umbral de TEXTO
 * (4.5:1) y no de UI (3:1): `font-size-xs`/`sm` están por debajo del umbral de
 * "texto grande". El borde NO se mide contra 3:1 — es decorativo (ADR-018).
 *
 * Cada badge lleva `data-cell="<variante>-<tamaño>"` para localizarlo.
 */
@Component({
  selector: 'aegis-badge-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisBadgeComponent],
  styleUrl: './badge-gallery.component.css',
  template: `
    <section class="gallery" aria-label="Galería del Badge">
      @for (size of sizes; track size) {
        <div class="group" [attr.data-variant]="size">
          <h3>tamaño {{ size }}</h3>
          <div class="row">
            @for (v of variants; track v) {
              <aegis-badge [variant]="v" [size]="size" [attr.data-cell]="v + '-' + size">
                {{ etiquetas[v] }}
              </aegis-badge>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class BadgeGalleryComponent {
  readonly variants: readonly AegisBadgeVariant[] = [
    'neutral',
    'accent',
    'success',
    'warning',
    'danger',
  ];
  readonly sizes = ['sm', 'md'] as const;

  /** Texto distinto por variante: el color refuerza, no comunica solo (1.4.1). */
  readonly etiquetas: Record<AegisBadgeVariant, string> = {
    neutral: 'Borrador',
    accent: 'Beta',
    success: 'Activo',
    warning: 'Caduca pronto',
    danger: 'Caducado',
  };
}
