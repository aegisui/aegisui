# ADR-019: Anuncio de estado dinámico — `aria-describedby` estable + nodo `alert` separado

## Contexto

Pase manual con lector de pantalla del Input (Fase 4, contrato §Accesibilidad).
El mensaje de error usaba un único `<span role="alert" [id]="errorId()">`,
enlazado por `aria-describedby` del `<input>` **solo cuando** `invalid() &&
errorMessage()` eran verdaderos (el span, su `id` y la entrada en
`aria-describedby` aparecían y desaparecían juntos).

Resultado del pase manual (los dos casos que el contrato marca como frágiles,
SPEC §8.5 — axe no los detecta, ninguno):

- **VoiceOver + Safari:** el error se anuncia una vez, tanto al enfocar por
  primera vez un campo ya inválido como al aparecer con el campo ya enfocado
  (validación en vivo). Correcto.
- **NVDA + Firefox:** el mismo caso de validación en vivo (campo ya enfocado,
  el error aparece solo) se anuncia **dos veces**: una por la región `alert`,
  otra al releer la descripción del campo.

Dos causas contribuyen, no una:

1. **Un nodo, dos papeles.** El span es simultáneamente región live
   (`role="alert"`) y objetivo de `aria-describedby`. NVDA anuncia por los dos
   canales; VoiceOver los colapsa (comportamiento de implementación, no
   garantía de la spec ARIA).
2. **La relación `describedby` se crea en caliente.** Como el `id` del span
   solo existe cuando hay error, el atributo `aria-describedby` del `<input>`
   **gana una entrada nueva** en el instante en que aparece el error — con el
   campo ya enfocado. Eso no es solo "cambió el contenido de un nodo ya
   descrito": es "la relación de descripción cambió con el foco dentro", un
   disparador de re-anuncio conocido en NVDA, independiente de `role="alert"`.

La prueba de que la segunda causa es real (y de que ya sabíamos la respuesta):
el Button **ya** evita esto. Su región de `aria-live` para `loading`
(`docs/contracts/button.md`, comentario de `button.component.ts`) está en
`aria-describedby` **siempre**, cargando o no
(`[attr.aria-describedby]="srId"`, sin condición) — solo cambia el *texto* del
span. El Input no copió esa parte del patrón; le bastaba con hacerlo.

## Decisión

**Todo anuncio de estado dinámico (validación, progreso, cualquier cosa que
aparezca con el control ya enfocado) usa DOS nodos, nunca uno:**

1. **Nodo de descripción — estable.** El `id` que entra en
   `aria-describedby` existe **siempre**, desde el primer render, tenga o no
   contenido. Vacío cuando no aplica. La relación `describedby` nunca se crea
   ni se destruye con el foco dentro: solo cambia el texto. Sin `role="alert"`
   ni `aria-live` — es descripción bajo demanda, no un anuncio.
2. **Nodo de anuncio — separado, oculto, fuera de `describedby`.** Un segundo
   `<span>`, visualmente oculto (misma técnica que `.aegis-btn__sr`:
   `clip-path: inset(50%)`, no `display:none`, para seguir en el árbol de
   accesibilidad), con `role="alert"` (o `aria-live` según urgencia). Espeja el
   mismo texto que el nodo de descripción. Su único trabajo es disparar el
   anuncio cuando el texto cambia — incluso con el control ya enfocado.

Aplicado al Input (`packages/ui/src/lib/input/input.component.ts`):

```html
<span class="aegis-input__error" [id]="errorId()">
  @if (invalid() && errorMessage()) { {{ errorMessage() }} }
</span>
<span class="aegis-input__error-live" role="alert">
  @if (invalid() && errorMessage()) { {{ errorMessage() }} }
</span>
```

`errorId()` pasa de condicional (`invalid() && errorMessage() ? ... :
undefined`) a **siempre definido** (`${resolvedId()}-error`). El brain
(`AegisInput`, `@aegisui/cdk`) no cambia: su composición de `aria-describedby`
ya filtraba solo ids truthy — con `errorId` ahora siempre truthy, queda
siempre incluido, sin tocar esa lógica.

El span vacío no debe dejar un hueco visual: su margen va bajo
`:not(:empty)` en CSS, no en la regla base.

`helpText` **no** cambia — se queda condicional. No tiene región live ni
problema de re-anuncio (SPEC §8.5 y el contrato del Input ya lo tratan como
descripción bajo demanda, no como anuncio); generalizar el patrón ahí sin un
bug que lo motive sería tocar algo que no está roto.

## Consecuencias

- **Patrón canónico de la librería para cualquier componente enfocable**
  (Switch, Select, y el resto de la Fase 4 en adelante): el mismo problema
  reaparecerá en cualquier control que anuncie un cambio de estado mientras
  puede estar ya enfocado. Node de descripción estable + nodo de anuncio
  separado, siempre. El Button ya lo hacía (sin saber que sentaba precedente);
  el Input lo generaliza explícitamente; el próximo componente enfocable debe
  **encontrar** este ADR, no volver a descubrirlo con un lector de pantalla.
- Coste: un `<span>` oculto más por instancia, casi siempre vacío. Barato,
  coherente con lo que el Button ya paga.
- El contrato del Input se actualiza: "`invalid=true` sin `errorMessage`: …
  sin entrada nueva en `aria-describedby`" pasa a "hay una entrada estable en
  `aria-describedby`, vacía cuando no hay error" (mismo patrón `srId`).
- Ninguno de los dos casos lo cazan los gates automáticos (`a11y` con axe
  incluido): axe no evalúa si un lector de pantalla anuncia una vez o dos.
  Sigue siendo verificación **manual**, obligatoria antes de release (SPEC
  §8.4/§8.5) — este ADR no la sustituye, documenta el patrón que la hace
  pasar.
