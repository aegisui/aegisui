import { Component, EventEmitter, Input, NgModule, Output } from '@angular/core';

/**
 * Fixture "bad": el mismo componente que fixture-good, deliberadamente roto,
 * violando una a una las reglas de §7 expresables en TypeScript. No se corrige
 * ni se publica: es el fixture rojo permanente de la Fase 1 (§13).
 */
@Component({
  selector: 'aegis-fixture-bad',
  template: `<span>{{ label }}</span>`,
  styleUrl: './fixture-bad.component.css',
  // (falta changeDetection: OnPush -> require-onpush)
  // (no existe docs/contracts/fixture-bad.md -> contract-exists)
})
export class FixtureBadComponent {
  // no-decorator-io: prohibido @Input()/@Output(), solo input()/output()
  @Input() label = 'fixture';
  @Output() activated = new EventEmitter<void>();

  // cdk-before-ui: lógica de teclado implementada directamente en ui
  bind(el: HTMLElement): void {
    el.addEventListener('keydown', () => this.activated.emit());
  }
}

// no-ngmodule: prohibido @NgModule, Aegis UI es standalone-only
@NgModule({})
export class FixtureBadModule {}
