import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';

let nextId = 0;

/**
 * Atributos que gobierna el propio Input y que un envoltorio **NO PUEDE**
 * escribir por `controlAttrs`.
 *
 * La protección es estructural, no una regla de estilo: lo que no se puede
 * escribir no se puede romper. `aria-describedby` es el más delicado — es la
 * composición de ayuda + error de ADR-019, y pisarlo rompería el anuncio del
 * error de la forma más silenciosa posible.
 */
const ATRIBUTOS_PROTEGIDOS: readonly string[] = [
  'id',
  'disabled',
  'readonly',
  'required',
  'aria-required',
  'aria-invalid',
  'aria-describedby',
];

/**
 * Brain (headless) del Input — `@aegisui/cdk` (ADR-002, brain/skin).
 *
 * Se aplica a un `<input>` NATIVO real (`input[aegisInput]`): heredamos su
 * edición de texto, selección, portapapeles y autocompletado, y no
 * reimplementamos nada de eso (contrato §Selector, §Accesibilidad).
 *
 * Aquí vive la ÚNICA fuente de verdad de:
 * - el `id` del campo (auto-generado si el consumidor no aporta uno, para que
 *   el `<label for>` que pinta `ui` siempre tenga a qué apuntar).
 * - la composición de `aria-describedby` (ayuda + error, omitiendo el que
 *   falte — nunca un `aria-describedby=""` vacío).
 * - el reflejo de `aria-invalid`/`aria-required` (ausentes, no `"false"`,
 *   cuando no aplican: una AT no necesita que se le diga "no inválido").
 * - `focus()`, porque `.focus()` es territorio del cdk (regla
 *   `cdk-before-ui`): ninguna llamada a `.focus()` puede vivir en `ui`.
 *
 * El anuncio del error NO necesita ni `aria-live` ni `role="alert"` ni estado
 * de foco: `aria-describedby` + `aria-invalid` bastan (ADR-019). NVDA/JAWS
 * reannuncian nativamente el texto del nodo descrito cuando el campo enfocado
 * cambia su descripción; añadir una región live lo duplicaría y rompería el
 * `aria-describedby` en VoiceOver.
 */
@Directive({
  selector: 'input[aegisInput]',
  exportAs: 'aegisInput',
  host: {
    '[attr.id]': 'id()',
    '[disabled]': 'disabled()',
    '[readOnly]': 'readonly()',
    '[required]': 'required()',
    '[attr.aria-required]': "required() ? 'true' : null",
    '[attr.aria-invalid]': "invalid() ? 'true' : null",
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class AegisInput {
  private readonly elementRef = inject(ElementRef<HTMLInputElement>);

  /** id propio del campo. Auto-generado si el consumidor no aporta uno. */
  readonly id = input<string>(`aegis-input-${nextId++}`);

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });

  /** ids de `helpText`/`errorMessage` en `ui`, o `undefined` si no existen. */
  readonly helpId = input<string | undefined>(undefined);
  readonly errorId = input<string | undefined>(undefined);

  /** `aria-describedby` compuesto: solo los ids que de verdad existen. */
  readonly describedBy = computed(() => {
    const ids = [this.helpId(), this.errorId()].filter((v): v is string => !!v);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /**
   * Atributos que un ENVOLTORIO vuelca sobre este `<input>`.
   *
   * Existe porque un envoltorio (hoy el Combobox) necesita que su ARIA aterrice
   * en el `<input>` REAL —el que recibe el foco—, no en el host del componente
   * que lo pinta. Sin esto, un lector de pantalla enfoca un campo sin `role` ni
   * `aria-activedescendant`: el patrón entero deja de funcionar.
   *
   * **El Input NO gana conocimiento de combobox**: esto es un canal genérico
   * ("un envoltorio puede gobernar mi control interno"), reutilizable por
   * cualquier envoltorio futuro sin volver a tocar esta API.
   *
   * Reglas:
   * - `null` **retira** el atributo (no lo pone a `""`). Lo exige el contrato del
   *   listbox para `aria-activedescendant`, que debe DESAPARECER sin opción activa.
   * - Los {@link ATRIBUTOS_PROTEGIDOS} no se pueden escribir: en desarrollo se
   *   lanza nombrando el atributo; en producción gana el Input, sin ruido.
   */
  readonly controlAttrs = input<Record<string, string | null> | undefined>(undefined);

  /** Claves aplicadas en la última pasada, para poder retirar las que desaparezcan. */
  private aplicadas: string[] = [];

  constructor() {
    effect(() => {
      const attrs = this.controlAttrs() ?? {};
      const el = this.elementRef.nativeElement;

      // Falla ruidosamente, como los gates. Ignorar en silencio es cómo alguien
      // pierde una tarde preguntándose por qué su atributo no se aplica. El
      // bloque desaparece en producción (`ngDevMode` queda como `false`).
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        for (const clave of Object.keys(attrs)) {
          if (ATRIBUTOS_PROTEGIDOS.includes(clave.toLowerCase())) {
            throw new Error(
              `[AegisInput] controlAttrs no puede escribir "${clave}": lo gobierna el ` +
                `propio Input. Protegidos: ${ATRIBUTOS_PROTEGIDOS.join(', ')}. ` +
                `Pisarlos rompería la relación label/id o el anuncio del error (ADR-019).`,
            );
          }
        }
      }

      for (const clave of this.aplicadas) {
        if (!(clave in attrs)) {
          el.removeAttribute(clave);
        }
      }

      const siguientes: string[] = [];
      for (const [clave, valor] of Object.entries(attrs)) {
        if (ATRIBUTOS_PROTEGIDOS.includes(clave.toLowerCase())) {
          continue; // en producción: gana el Input
        }
        if (valor === null) {
          el.removeAttribute(clave);
        } else {
          el.setAttribute(clave, valor);
          siguientes.push(clave);
        }
      }
      this.aplicadas = siguientes;
    });
  }

  /** Enfoca el campo real. Expuesto para consumidores (p. ej. tras validar un formulario). */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }
}
