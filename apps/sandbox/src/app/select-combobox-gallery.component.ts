import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AegisComboboxComponent, AegisSelectComponent } from '@aegisui/ui';

interface Pais {
  readonly id: number;
  readonly label: string;
}

const PAISES: readonly Pais[] = [
  { id: 1, label: 'Argentina' },
  { id: 2, label: 'Brasil' },
  { id: 3, label: 'Chile' },
];

const MUCHOS: readonly Pais[] = Array.from({ length: 150 }, (_, i) => ({
  id: i + 1,
  label: `País ${i + 1}`,
}));

/**
 * Galería de Select y Combobox para los gates e2e (Playwright/Chromium).
 *
 * Los paneles se dejan CERRADOS y cada test abre el que necesita. No es una
 * preferencia: `popover="auto"` hace que los popovers sean MUTUAMENTE EXCLUYENTES
 * —abrir uno cierra los demás—, así que una galería con varios paneles abiertos a
 * la vez es imposible por diseño del estándar, no por un fallo nuestro. Lo
 * descubrió este mismo gate en Chromium real; jsdom no podía verlo.
 *
 * Es además la forma realista: nadie tiene dos desplegables abiertos a la vez.
 */
@Component({
  selector: 'aegis-select-combobox-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisSelectComponent, AegisComboboxComponent],
  template: `
    <section class="gallery" aria-label="Galería de Select y Combobox">
      <aegis-select
        data-testid="select-cerrado"
        label="Select cerrado"
        placeholder="Elige un país"
        [options]="paises"
        optionLabel="label"
      />

      <aegis-select
        data-testid="select-abierto"
        label="Select abierto"
        [options]="paises"
        optionLabel="label"
        [value]="paises[1]"
      />

      <aegis-select
        data-testid="select-truncado"
        label="Select truncado"
        [options]="muchos"
        optionLabel="label"
      />

      <aegis-combobox
        data-testid="combobox-cerrado"
        label="Combobox cerrado"
        placeholder="Busca un país"
        [options]="paises"
        optionLabel="label"
      />

      <aegis-combobox
        data-testid="combobox-abierto"
        label="Combobox abierto"
        [options]="paises"
        optionLabel="label"
      />

      <aegis-combobox
        data-testid="combobox-invalido"
        label="Combobox inválido"
        [options]="paises"
        optionLabel="label"
        [invalid]="true"
        errorMessage="Elige un país de la lista"
      />
    </section>
  `,
  styles: `
    .gallery {
      display: grid;
      gap: 2rem;
      padding: 1rem;
    }
  `,
})
export class SelectComboboxGalleryComponent {
  protected readonly paises = PAISES;
  protected readonly muchos = MUCHOS;
}
