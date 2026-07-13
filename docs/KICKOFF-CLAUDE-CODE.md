# Prompt de arranque — Claude Code

## Preparación (haz esto tú, antes)

```bash
gh repo create aegisui --public --clone
cd aegisui
mkdir -p docs
# copia SPEC.md y CONTRIBUTING.md a docs/
git add . && git commit -m "docs: spec inicial" && git push
claude
```

> **Antes del primer commit, reserva la identidad** (5 minutos, evita rehacer 30
> `package.json`):
> - Crea la organización `aegisui` en npm
> - Crea la org o el repo `aegisui` en GitHub
> - Registra el dominio (`aegisui.dev` / `.com`)

---

## Prompt 1 — Contexto y plan (no escribe código todavía)

Pégale esto:

```
Lee docs/SPEC.md y docs/CONTRIBUTING.md enteros antes de responder nada.

Este es el documento maestro del proyecto. Vamos a ejecutar únicamente la FASE 1
(§13): el esqueleto del monorepo y los raíles de calidad. No toques nada de fases
posteriores: no crees componentes, no crees tokens de diseño, no crees el codemod.

Antes de escribir una sola línea de código, quiero que hagas tres cosas:

1. Resume en 10 líneas qué has entendido que es este proyecto y por qué la Fase 1
   no produce ningún componente.

2. Dime qué decisiones NO están cerradas en el spec y que necesitas para poder
   ejecutar la Fase 1 sin improvisar. Pregúntamelas. No las inventes.

3. Propón el plan de ejecución de la Fase 1 como una lista ordenada de commits,
   donde cada commit deje el repo en verde.

Para y espera mi respuesta. No ejecutes nada todavía.
```

**Por qué así:** si le dejas empezar a escribir directamente, va a improvisar las
decisiones que faltan y te las vas a encontrar enterradas en 3.000 líneas.

---

## Prompt 2 — Ejecución de la Fase 1

Cuando hayas respondido a sus preguntas y validado el plan:

```
Adelante con el plan. Reglas de ejecución:

- Un commit por cada punto del plan. Cada commit deja el repo en verde.
- Después de cada commit, para y dime qué has hecho en 3 líneas. No encadenes.
- Si una decisión no está en el spec, pregunta. No improvises arquitectura.
- No añadas dependencias en runtime más allá de @angular/*.

Empieza por el primer punto.
```

---

## Prompt 3 — La prueba de fuego de la Fase 1

Esto es lo importante y es lo que casi nadie hace. Cuando diga que ha terminado:

```
La Fase 1 no está terminada hasta que demuestres que los raíles funcionan.

Crea una rama `test/rails` y escribe código que viole DELIBERADAMENTE cada una de
las 11 reglas ESLint de §7 del spec, una por una. Para cada regla:

1. Enséñame el código que la viola
2. Enséñame la salida exacta de CI bloqueándolo
3. Confirma que el mensaje de error explica cómo arreglarlo

Después, demuestra que un PR limpio pasa CI en verde.

Si alguna regla no bloquea, o bloquea con un mensaje incomprensible, arréglala.
Ese es el entregable real de la Fase 1: no el esqueleto, sino la prueba de que
el esqueleto no se puede saltar.
```

---

## Cosas que probablemente te va a preguntar (ten la respuesta lista)

| Pregunta | Respuesta sugerida |
|---|---|
| ¿Scope npm definitivo? | `@aegisui` |
| ¿Prefijo de selectores y tokens? | `aegis-` (`<aegis-button>`, `--aegis-btn-bg`) |
| ¿Versión exacta de Angular? | `22.0.6` exacto (sin `^`/`~`); "20+" del spec era un suelo, no un objetivo |
| ¿Storybook en `apps/docs` o paquete aparte? | En `apps/docs` |
| ¿Registro de publicación? | npm público para el core |
| ¿Playwright con qué navegadores? | Chromium para snapshots; Firefox solo para el pase manual de a11y |
| ¿Umbral de cobertura? | 90% en `ui` y `cdk`, sin mínimo en `apps/**` |

---

## Los tres errores que van a hundir esto

1. **Dejar que se salte la Fase 1 "para llegar antes a los componentes".**
   Si los raíles no están, no puedes confiar en nada de lo que genere después.
   Todo el modelo de negocio depende de eso.

2. **Aceptar el primer componente sin revisar el CSS a mano.** Los agentes meten
   valores literales de color por costumbre. Si la primera regla que se relaja es
   la de los tokens, el dark mode y el theming configurable dejan de existir.

3. **Tratar la accesibilidad como un test más.** Axe en verde no es accesible.
   Antes del primer release, tú, con teclado y lector de pantalla, o no sale.
