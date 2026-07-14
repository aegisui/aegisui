import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Fixture "good": componente mínimo que cumple las 11 reglas de §7 a la vez.
 * Vive en tools/fixtures/ como test de regresión permanente de los raíles
 * (§13). No es un componente de producto y no se publica.
 */
@Component({
  selector: 'aegis-fixture-good',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ label() }}</span>`,
  styleUrl: './fixture-good.component.css',
})
export class FixtureGoodComponent {
  readonly label = input('fixture');
  readonly activated = output<void>();

  protected activate(): void {
    this.activated.emit();
  }
}
