// Fixture: fragmento de FESM realista (basado en el spike de §3.1). No se
// importa ni se ejecuta nunca: solo se lee como texto para el regex de
// peer-floor. minVersion 17.1.0 -> por debajo del suelo (20.0.0), pasa.
import * as i0 from '@angular/core';

export class GoodFixtureComponent {
  label = i0.input('fixture');
  static ɵfac = function GoodFixtureComponent_Factory(t) {
    return new (t || GoodFixtureComponent)();
  };
  static ɵcmp = /*@__PURE__*/ i0.ɵɵngDeclareComponent({
    minVersion: "17.1.0",
    version: "22.0.6",
    ngImport: i0,
    type: GoodFixtureComponent,
    isStandalone: true,
    selector: 'lib-good-fixture',
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
  type: GoodFixtureComponent,
  decorators: [{ type: i0.Component, args: [{}] }],
});
