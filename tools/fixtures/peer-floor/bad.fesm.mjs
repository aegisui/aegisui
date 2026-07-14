// Fixture: idéntico a good.fesm.mjs, pero simulando que el componente usa una
// feature exclusiva de Angular 22 (minVersion embebido 22.0.0). Debe hacer
// fallar el gate peer-floor (suelo 20.0.0, §3.1).
import * as i0 from '@angular/core';

export class BadFixtureComponent {
  label = i0.input('fixture');
  static ɵfac = function BadFixtureComponent_Factory(t) {
    return new (t || BadFixtureComponent)();
  };
  static ɵcmp = /*@__PURE__*/ i0.ɵɵngDeclareComponent({
    minVersion: "22.0.0",
    version: "22.0.6",
    ngImport: i0,
    type: BadFixtureComponent,
    isStandalone: true,
    selector: 'lib-bad-fixture',
    inputs: { label: { classPropertyName: 'label', publicName: 'label', isSignal: true } },
    template: '<span>{{ label() }}</span>',
    isInline: true,
    changeDetection: i0.ChangeDetectionStrategy.OnPush,
  });
}

i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "22.0.6",
  ngImport: i0,
  type: BadFixtureComponent,
  decorators: [{ type: i0.Component, args: [{}] }],
});
