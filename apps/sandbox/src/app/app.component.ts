import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

/**
 * Raíz del sandbox. Standalone + OnPush + signals, sin zone.js.
 * Su única función en Fase 1 es demostrar que la app arranca zoneless.
 */
@Component({
  selector: 'aegis-sandbox-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>Aegis UI — Sandbox</h1>
      <p>Angular 22 · zoneless · standalone</p>
      <button type="button" (click)="increment()">Clics: {{ count() }}</button>
    </main>
  `,
})
export class AppComponent {
  protected readonly count = signal(0);

  protected increment(): void {
    this.count.update((n) => n + 1);
  }
}
