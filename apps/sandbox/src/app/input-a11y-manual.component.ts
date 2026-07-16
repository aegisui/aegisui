import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AegisInputComponent } from '@aegisui/ui';

/**
 * Banco de pruebas para la validación MANUAL con lector de pantalla (NVDA+Firefox,
 * VoiceOver+Safari) del Input — SPEC §8.5. El `role="alert"` del mensaje de error
 * es el punto frágil (equivalente al `aria-live` del `loading` del Button, docs/
 * contracts/input.md §Accesibilidad): no lo cubre axe ni ningún gate automático.
 *
 * Caso 2 usa `(focusin)` (bubblea) para disparar el error MIENTRAS el campo ya
 * está enfocado, sin mover el foco — la demostración en vivo de por qué
 * `(focus)`/`(blur)` nativos NO sirven aquí (no bubblean, contrato §Outputs).
 */
@Component({
  selector: 'aegis-input-a11y-manual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisInputComponent],
  styleUrl: './input-a11y-manual.component.css',
  template: `
    <div class="bench">
      <div class="case">
        <h3>1 · Campo normal, sin error</h3>
        <p class="hint">Enfócalo con Tab. Debe anunciar «Nombre, editar texto».</p>
        <aegis-input label="Nombre" />
      </div>

      <div class="case">
        <h3>2 · Error YA presente al enfocar</h3>
        <p class="hint">
          Enfócalo con Tab. Debe anunciar el nombre, el valor Y el mensaje de error, todo al enfocar
          por primera vez.
        </p>
        <aegis-input
          label="Correo"
          value="no-es-un-correo"
          [invalid]="true"
          errorMessage="Introduce un correo con formato válido."
        />
      </div>

      <div class="case">
        <h3>3 · Error apareciendo con el campo YA enfocado (el caso frágil)</h3>
        <p class="hint">
          Enfoca el campo con Tab y NO toques nada más durante ~2s. A los 2s aparece un error sin
          que el foco se mueva. Escucha: ¿se anuncia igual que el caso 2, o en silencio? Esto es lo
          que <code>role="alert"</code> existe para resolver — y lo que ningún gate automático puede
          confirmar.
        </p>
        <div (focusin)="onFocusIn()">
          <aegis-input
            label="Correo (validación en vivo)"
            value="alguien@ejemplo.com"
            [invalid]="liveInvalid()"
            [errorMessage]="liveError()"
          />
        </div>
        <p class="hint" aria-live="off">
          Estado: {{ liveInvalid() ? 'error disparado' : 'a la espera de foco' }}
        </p>
      </div>
    </div>
  `,
})
export class InputA11yManualComponent {
  protected readonly liveInvalid = signal(false);
  protected readonly liveError = signal<string | undefined>(undefined);
  private triggered = false;

  protected onFocusIn(): void {
    if (this.triggered) {
      return;
    }
    this.triggered = true;
    setTimeout(() => {
      this.liveInvalid.set(true);
      this.liveError.set('Este correo ya está registrado.');
    }, 2000);
  }
}
