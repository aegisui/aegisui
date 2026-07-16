import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AegisButtonComponent, type AegisButtonSize, type AegisButtonVariant } from '@aegisui/ui';

/**
 * Galería de <aegis-button> REALES (todas las variantes × tamaños × estados), en
 * la app zoneless del sandbox. Es el OBJETIVO de los gates DOM de §9.2 en Fase 3:
 * Playwright la renderiza en Chromium y toma la verdad de `getComputedStyle` y del
 * bounding box real — no de un parser propio (la cascada la resuelve el navegador).
 *
 * Cada botón lleva `data-cell="<variant>-<size>-<state>"` para localizarlo.
 */
@Component({
  selector: 'aegis-button-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisButtonComponent],
  styleUrl: './button-gallery.component.css',
  template: `
    <section class="gallery" aria-label="Galería del Button">
      @for (variant of variants; track variant) {
        <div class="group" [attr.data-variant]="variant">
          <h3>{{ variant }}</h3>
          <div class="row">
            @for (size of sizes; track size) {
              <aegis-button
                [variant]="variant"
                [size]="size"
                [attr.data-cell]="variant + '-' + size + '-default'"
              >
                {{ variant }} {{ size }}
              </aegis-button>
            }
          </div>
          <div class="row">
            <aegis-button
              [variant]="variant"
              size="md"
              [disabled]="true"
              [attr.data-cell]="variant + '-md-disabled'"
            >
              Deshabilitado
            </aegis-button>
            <aegis-button
              [variant]="variant"
              size="md"
              [loading]="true"
              [attr.data-cell]="variant + '-md-loading'"
            >
              Cargando
            </aegis-button>
          </div>
        </div>
      }

      <div class="group" data-variant="icon-only">
        <h3>icono-solo (aria-label)</h3>
        <div class="row">
          <aegis-button variant="secondary" size="sm" aria-label="Cerrar" data-cell="icon-only">
            ×
          </aegis-button>
        </div>
      </div>
    </section>
  `,
})
export class ButtonGalleryComponent {
  protected readonly variants: readonly AegisButtonVariant[] = [
    'primary',
    'secondary',
    'ghost',
    'danger',
  ];
  protected readonly sizes: readonly AegisButtonSize[] = ['sm', 'md', 'lg'];
}
