import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AegisButtonComponent, AegisCardComponent } from '@aegisui/ui';

/**
 * Galería de <aegis-card> REALES (padding × elevación), en la app zoneless del
 * sandbox. Es el OBJETIVO de los gates DOM de §9.2 para la Card.
 *
 * La última celda proyecta un <aegis-button> EN LA ESQUINA a propósito: es el
 * objetivo del test de 2.4.11 (el anillo de foco no debe quedar recortado por el
 * `border-radius` de la Card). Sin esa celda, un `overflow: hidden` introducido
 * por descuido pasaría desapercibido en el navegador.
 *
 * Cada tarjeta lleva `data-cell="<padding>-<elevación>"` para localizarla.
 */
@Component({
  selector: 'aegis-card-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisCardComponent, AegisButtonComponent],
  styleUrl: './card-gallery.component.css',
  template: `
    <section class="gallery" aria-label="Galería de la Card">
      <div class="group" data-variant="padding">
        <h3>padding</h3>
        <div class="row">
          @for (p of paddings; track p) {
            <aegis-card [padding]="p" [attr.data-cell]="p + '-flat'">
              <h4>Padding {{ p }}</h4>
              <p>Contenido de ejemplo de la tarjeta.</p>
            </aegis-card>
          }
        </div>
      </div>

      <div class="group" data-variant="elevacion">
        <h3>elevación</h3>
        <div class="row">
          <aegis-card elevation="flat" data-cell="md-flat-2">
            <h4>Plana</h4>
            <p>El borde es la señal de límite.</p>
          </aegis-card>
          <aegis-card elevation="raised" data-cell="md-raised">
            <h4>Elevada</h4>
            <p>Sombra de capa 1 para separarla del fondo.</p>
          </aegis-card>
        </div>
      </div>

      <div class="group" data-variant="interactivo">
        <h3>contenido interactivo</h3>
        <div class="row">
          <aegis-card elevation="raised" data-cell="md-interactive">
            <h4>Invita a tu equipo</h4>
            <p>El anillo de foco del botón no se recorta (2.4.11).</p>
            <aegis-button data-focus-probe>Enviar invitación</aegis-button>
          </aegis-card>
        </div>
      </div>
    </section>
  `,
})
export class CardGalleryComponent {
  readonly paddings = ['none', 'sm', 'md', 'lg'] as const;
}
