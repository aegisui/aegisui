import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AegisButtonComponent } from '@aegisui/ui';

/**
 * Banco de pruebas para la validación MANUAL con lector de pantalla (NVDA+Firefox,
 * VoiceOver+Safari) del Button — SPEC §8.5: axe detecta ~1/3 de los problemas
 * reales; la región `aria-live` de carga es la parte más frágil (riesgo de doble
 * anuncio o anuncio fantasma entre lectores) y no la cubre ningún gate automático.
 *
 * No es la galería de los gates (`button-gallery`, estática, para Playwright):
 * aquí el botón de carga es DISPARABLE de verdad (async real), para escuchar el
 * anuncio en el momento en que ocurre, no un estado ya fijado en el DOM.
 */
@Component({
  selector: 'aegis-button-a11y-manual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisButtonComponent],
  styleUrl: './button-a11y-manual.component.css',
  template: `
    <div class="bench">
      <div class="case">
        <h3>1 · Botón normal</h3>
        <p class="hint">Enfócalo con Tab. Debe anunciar «Guardar cambios, botón».</p>
        <aegis-button (click)="normalClicks.set(normalClicks() + 1)">
          Guardar cambios
        </aegis-button>
        <p class="hint" aria-live="off">Clicks: {{ normalClicks() }}</p>
      </div>

      <div class="case">
        <h3>2 · Loading disparable (async real)</h3>
        <p class="hint">
          Actívalo y NO toques el foco. Escucha: ¿anuncia «Cargando…» una vez, dos veces (doble
          anuncio), o nada? ¿El foco se queda en el botón?
        </p>
        <aegis-button [loading]="loading()" (click)="triggerLoading()">
          Enviar formulario
        </aegis-button>
        <p class="hint" aria-live="off">
          Estado: {{ loading() ? 'cargando…' : 'listo' }} · disparos: {{ triggerCount() }}
        </p>
      </div>

      <div class="case">
        <h3>3a · Icono-solo CON aria-label (correcto)</h3>
        <p class="hint">Debe anunciar «Cerrar, botón» (nunca solo «×, botón»).</p>
        <aegis-button variant="secondary" size="sm" aria-label="Cerrar">×</aegis-button>
      </div>

      <div class="case">
        <h3>3b · Icono-solo SIN aria-label (defecto deliberado)</h3>
        <p class="hint">
          Sin nombre accesible: axe ya lo caza como violación (AC15). Escucha qué anuncia el lector
          — típicamente nada útil, o el carácter suelto.
        </p>
        <aegis-button variant="secondary" size="sm">×</aegis-button>
      </div>
    </div>
  `,
})
export class ButtonA11yManualComponent {
  protected readonly normalClicks = signal(0);
  protected readonly loading = signal(false);
  protected readonly triggerCount = signal(0);

  protected triggerLoading(): void {
    if (this.loading()) {
      return;
    }
    this.triggerCount.set(this.triggerCount() + 1);
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), 2500);
  }
}
