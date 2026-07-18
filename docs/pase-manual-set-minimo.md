# Pase manual de cierre — set mínimo

Guion del pase manual con lector de pantalla sobre el **banco de composición**
del sandbox (SPEC §8.4/§8.5). Objetivo: lo que **ningún gate automático puede
confirmar**.

**Dónde:** `pnpm nx run sandbox:serve` → sección «Banco de composición».
**Con qué:** NVDA + Firefox **y** VoiceOver + Safari. Un solo lector no
certifica el patrón — solo certifica ese lector (lección de ADR-019).
**Cuándo:** antes de release, no en cada PR.

> **Por qué un banco compuesto y no las galerías.** Las galerías verifican cada
> componente en aislamiento y ya están cubiertas por gates automáticos. Lo que
> nadie ha comprobado nunca es el comportamiento **compuesto**: el recorrido de
> foco a través de los cinco, el anillo de foco dentro de una Card, el contraste
> sobre `surface.raised` en vez de `canvas`, y —lo más importante— **quién
> anuncia y quién no** cuando hay tres fuentes de estado en la misma pantalla.

---

## 1 · Recorrido de foco completo (2.4.3, 2.4.7, 2.4.11)

Desde el principio de la sección, solo con `Tab`:

- [ ] El orden es el visual: correo → nombre → 2 interruptores → Cancelar →
      Guardar → Eliminar cuenta.
- [ ] El **tercer interruptor** («Acceso de la API»), deshabilitado, **se salta**.
- [ ] Cada parada muestra su anillo de foco **completo**, sin recortes.
- [ ] **El caso que importa (2.4.11):** los botones están pegados al borde
      redondeado de la Card. Su anillo **no** debe quedar cortado por la esquina.
      Es el fallo que la Card evita al no aplicar `overflow: hidden`.
- [ ] `Shift+Tab` recorre lo mismo en orden inverso, sin saltos ni trampas.

## 2 · Quién anuncia y quién NO (ADR-019) — el punto central

Aquí conviven las dos reglas de ADR-019 y un caso que no debe anunciarse nada.
Si algo suena de más, es un defecto.

**Error del Input (Regla 1 — solo `aria-describedby` + `aria-invalid`):**

- [ ] El campo «Correo de contacto» arranca con un valor inválido. Al enfocarlo,
      se anuncia el nombre, el estado inválido y el mensaje de error.
- [ ] **UNA sola lectura del mensaje.** Si se oye dos veces, la regresión es la
      de los cuatro intentos fallidos de ADR-019.
- [ ] Corrige el correo a uno válido y vuelve a enfocar: el error **ya no** se
      anuncia.
- [ ] Escribe un valor inválido con el campo **ya enfocado**: NVDA reanuncia el
      mensaje actualizado. *(VoiceOver: limitación conocida y documentada en
      ADR-019 — puede no reanunciar en caliente; al reenfocar sí.)*

**Interruptores (sin región live: `aria-checked` nativo):**

- [ ] Al enfocar: «Avisos por correo, interruptor, activado» (o desactivado).
- [ ] Con `Space` y con `Enter`: se anuncia el **cambio de estado**, una vez.
- [ ] **No hay ningún anuncio duplicado** ni un segundo mensaje redundante. El
      Switch no lleva región live a propósito; si oyes un eco, alguien añadió una.
- [ ] El interruptor deshabilitado se anuncia como no disponible **si lo
      alcanzas** navegando por elementos (no por `Tab`), y conserva su estado
      «activado».

**Badges (no deben anunciarse por su cuenta):**

- [ ] Al alternar «Avisos por correo», el badge de la cabecera cambia de
      «Avisos activos» a «Avisos en pausa».
- [ ] **Ese cambio NO se anuncia solo.** Un badge no es una región live: si se
      anunciara, cada contador de la página interrumpiría la lectura.
- [ ] Al recorrer el contenido, el badge se lee como parte del texto, sin rol
      raro ni «resaltado».

## 3 · Estructura y semántica (1.3.1)

- [ ] Con el rotor / lista de encabezados: «Ajustes de la cuenta» y «Zona de
      peligro» aparecen como encabezados de nivel 3.
- [ ] **Con la lista de landmarks/regiones: las Cards NO aparecen.** Las regiones
      son las dos `<section>` que aporta el consumidor, con su nombre. Si vieras
      una región por cada Card, la Card habría ganado un `role` que el contrato
      le prohíbe.
- [ ] Cada campo anuncia su etiqueta y su texto de ayuda. Ningún campo se
      anuncia como «editar texto» a secas.

## 4 · Estado vs acción (ADR-014/015), a simple vista

En «Zona de peligro» conviven el badge `danger` y el botón `danger`:

- [ ] El **badge** es un tinte suave con texto oscuro; el **botón** es sólido con
      texto claro. Se distinguen sin leerlos.
- [ ] Ninguno de los dos se confunde con el otro a un vistazo. Es la comparación
      que ninguna galería aislada permite hacer.

## 5 · Contraste y tema, sobre superficie elevada

Repetir en **claro y oscuro** (toggle del sandbox):

- [ ] Todo el texto dentro de las Cards se lee con holgura. El fondo es
      `surface.raised`, no `canvas`: es la superficie real de la landing.
- [ ] La pista del interruptor **apagado** se distingue del fondo de la Card (su
      borde es la señal de límite: el relleno solo da 1.16:1).
- [ ] El pulgar se distingue de la pista en **los dos** estados.
- [ ] Los cinco badges se leen con holgura sobre su propio tinte.

## 6 · Zoom y espaciado de texto (1.4.4, 1.4.10, 1.4.12)

- [ ] Zoom al **200%**: nada se solapa ni se corta; el layout pasa a una columna.
- [ ] Zoom al **400%** (equivalente a 320 px): sin scroll horizontal.
- [ ] Con espaciado de texto forzado (bookmarklet de 1.4.12): las Cards **crecen**
      y no recortan contenido.

## 7 · Reduced motion

- [ ] Con `prefers-reduced-motion: reduce` activo en el SO: el pulgar del
      interruptor **salta** a su posición final en vez de deslizarse. El estado
      final es idéntico.

---

## Registro del pase

| Fecha | Lector + navegador | Resultado | Notas |
|---|---|---|---|
| | NVDA + Firefox | | |
| | VoiceOver + Safari | | |

**Un fallo aquí no es un "detalle a pulir": es un defecto de accesibilidad** y se
trata como tal (SPEC §8: no es opcional ni se retrofitea). Si aparece algo que un
gate podría haber cazado, además de arreglarlo hay que preguntarse por qué el
gate no lo vio — es el patrón de ADR-018/020/021/022.
