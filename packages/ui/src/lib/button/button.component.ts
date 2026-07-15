import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * `<aegis-button>` — piel estilada sobre el brain `AegisButton` de
 * `@aegisui/cdk` (ADR-002). API signals-only, OnPush, standalone.
 *
 * TODO: compón el brain con `hostDirectives: [AegisButton]` y añade los
 * inputs/estados que declare docs/contracts/button.md.
 */
@Component({
  selector: 'aegis-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styleUrl: './button.component.css',
})
export class AegisButtonComponent {}
