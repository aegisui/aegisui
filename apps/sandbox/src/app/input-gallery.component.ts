import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AegisInputComponent, type AegisInputSize } from '@aegisui/ui';

/**
 * Galería de <aegis-input> REALES (tamaños × estados), en la app zoneless del
 * sandbox. Es el OBJETIVO de los gates DOM de §9.2 para el Input: Playwright la
 * renderiza en Chromium y toma la verdad de `getComputedStyle`/bounding box.
 *
 * Cada campo lleva `data-cell="<size>-<state>"` para localizarlo.
 */
@Component({
  selector: 'aegis-input-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisInputComponent],
  styleUrl: './input-gallery.component.css',
  template: `
    <section class="gallery" aria-label="Galería del Input">
      <div class="group" data-variant="tamaños">
        <h3>tamaños</h3>
        <div class="row">
          @for (size of sizes; track size) {
            <aegis-input
              [label]="'Campo ' + size"
              [size]="size"
              placeholder="Escribe aquí"
              [attr.data-cell]="size + '-default'"
            />
          }
        </div>
      </div>

      <div class="group" data-variant="estados">
        <h3>estados</h3>
        <div class="row">
          <aegis-input
            label="Deshabilitado"
            [disabled]="true"
            value="sin edición"
            data-cell="md-disabled"
          />
          <aegis-input
            label="Solo lectura"
            [readonly]="true"
            value="precargado"
            data-cell="md-readonly"
          />
          <aegis-input
            label="Inválido"
            [invalid]="true"
            errorMessage="Formato inválido"
            value="no-es-un-correo"
            data-cell="md-invalid"
          />
          <aegis-input
            label="Con ayuda"
            helpText="Nunca compartimos tu correo."
            data-cell="md-help"
          />
        </div>
      </div>
    </section>
  `,
})
export class InputGalleryComponent {
  protected readonly sizes: readonly AegisInputSize[] = ['sm', 'md', 'lg'];
}
