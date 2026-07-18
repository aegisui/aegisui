import { describe, expect, it, vi } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {
  AegisButtonComponent,
  type AegisButtonSize,
  type AegisButtonVariant,
} from './button.component';

/** Host de pruebas: el consumidor escucha `(click)` en el `<aegis-button>`. */
@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisButtonComponent],
  template: `<aegis-button
    [variant]="variant()"
    [size]="size()"
    [disabled]="disabled()"
    [loading]="loading()"
    [type]="type()"
    (click)="onClick()"
    >{{ label() }}</aegis-button
  >`,
})
class HostComponent {
  readonly variant = signal<AegisButtonVariant>('primary');
  readonly size = signal<AegisButtonSize>('md');
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly type = signal<'button' | 'submit' | 'reset'>('button');
  readonly label = signal('Guardar');
  readonly onClick = vi.fn();
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = () => view.detectChanges();
  const button = () => screen.getByRole('button') as HTMLButtonElement;
  return { host, flush, button, container: view.container };
}

/** axe sin la regla color-contrast (jsdom no calcula estilos; eso lo cubre el gate). */
async function axeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations;
}

describe('AegisButtonComponent', () => {
  // --- Unitarios (comportamiento observable) ---------------------------------

  it('[AC1] renderiza un <button> nativo con el texto proyectado como nombre accesible', async () => {
    const { button } = await setup();
    expect(button().tagName).toBe('BUTTON');
    expect(button()).toHaveAccessibleName('Guardar');
  });

  it('[AC2] variant por defecto es primary; cada valor aplica su clase', async () => {
    const { host, flush, button } = await setup();
    expect(button()).toHaveClass('aegis-btn--primary');
    for (const v of ['secondary', 'ghost', 'danger'] as const) {
      host.variant.set(v);
      flush();
      expect(button()).toHaveClass(`aegis-btn--${v}`);
    }
  });

  it('[AC3] size por defecto es md; cada valor aplica su escala', async () => {
    const { host, flush, button } = await setup();
    expect(button()).toHaveClass('aegis-btn--md');
    for (const s of ['sm', 'lg'] as const) {
      host.size.set(s);
      flush();
      expect(button()).toHaveClass(`aegis-btn--${s}`);
    }
  });

  it('[AC4] type por defecto es button; se refleja en el atributo nativo', async () => {
    const { host, flush, button } = await setup();
    expect(button().getAttribute('type')).toBe('button');
    host.type.set('submit');
    flush();
    expect(button().getAttribute('type')).toBe('submit');
  });

  it('[AC5] disabled=true pone el atributo nativo disabled y no emite click', async () => {
    const { host, flush, button } = await setup();
    host.disabled.set(true);
    flush();
    expect(button().disabled).toBe(true);
    button().click();
    expect(host.onClick).not.toHaveBeenCalled();
  });

  it('[AC6] loading=true pone aria-busy/aria-disabled, muestra el spinner y no emite click', async () => {
    const { host, flush, button, container } = await setup();
    host.loading.set(true);
    flush();
    expect(button().getAttribute('aria-busy')).toBe('true');
    expect(button().getAttribute('aria-disabled')).toBe('true');
    expect(container.querySelector('.aegis-btn__spinner')).not.toBeNull();
    button().click();
    expect(host.onClick).not.toHaveBeenCalled();
  });

  it('[AC7] loading=true mantiene el botón enfocable (no usa disabled nativo)', async () => {
    const { host, flush, button } = await setup();
    host.loading.set(true);
    flush();
    expect(button().disabled).toBe(false);
    button().focus();
    expect(button()).toHaveFocus();
  });

  it('[AC8] con disabled y loading, gana disabled (sin spinner)', async () => {
    const { host, flush, button, container } = await setup();
    host.disabled.set(true);
    host.loading.set(true);
    flush();
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-busy')).toBeNull();
    expect(container.querySelector('.aegis-btn__spinner')).toBeNull();
  });

  it('[AC9] un click válido (estado normal) emite el evento al consumidor', async () => {
    const { host, button } = await setup();
    button().click();
    expect(host.onClick).toHaveBeenCalledTimes(1);
  });

  // --- Teclado (user-event replica la semántica nativa) ----------------------

  it('[AC10] Enter activa (emite click) en estado normal', async () => {
    const user = userEvent.setup();
    const { host, button } = await setup();
    button().focus();
    await user.keyboard('{Enter}');
    expect(host.onClick).toHaveBeenCalledTimes(1);
  });

  it('[AC11] Space activa (emite click) al soltar', async () => {
    const user = userEvent.setup();
    const { host, button } = await setup();
    button().focus();
    await user.keyboard('[Space]');
    expect(host.onClick).toHaveBeenCalledTimes(1);
  });

  it('[AC12] Enter/Space no activan en disabled ni en loading', async () => {
    const user = userEvent.setup();
    const { host, flush, button } = await setup();

    host.loading.set(true);
    flush();
    button().focus();
    await user.keyboard('{Enter}');
    await user.keyboard('[Space]');
    expect(host.onClick).not.toHaveBeenCalled();

    host.loading.set(false);
    host.disabled.set(true);
    flush();
    await user.keyboard('{Enter}');
    await user.keyboard('[Space]');
    expect(host.onClick).not.toHaveBeenCalled();
  });

  // --- Accesibilidad (axe: estructura/rol/nombre; el contraste lo cubre su gate) ---

  it('[AC13/AC14] 0 violaciones de axe en las 4 variantes y en cada estado', async () => {
    const { host, flush, container } = await setup();
    for (const v of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      host.variant.set(v);
      for (const state of ['default', 'disabled', 'loading'] as const) {
        host.disabled.set(state === 'disabled');
        host.loading.set(state === 'loading');
        flush();
        expect(await axeViolations(container), `${v} · ${state}`).toEqual([]);
      }
    }
  });

  it('[AC15] icono-solo CON aria-label: nombre accesible y 0 violaciones', async () => {
    const withLabel = await render(`<aegis-button aria-label="Cerrar"></aegis-button>`, {
      imports: [AegisButtonComponent],
    });
    expect(screen.getByRole('button')).toHaveAccessibleName('Cerrar');
    expect(await axeViolations(withLabel.container)).toEqual([]);
  });

  it('[AC15] icono-solo SIN aria-label: axe caza la falta de nombre (test negativo)', async () => {
    const noLabel = await render(`<aegis-button></aegis-button>`, {
      imports: [AegisButtonComponent],
    });
    const violations = await axeViolations(noLabel.container);
    expect(violations.map((v) => v.id)).toContain('button-name');
  });

  // --- Nombre accesible: reenvío del aria-label al botón interno --------------
  // (AC20 «:focus-visible sin outline:none huérfano» lo cubren la regla
  //  no-outline-none en lint y el gate visual sobre HTML renderizado, Task #6.)

  it('el aria-label del wrapper se reenvía al <button> y no queda huérfano', async () => {
    const view = await render(`<aegis-button aria-label="Cerrar">×</aegis-button>`, {
      imports: [AegisButtonComponent],
    });
    const hostEl = view.container.querySelector('aegis-button');
    expect(hostEl?.getAttribute('aria-label')).toBeNull();
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Cerrar');
  });

  // --- Estado de carga: aria-live="polite" en el <span> hermano; SIN
  //     aria-describedby en el botón (ADR-019, Regla 2: notificación transitoria).
  //     El ANUNCIO real se valida a mano con lector; aquí solo la estructura. ---

  it('anuncia la carga con un <span> aria-live="polite" hermano, SIN aria-describedby en el botón', async () => {
    const { host, flush, button, container } = await setup();
    const sr = container.querySelector('.aegis-btn__sr');
    expect(sr).not.toBeNull();
    expect(sr?.getAttribute('aria-live')).toBe('polite');
    expect(sr?.getAttribute('role')).toBeNull();
    // El botón NO tiene aria-describedby: aria-live es el único canal (ADR-019 Regla 2).
    expect(button().getAttribute('aria-describedby')).toBeNull();
    expect(sr?.textContent?.trim()).toBe('');

    host.loading.set(true);
    flush();
    expect(sr?.textContent?.trim()).toBe('Cargando…');
  });

  // Regresión (ADR-019 Regla 4): @if recrea el nodo de texto (childList) y una
  // región aria-live que recrea su nodo dispara el anuncio dos veces en NVDA.
  // Interpolación plana garantiza solo mutaciones characterData.
  it('el texto de carga muta in situ (characterData), nunca recrea el nodo (childList)', async () => {
    const { host, flush, container } = await setup();
    const sr = container.querySelector('.aegis-btn__sr')!;

    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((list) => mutations.push(...list));
    observer.observe(sr, { childList: true, characterData: true, subtree: true });

    host.loading.set(true);
    flush();
    await Promise.resolve(); // MutationObserver callbacks son microtasks; drenar antes de desconectar
    observer.disconnect();

    expect(mutations.some((m) => m.type === 'childList')).toBe(false);
    expect(mutations.some((m) => m.type === 'characterData')).toBe(true);
  });

  // Regresión (hallazgo de pase manual, VoiceOver+Safari): un <span> de
  // descripción ANIDADO dentro de un control con nombre-por-contenido
  // (button/link) se computa como parte del nombre accesible, no como
  // descripción independiente. Sacarlo como HERMANO es lo que lo hace audible.
  it('el <span> de estado es HERMANO del <button>, no anidado dentro', async () => {
    const { button, container } = await setup();
    const sr = container.querySelector('.aegis-btn__sr');
    expect(sr).not.toBeNull();
    expect(button().contains(sr)).toBe(false);
  });
});
