import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AegisSwitchComponent, type AegisSwitchSize } from '@aegisui/ui';

/**
 * Galería de <aegis-switch> REALES (tamaños × estados), en la app zoneless del
 * sandbox. Es el OBJETIVO de los gates DOM de §9.2 para el Switch: Playwright la
 * renderiza en Chromium y toma la verdad de `getComputedStyle`/bounding box.
 *
 * Incluye a propósito los cuatro cruces de `checked` × `disabled`: el pulgar es
 * BICOLOR (contrato §Riel de color) y el par que falla si alguien lo unifica es
 * justo `off` (pulgar sobre pista apagada, 1.16:1 con un pulgar blanco). Sin la
 * celda `off` en la galería, esa regresión pasaría desapercibida.
 *
 * Cada interruptor lleva `data-cell="<size>-<estado>"` para localizarlo.
 */
@Component({
  selector: 'aegis-switch-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisSwitchComponent],
  styleUrl: './switch-gallery.component.css',
  template: `
    <section class="gallery" aria-label="Galería del Switch">
      <div class="group" data-variant="tamaños-off">
        <h3>tamaños · apagado</h3>
        <div class="row">
          @for (size of sizes; track size) {
            <aegis-switch
              [label]="'Interruptor ' + size"
              [size]="size"
              [attr.data-cell]="size + '-off'"
            />
          }
        </div>
      </div>

      <div class="group" data-variant="tamaños-on">
        <h3>tamaños · encendido</h3>
        <div class="row">
          @for (size of sizes; track size) {
            <aegis-switch
              [label]="'Activo ' + size"
              [size]="size"
              [checked]="true"
              [attr.data-cell]="size + '-on'"
            />
          }
        </div>
      </div>

      <div class="group" data-variant="deshabilitado">
        <h3>deshabilitado</h3>
        <div class="row">
          <aegis-switch label="Bloqueado apagado" [disabled]="true" data-cell="md-disabled-off" />
          <aegis-switch
            label="Bloqueado encendido"
            [checked]="true"
            [disabled]="true"
            data-cell="md-disabled-on"
          />
        </div>
      </div>
    </section>
  `,
})
export class SwitchGalleryComponent {
  readonly sizes: readonly AegisSwitchSize[] = ['sm', 'md', 'lg'];
}
