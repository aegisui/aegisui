# Contributing to Aegis UI

> Antes de nada: lee [`docs/SPEC.md`](./SPEC.md). Es el documento maestro.
> Este fichero solo explica el *cómo*; el *qué* y el *por qué* están allí.

---

## Principio rector

> Los raíles **son el producto**. Schematics, reglas ESLint, tokens, contratos y
> gates de CI existen para que el desarrollo pueda ser mayormente autónomo sin que
> la calidad se degrade. Si te encuentras peleando contra un raíl, **no lo esquives:
> discútelo en un issue**. Un raíl que se puede saltar no es un raíl.

---

## Puesta en marcha

```bash
pnpm install
pnpm nx run-many -t build
pnpm nx serve sandbox      # app de pruebas
pnpm nx run docs:storybook # catálogo de componentes
```

Requisitos: Node 22 LTS, pnpm, Angular 22.

---

## El flujo, de principio a fin

Ningún componente se implementa sin contrato aprobado. El orden es innegociable:

```
1. Issue          → describe el problema, no la solución
2. Contrato       → PR que solo añade docs/contracts/<x>.md
   🚦 aprobación humana
3. Implementación → PR con código + tests + story + changeset
   🚦 CI verde + revisión humana
4. Release        → automático vía Changesets
```

**Por qué el contrato va en un PR aparte:** discutir la API en abstracto es barato;
discutirla cuando ya hay 400 líneas escritas es caro y sesgado.

---

## Escribir un contrato

Copia la plantilla de `docs/SPEC.md` §6 a `docs/contracts/<component>.md`.

Un contrato está listo cuando:

- Cada input tiene tipo, default y descripción
- La sección de accesibilidad está **completa**, no es un placeholder
- Los criterios de aceptación se pueden traducir a tests **uno a uno**
- Existe una sección "Fuera de alcance" que dice explícitamente qué NO hace

Si no puedes escribir el "Fuera de alcance", no entiendes el componente todavía.

---

## Implementar un componente

```bash
pnpm nx g @aegisui/generators:component <nombre>
```

El generador crea la estructura, el fichero de tests, la story y la entrada de docs.
**No crees componentes a mano.** El generador existe para que la estructura sea
idéntica en todos, que es lo que permite automatizar el resto.

### Reglas de código (todas verificadas en CI)

| Regla | |
|---|---|
| Standalone | Prohibido `NgModule` |
| Signals | Solo `input()`, `output()`, `model()`. Prohibidos `@Input()` / `@Output()` |
| Detección de cambios | `ChangeDetectionStrategy.OnPush`, siempre |
| Zoneless | Nada puede depender de `zone.js` |
| Estilos | Cero valores literales de color/espaciado/radio/sombra. Solo `var(--aegis-*)` de capa 3 |
| Dark mode | La palabra `dark` **no puede aparecer** en el CSS de un componente. El dark vive en los tokens |
| Brain/skin | La lógica reutilizable (posicionamiento, foco, teclado) va en `cdk`, nunca en `ui` |

### Accesibilidad — WCAG 2.2 AA

**No es opcional y no se retrofitea.** Ver `SPEC.md` §8.

Lo que más se olvida y aquí se bloquea en CI:

- **Foco visible** con `:focus-visible`. `outline: none` sin sustituto = PR rechazado.
- **Contraste** 4.5:1 (texto) y 3:1 (UI) **en light y en dark**. Un token que no
  pasa contraste no se mergea.
- **Target size** ≥ 24×24 px en todo lo interactivo, incluidas las variantes `sm`.
- **Sin trampas de foco** salvo en modales, y ahí siempre con `Esc`.
- **Alternativa sin arrastre** para cualquier interacción de drag.
- **`prefers-reduced-motion`** en toda animación.
- **`aria-live`** para toasts, validaciones y estados de carga.

> Recuerda: axe detecta aproximadamente un tercio de los problemas reales.
> Pasar axe en verde **no** significa que sea accesible. Por eso el contrato declara
> el comportamiento de teclado y los anuncios uno a uno, y por eso hay verificación
> manual con lector de pantalla antes de cada release.

---

## Tests

Un test por criterio de aceptación del contrato. Se testea **comportamiento
observable**, nunca implementación.

```bash
pnpm nx test ui                    # unitarios
pnpm nx run ui:test-a11y           # axe, light + dark
pnpm nx run ui:test-visual         # Playwright snapshots
pnpm nx run tokens:test-contrast   # contraste de todos los pares de tokens
```

Si actualizas snapshots visuales, **explica en el PR por qué cambiaron**. Un
snapshot actualizado sin justificación es una regresión aprobada por accidente.

---

## Changesets

Todo PR que toque `packages/**` necesita un changeset:

```bash
pnpm changeset
```

- `patch` → bugfix, sin cambio de API
- `minor` → funcionalidad nueva, retrocompatible
- `major` → breaking change (requiere justificación en el PR y nota de migración)

---

## Bugs

**El primer commit de un fix es el test que falla.** Sin excepciones.

Un bug sin test de regresión no está arreglado: está oculto hasta la próxima vez.

---

## Qué NO hacer

- Añadir una dependencia en runtime que no sea `@angular/*` (abre un issue primero)
- Reimplementar en `ui` algo que debería vivir en `cdk`
- Saltarse el generador "porque es un componente pequeño"
- Marcar un test como `skip` para que pase CI
- Actualizar snapshots visuales sin mirarlos
- Escribir código antes de que el contrato esté aprobado
