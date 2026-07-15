import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { contrastRatio, hexToHsl, hslToHex, type Hsl } from './color';

type Theme = 'light' | 'dark';

/** Peldaños de la rampa jade (capa 1). Los lee de los tokens ya cargados. */
const JADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

interface Preset {
  readonly label: string;
  readonly hue: number;
}

/**
 * Demo viva del theming (Fase 2, DoD). Dos cosas, y las dos de verdad:
 *
 *  1. Toggle claro/oscuro — conmuta `[data-theme]` en :root; el dark vive en la
 *     capa 2 de los tokens, no aquí.
 *  2. Un control que cambia un PRIMITIVO en caliente — rota el tono de la rampa
 *     `--aegis-jade-*` y toda la app repinta (acento, enlaces, foco, chips), en
 *     claro Y en oscuro, porque la capa 2 referencia esos primitivos.
 *
 * La rampa base se LEE de los tokens cargados (getComputedStyle), no se copia:
 * una sola fuente de verdad. El medidor de contraste usa la misma fórmula WCAG
 * que el gate `contrast` y avisa cuando un tono rompería 4.5:1 — que es,
 * exactamente, por qué el gate existe.
 */
@Component({
  selector: 'aegis-sandbox-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.component.css',
  template: `
    <header class="topbar">
      <div class="brand">
        <span class="mark" aria-hidden="true"></span>
        <div>
          <h1>Aegis UI</h1>
          <p class="tagline">Theming por tokens · claro y oscuro de primera clase</p>
        </div>
      </div>
      <div class="theme-switch" role="group" aria-label="Tema">
        <button
          type="button"
          [class.on]="theme() === 'light'"
          [attr.aria-pressed]="theme() === 'light'"
          (click)="setTheme('light')"
        >
          Claro
        </button>
        <button
          type="button"
          [class.on]="theme() === 'dark'"
          [attr.aria-pressed]="theme() === 'dark'"
          (click)="setTheme('dark')"
        >
          Oscuro
        </button>
      </div>
    </header>

    <main>
      <section class="panel" aria-labelledby="ctl-title">
        <h2 id="ctl-title">Cambia un primitivo en caliente</h2>
        <p class="muted">
          Mueve el tono del <strong>jade</strong> (capa 1). Toda la app repinta desde la capa 2 — en
          el tema activo y en el otro.
        </p>

        <div class="control">
          <label for="hue">Tono del acento</label>
          <input
            id="hue"
            type="range"
            min="0"
            max="360"
            step="1"
            [value]="accentHue()"
            (input)="onHue($event)"
          />
          <output for="hue" aria-live="off">{{ accentHue() }}°</output>
          @if (accentContrast(); as c) {
            <span
              class="meter"
              [class.fail]="!c.aa"
              role="status"
              [attr.aria-label]="
                'Contraste on-accent ' +
                c.ratio.toFixed(2) +
                ' a 1, ' +
                (c.aa ? 'cumple AA' : 'no cumple AA')
              "
            >
              on-accent {{ c.ratio.toFixed(2) }}:1 · {{ c.aa ? 'AA ✓' : 'bajo 4.5:1' }}
            </span>
          }
        </div>

        <div class="presets">
          @for (p of presets; track p.hue) {
            <button type="button" (click)="setHue(p.hue)">{{ p.label }}</button>
          }
        </div>
      </section>

      <section class="showcase" aria-label="Muestra de componentes">
        <div class="row">
          <button type="button" class="btn primary">Acción primaria</button>
          <button type="button" class="btn secondary">Secundaria</button>
          <button type="button" class="btn ghost">Ghost</button>
          <a class="link" href="#" (click)="$event.preventDefault()">Un enlace de acento</a>
        </div>

        <div class="chips">
          @for (s of states; track s) {
            <span class="chip" [attr.data-state]="s">
              <span class="dot" aria-hidden="true"></span>
              {{ s }}
            </span>
          }
        </div>

        <article class="card">
          <h3>Superficie elevada</h3>
          <p class="muted">
            Texto secundario sobre <code>surface-raised</code>. Los bordes, el texto y la sombra
            salen todos de la capa 2; ninguna cadena <code>dark</code> vive aquí.
          </p>
          <a class="link" href="#" (click)="$event.preventDefault()">Seguir leyendo</a>
        </article>
      </section>
    </main>
  `,
})
export class AppComponent {
  private readonly doc = inject(DOCUMENT);
  private readonly root = this.doc.documentElement;

  protected readonly theme = signal<Theme>('light');
  protected readonly accentHue = signal(165);

  /** Rampa jade base leída de los tokens cargados: { stop -> HSL }. */
  private readonly baseRamp = signal<Record<number, Hsl> | null>(null);

  protected readonly states = ['success', 'warning', 'danger', 'info'] as const;
  protected readonly presets: readonly Preset[] = [
    { label: 'Jade', hue: 165 },
    { label: 'Cobalto', hue: 220 },
    { label: 'Magenta', hue: 320 },
    { label: 'Ámbar', hue: 45 },
  ];

  /** Par on-accent del tema activo, recalculado desde la rampa desplazada. */
  protected readonly accentContrast = computed<{ ratio: number; aa: boolean } | null>(() => {
    const base = this.baseRamp();
    if (!base) {
      return null;
    }
    const hue = this.accentHue();
    const solidStop = this.theme() === 'light' ? 600 : 400;
    const solid = hslToHex(hue, base[solidStop].s, base[solidStop].l);
    const onSolid = this.theme() === 'light' ? '#ffffff' : hslToHex(hue, base[950].s, base[950].l);
    const ratio = contrastRatio(onSolid, solid);
    return { ratio, aa: ratio >= 4.5 };
  });

  constructor() {
    // El tema conmuta [data-theme] en :root; la capa 2 hace el resto (§5.2).
    effect(() => {
      this.root.setAttribute('data-theme', this.theme());
    });

    // Cambiar el primitivo: reescribe la rampa jade en :root -> repinta todo.
    effect(() => {
      const base = this.baseRamp();
      if (!base) {
        return;
      }
      const hue = this.accentHue();
      for (const stop of JADE_STOPS) {
        const { s, l } = base[stop];
        this.root.style.setProperty(`--aegis-jade-${stop}`, hslToHex(hue, s, l));
      }
    });

    // Solo en navegador: lee la rampa jade real de los tokens ya aplicados.
    afterNextRender(() => {
      const styles = getComputedStyle(this.root);
      const ramp: Record<number, Hsl> = {};
      for (const stop of JADE_STOPS) {
        const value = styles.getPropertyValue(`--aegis-jade-${stop}`).trim();
        if (/^#[0-9a-f]{6}$/i.test(value)) {
          ramp[stop] = hexToHsl(value);
        }
      }
      if (Object.keys(ramp).length === JADE_STOPS.length) {
        this.baseRamp.set(ramp);
        this.accentHue.set(Math.round(ramp[600].h));
      }
    });
  }

  protected setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  protected setHue(hue: number): void {
    this.accentHue.set(hue);
  }

  protected onHue(event: Event): void {
    this.accentHue.set(Number((event.target as HTMLInputElement).value));
  }
}
