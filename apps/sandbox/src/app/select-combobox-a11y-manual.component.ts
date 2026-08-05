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
  { id: 4, label: 'Colombia' },
  { id: 5, label: 'España' },
  { id: 6, label: 'México' },
  { id: 7, label: 'Perú' },
];

const MUCHOS: readonly Pais[] = Array.from({ length: 150 }, (_, i) => ({
  id: i + 1,
  label: `País ${i + 1}`,
}));

/**
 * Banco para el pase MANUAL con lector de pantalla del Select y el Combobox
 * (SPEC §8.4). **Ningún gate cubre esto**: el foco virtual sobre un campo
 * editable es donde los lectores más difieren, y es el examen final del patrón.
 *
 * Criterio de todos los casos: el foco DOM **nunca** sale del disparador (Select)
 * ni del campo (Combobox); la opción activa se lee al navegar; la truncación se
 * anuncia UNA vez; y el recuento normal NO se duplica con el anuncio nativo del
 * lector (ADR-019 Regla 3).
 *
 * Los dos, con NVDA+Firefox y con VoiceOver+Safari: un solo lector no certifica
 * un patrón.
 */
@Component({
  selector: 'aegis-select-combobox-a11y-manual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisSelectComponent, AegisComboboxComponent],
  styleUrl: './select-combobox-a11y-manual.component.css',
  template: `
    <div class="bench">
      <div class="case">
        <h3>1 · Select — abrir y navegar</h3>
        <p class="hint">
          Abre con <kbd>Enter</kbd> o <kbd>↓</kbd> y recorre con las flechas. Debe leer cada opción
          activa <strong>sin</strong> que el foco salga del disparador. <kbd>Esc</kbd> cierra y
          devuelve el foco.
        </p>
        <aegis-select
          label="País"
          placeholder="Elige un país"
          [options]="paises"
          optionLabel="label"
        />
      </div>

      <div class="case">
        <h3>2 · Select — con selección previa</h3>
        <p class="hint">Al abrir, la opción activa debe ser la ya seleccionada, no la primera.</p>
        <aegis-select
          label="País de residencia"
          [options]="paises"
          optionLabel="label"
          [value]="paises[3]"
        />
      </div>

      <div class="case">
        <h3>3 · Select — truncado (150 opciones, cap 100)</h3>
        <p class="hint">
          La fila de estado NO debe leerse como una opción más, y <kbd>Fin</kbd> debe parar en la
          última opción renderizada.
        </p>
        <aegis-select label="País (lista larga)" [options]="muchos" optionLabel="label" />
      </div>

      <div class="case">
        <h3>4 · Combobox — teclear y navegar (el caso central)</h3>
        <p class="hint">
          Escribe «bra» y baja con <kbd>↓</kbd>. Debe leer la opción activa <strong>sin</strong> que
          el foco salga del campo. <kbd>Espacio</kbd> debe escribir un espacio,
          <strong>no</strong> seleccionar.
        </p>
        <aegis-combobox
          label="País"
          placeholder="Busca un país"
          [options]="paises"
          optionLabel="label"
        />
      </div>

      <div class="case">
        <h3>5 · Combobox — teclear hasta truncar, y seguir tecleando</h3>
        <p class="hint">
          Escribe «País» (150 coincidencias). La truncación debe anunciarse
          <strong>una</strong> vez. Sigue tecleando: no debe inundarte de anuncios.
        </p>
        <aegis-combobox label="País (lista larga)" [options]="muchos" optionLabel="label" />
      </div>

      <div class="case">
        <h3>6 · Combobox — cero resultados</h3>
        <p class="hint">
          Escribe «zzz». Debe anunciarse el vacío, y <code>aria-activedescendant</code> debe
          desaparecer (no quedar apuntando a nada).
        </p>
        <aegis-combobox label="País" [options]="paises" optionLabel="label" />
      </div>

      <div class="case">
        <h3>7 · Combobox INVÁLIDO con panel abierto</h3>
        <p class="hint">
          El caso que prueba la coexistencia: debe anunciarse el error
          <strong>y</strong> seguir funcionando el patrón (rol, expandido, opción activa).
        </p>
        <aegis-combobox
          label="País"
          [options]="paises"
          optionLabel="label"
          [invalid]="true"
          errorMessage="Elige un país de la lista para continuar."
        />
      </div>

      <div class="case">
        <h3>8 · Combobox con etiqueta flotante</h3>
        <p class="hint">
          Mismo patrón con <code>labelMode="floating"</code>: la etiqueta no puede robarle el nombre
          accesible al campo.
        </p>
        <aegis-combobox label="País" [options]="paises" optionLabel="label" labelMode="floating" />
      </div>

      <div class="case">
        <h3>9 · Deshabilitado y solo lectura</h3>
        <p class="hint">
          <code>role="combobox"</code> sustituye al rol implícito del campo: comprobar que el estado
          deshabilitado <strong>se sigue anunciando</strong> (varía entre lectores).
        </p>
        <aegis-select
          label="Select deshabilitado"
          [options]="paises"
          optionLabel="label"
          [disabled]="true"
        />
        <aegis-combobox
          label="Combobox deshabilitado"
          [options]="paises"
          optionLabel="label"
          [disabled]="true"
        />
      </div>
    </div>
  `,
})
export class SelectComboboxA11yManualComponent {
  protected readonly paises = PAISES;
  protected readonly muchos = MUCHOS;
}
