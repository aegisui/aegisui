import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  AegisBadgeComponent,
  AegisButtonComponent,
  AegisCardComponent,
  AegisInputComponent,
  AegisSwitchComponent,
  type AegisBadgeVariant,
} from '@aegisui/ui';

/**
 * BANCO DE COMPOSICIÓN — pase manual de cierre del set mínimo (SPEC §8.4/§8.5).
 *
 * Los cinco componentes juntos en un formulario REALISTA, no en una galería de
 * celdas. Las galerías de cada componente verifican variantes en aislamiento;
 * esto verifica lo que ninguna de ellas puede: cómo se comportan COMPUESTOS.
 *
 * Qué se busca aquí y no en las galerías:
 *
 *  - **Orden de foco a través de los cinco.** Cada componente enfoca bien por
 *    separado; lo que nadie ha comprobado es el recorrido completo con Tab.
 *  - **Anillo de foco dentro de una Card** (2.4.11): el Button y el Input en la
 *    esquina de una Card son el caso real del recorte que la Card evita.
 *  - **Superficie compuesta:** dentro de una Card el fondo es `surface.raised`,
 *    no `canvas`. Los contrastes se verificaron contra las dos, pero aquí se
 *    ven a la vez, en claro y oscuro.
 *  - **Un solo error de validación, anunciado una vez** (ADR-019 Regla 1), en un
 *    formulario donde además hay un Switch que cambia estado (Regla 2 ausente:
 *    `aria-checked` nativo) y Badges que NO deben anunciarse.
 *
 * El formulario es deliberadamente mundano —ajustes de una cuenta— porque el
 * objetivo es el uso real, no el escaparate.
 */
@Component({
  selector: 'aegis-composicion-bench',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AegisCardComponent,
    AegisBadgeComponent,
    AegisInputComponent,
    AegisSwitchComponent,
    AegisButtonComponent,
  ],
  styleUrl: './composicion-bench.component.css',
  template: `
    <div class="bench">
      <!-- La semántica de región la aporta el CONSUMIDOR, no la Card
           (contrato de Card §Rol ARIA): aquí, una <section> con su encabezado. -->
      <section class="col" aria-labelledby="cuenta-titulo">
        <aegis-card elevation="raised" padding="lg">
          <header class="cabecera">
            <h3 id="cuenta-titulo">Ajustes de la cuenta</h3>
            <aegis-badge [variant]="estadoPlan().variante">{{ estadoPlan().texto }}</aegis-badge>
          </header>

          <p class="muted">
            El badge de arriba cambia de <strong>texto</strong> y de color a la vez: el color
            refuerza, no comunica solo (1.4.1).
          </p>

          <div class="campos">
            <aegis-input
              label="Correo de contacto"
              type="email"
              [(value)]="correo"
              [invalid]="correoInvalido()"
              [errorMessage]="mensajeError()"
              helpText="Lo usamos para avisos de seguridad."
              placeholder="tu@empresa.com"
            />

            <aegis-input
              label="Nombre visible"
              [(value)]="nombre"
              helpText="Aparece en las menciones de tu equipo."
            />
          </div>

          <div class="interruptores">
            <aegis-switch label="Avisos por correo" [(checked)]="avisos" />
            <aegis-switch label="Resumen semanal" [(checked)]="resumen" />
            <aegis-switch
              label="Acceso de la API (incluido en tu plan)"
              [checked]="true"
              disabled
            />
          </div>

          <!-- Botones EN LA ESQUINA de la Card a propósito: es el caso real de
               2.4.11 que la Card evita al no aplicar overflow: hidden.
               El Button no expone output propio: el click nativo bubblea
               (contrato del Button, Outputs). -->
          <footer class="acciones">
            <aegis-button variant="secondary" (click)="restablecer()">Cancelar</aegis-button>
            <aegis-button (click)="guardar()">Guardar cambios</aegis-button>
          </footer>
        </aegis-card>
      </section>

      <section class="col" aria-labelledby="zona-peligro-titulo">
        <aegis-card padding="lg">
          <header class="cabecera">
            <h3 id="zona-peligro-titulo">Zona de peligro</h3>
            <aegis-badge variant="danger">Irreversible</aegis-badge>
          </header>

          <p class="muted">
            El badge <code>danger</code> es <strong>tinte</strong>; el botón destructivo es
            <strong>sólido</strong>. Estado vs acción, uno al lado del otro (ADR-014/015): es la
            comparación que ninguna galería aislada permite hacer.
          </p>

          <footer class="acciones">
            <aegis-button variant="danger" (click)="borrar()">Eliminar cuenta</aegis-button>
          </footer>
        </aegis-card>
      </section>

      <p class="registro">{{ ultimaAccion() }}</p>
    </div>
  `,
})
export class ComposicionBenchComponent {
  readonly correo = signal('no-es-un-correo');
  readonly nombre = signal('');
  readonly avisos = signal(true);
  readonly resumen = signal(false);
  readonly ultimaAccion = signal('Sin acciones todavía.');

  /** Validación mínima, solo para ejercitar el estado inválido del Input. */
  protected readonly correoInvalido = computed(() => {
    const v = this.correo().trim();
    return v.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  });

  protected readonly mensajeError = computed(() =>
    this.correoInvalido()
      ? 'Escribe un correo con formato válido (nombre@dominio.com).'
      : undefined,
  );

  /** El texto cambia con el estado, no solo el color (1.4.1). */
  protected readonly estadoPlan = computed<{ variante: AegisBadgeVariant; texto: string }>(() =>
    this.avisos()
      ? { variante: 'success', texto: 'Avisos activos' }
      : { variante: 'neutral', texto: 'Avisos en pausa' },
  );

  protected guardar(): void {
    // El botón NO se deshabilita con el formulario inválido: un submit
    // deshabilitado no explica por qué (el usuario de lector se queda sin
    // pista). Se deja activo y el error del campo es quien informa.
    if (this.correoInvalido()) {
      this.ultimaAccion.set('No se guardó: revisa el correo.');
      return;
    }
    this.ultimaAccion.set(`Guardado: ${this.correo()} · avisos ${this.avisos() ? 'sí' : 'no'}`);
  }

  protected restablecer(): void {
    this.correo.set('');
    this.nombre.set('');
    this.ultimaAccion.set('Cambios descartados.');
  }

  protected borrar(): void {
    this.ultimaAccion.set('Acción destructiva confirmada (simulada).');
  }
}
