import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AegisInputComponent, type AegisInputSize } from '@aegisui/ui';

/**
 * Galería de <aegis-input> REALES (tamaños × estados), en la app zoneless del
 * sandbox. Es el OBJETIVO de los gates DOM de §9.2 para el Input: Playwright la
 * renderiza en Chromium y toma la verdad de `getComputedStyle`/bounding box.
 *
 * Cada campo lleva `data-cell="<size>-<state>"` para localizarlo.
 *
 * ## Etiqueta flotante
 *
 * Los campos flotantes llevan valor para que la etiqueta esté en posición
 * FLOTADA sin depender del foco: los gates e2e miden el estado activo, y un
 * campo vacío mostraría el de reposo.
 *
 * El chip del `notched` CABALGA el borde: su mitad exterior se pinta sobre la
 * superficie PADRE y la interior sobre el relleno del campo. Por eso hay dos
 * filas, y las dos importan:
 *
 *   1. sobre `surface-canvas` → el default funciona sin tocar nada.
 *   2. sobre `surface-raised` → el consumidor DEBE ajustar
 *      `--aegis-input-label-notch-bg-outer`, o la mitad exterior desentona
 *      (el efecto "pegatina").
 *
 * Esta galería vive dentro de `section.panel`, que es `surface-raised`: sin el
 * override del caso 2, el defecto se vería aquí mismo. Los cubre
 * `apps/sandbox/e2e/gate-notch-alignment.spec.ts`.
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

      <!-- Etiqueta flotante: ver el comentario del componente, arriba. -->
      <div class="group" data-variant="floating">
        <h3>etiqueta flotante</h3>

        <div class="row surface-canvas">
          <aegis-input
            label="Inset"
            labelMode="floating"
            value="flotado@empresa.com"
            data-cell="md-float-inset"
          />
          @for (size of sizes; track size) {
            <aegis-input
              [label]="'Notched ' + size"
              [size]="size"
              labelMode="floating"
              labelFloatStyle="notched"
              value="flotado@empresa.com"
              [attr.data-cell]="size + '-float-notched'"
            />
          }
        </div>

        <div class="row">
          <aegis-input
            label="Notched sobre superficie elevada"
            labelMode="floating"
            labelFloatStyle="notched"
            value="flotado@empresa.com"
            class="notch-on-raised"
            data-cell="md-float-notched-raised"
          />
        </div>
      </div>
    </section>
  `,
})
export class InputGalleryComponent {
  protected readonly sizes: readonly AegisInputSize[] = ['sm', 'md', 'lg'];
}
