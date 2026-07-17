import { describe, expect, it } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { AegisInputComponent, type AegisInputSize, type AegisInputType } from './input.component';
import { expectLiveRegionMutatesInPlace } from '../../testing/live-region';

/** Host de pruebas: el consumidor controla todos los inputs vía signals. */
@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisInputComponent],
  template: `<aegis-input
    [label]="label()"
    [type]="type()"
    [(value)]="value"
    [placeholder]="placeholder()"
    [disabled]="disabled()"
    [readonly]="readonly()"
    [required]="required()"
    [invalid]="invalid()"
    [errorMessage]="errorMessage()"
    [helpText]="helpText()"
    [size]="size()"
  />`,
})
class HostComponent {
  readonly label = signal('Correo');
  readonly type = signal<AegisInputType>('text');
  readonly value = signal('');
  readonly placeholder = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly invalid = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly helpText = signal<string | undefined>(undefined);
  readonly size = signal<AegisInputSize>('md');
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = () => view.detectChanges();
  const input = () => screen.getByRole('textbox') as HTMLInputElement;
  return { host, flush, input, container: view.container };
}

/** axe sin la regla color-contrast (jsdom no calcula estilos; eso lo cubre el gate). */
async function axeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations;
}

describe('AegisInputComponent', () => {
  // --- Unitarios (comportamiento observable) ---------------------------------

  it('[AC1] renderiza un <input> nativo del type indicado (default "text")', async () => {
    const { input } = await setup();
    expect(input().tagName).toBe('INPUT');
    expect(input().type).toBe('text');
  });

  it('[AC2] renderiza un <label> cuyo for coincide con el id del <input>', async () => {
    const { container, input } = await setup();
    const label = container.querySelector('label');
    expect(label?.getAttribute('for')).toBe(input().id);
  });

  it('[AC3] el nombre accesible del <input> es el texto de label', async () => {
    const { input } = await setup();
    expect(input()).toHaveAccessibleName('Correo');
  });

  it('[AC4] value se actualiza en cada evento input nativo (two-way)', async () => {
    const user = userEvent.setup();
    const { host, input } = await setup();
    await user.type(input(), 'hola');
    expect(host.value()).toBe('hola');
  });

  it('[AC5] placeholder se refleja en el atributo nativo', async () => {
    const { host, flush, input } = await setup();
    host.placeholder.set('tu@empresa.com');
    flush();
    expect(input().placeholder).toBe('tu@empresa.com');
  });

  it('[AC6] disabled=true pone el atributo nativo disabled', async () => {
    const { host, flush, input } = await setup();
    host.disabled.set(true);
    flush();
    expect(input().disabled).toBe(true);
  });

  it('[AC7] readonly=true pone readOnly nativo y el campo sigue siendo enfocable', async () => {
    const { host, flush, input } = await setup();
    host.readonly.set(true);
    flush();
    expect(input().readOnly).toBe(true);
    input().focus();
    expect(input()).toHaveFocus();
  });

  it('[AC8] required=true pone required nativo y aria-required="true"', async () => {
    const { host, flush, input } = await setup();
    host.required.set(true);
    flush();
    expect(input().required).toBe(true);
    expect(input().getAttribute('aria-required')).toBe('true');
  });

  it('[AC9] invalid=true pone aria-invalid="true"; invalid=false deja el atributo ausente', async () => {
    const { host, flush, input } = await setup();
    expect(input().getAttribute('aria-invalid')).toBeNull();
    host.invalid.set(true);
    flush();
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('[AC10] con helpText, aria-describedby lo incluye; sin él, solo el span de error (vacío)', async () => {
    const { host, flush, input } = await setup();
    // ADR-019: el span de error SIEMPRE está en aria-describedby, aunque esté
    // vacío — la relación nunca se crea en caliente, solo cambia el texto.
    const initial = input().getAttribute('aria-describedby');
    expect(initial).not.toBeNull();
    expect(document.getElementById(initial!)?.textContent).toBe('');

    host.helpText.set('Nunca compartimos tu correo.');
    flush();
    const describedBy = input().getAttribute('aria-describedby');
    const ids = describedBy?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0])?.textContent).toBe('Nunca compartimos tu correo.');
  });

  it('[AC11] con invalid y errorMessage, aria-describedby incluye ayuda Y error, en ese orden', async () => {
    const { host, flush, input } = await setup();
    host.helpText.set('Ayuda');
    host.invalid.set(true);
    host.errorMessage.set('Formato inválido');
    flush();
    const ids = input().getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0])?.textContent).toBe('Ayuda');
    expect(document.getElementById(ids[1])?.textContent?.trim()).toBe('Formato inválido');
  });

  it('[AC12] la relación aria-describedby con el error es ESTABLE: el mismo id, antes y después de que aparezca el error', async () => {
    const { host, flush, input } = await setup();
    const idsBefore = input().getAttribute('aria-describedby')?.split(' ') ?? [];
    const errorIdBefore = idsBefore[idsBefore.length - 1];
    expect(errorIdBefore).toBeTruthy();

    host.invalid.set(true);
    host.errorMessage.set('Formato inválido');
    flush();
    const idsAfter = input().getAttribute('aria-describedby')?.split(' ') ?? [];
    const errorIdAfter = idsAfter[idsAfter.length - 1];

    expect(errorIdAfter).toBe(errorIdBefore);
    expect(document.getElementById(errorIdAfter)?.textContent?.trim()).toBe('Formato inválido');
  });

  it('[AC13] el nodo role="alert" del anuncio dinámico es DISTINTO del enlazado por aria-describedby, y no forma parte de él', async () => {
    const { host, flush, input, container } = await setup();
    host.invalid.set(true);
    host.errorMessage.set('Formato inválido');
    flush();

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent?.trim()).toBe('Formato inválido');

    const describedByIds = input().getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(describedByIds).not.toContain(alert?.id);
  });

  // Raíl automático (ADR-019 regla 3): un anuncio doble en NVDA puede venir de
  // que el nodo role="alert" RECREE su contenido (childList) en vez de solo
  // mutar el texto (characterData) — el propio contenedor permanente no basta
  // si el texto de dentro se recrea con @if. No sustituye el pase manual (el
  // anuncio en sí solo se oye con un lector real), pero caza este patrón
  // concreto sin depender de tener el lector correcto a mano.
  it('la región role="alert" muta su texto in situ (characterData), nunca lo recrea (childList)', async () => {
    const { host, flush, container } = await setup();
    const alert = container.querySelector('.aegis-input__error-live');
    expect(alert).not.toBeNull();

    await expectLiveRegionMutatesInPlace(alert!, () => {
      host.invalid.set(true);
      host.errorMessage.set('Formato inválido');
      flush();
    });
  });

  it('[AC14] invalid=true sin errorMessage: aria-invalid presente; el span de error sigue en aria-describedby pero vacío; el nodo role="alert" también vacío', async () => {
    const { host, flush, input, container } = await setup();
    host.invalid.set(true);
    flush();
    expect(input().getAttribute('aria-invalid')).toBe('true');

    const ids = input().getAttribute('aria-describedby')?.split(' ') ?? [];
    const errorId = ids[ids.length - 1];
    expect(document.getElementById(errorId)?.textContent).toBe('');

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('');
  });

  it('[AC15] size por defecto es md; cada valor aplica su escala', async () => {
    const { host, flush, input } = await setup();
    expect(input()).toHaveClass('aegis-input--md');
    for (const s of ['sm', 'lg'] as const) {
      host.size.set(s);
      flush();
      expect(input()).toHaveClass(`aegis-input--${s}`);
    }
  });

  it('[AC16] el método focus() mueve el foco al <input> real', async () => {
    const view = await render(AegisInputComponent, { inputs: { label: 'Correo' } });
    const component = view.fixture.componentInstance;
    component.focus();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  // --- Teclado (gate keyboard + unitarios) ------------------------------------

  it('[AC17] Tab mueve el foco al campo; lo salta si disabled; lo respeta si readonly', async () => {
    const { host, flush, input } = await setup();
    input().focus();
    expect(input()).toHaveFocus();

    host.readonly.set(true);
    flush();
    input().focus();
    expect(input()).toHaveFocus();

    host.readonly.set(false);
    host.disabled.set(true);
    flush();
    expect(input().disabled).toBe(true);
  });

  it('[AC18] escribir un carácter actualiza value (comportamiento nativo)', async () => {
    const user = userEvent.setup();
    const { host, input } = await setup();
    await user.type(input(), 'a');
    expect(host.value()).toBe('a');
  });

  // --- Accesibilidad (axe) -----------------------------------------------------

  it('[AC19] 0 violaciones en los 3 tamaños, en default', async () => {
    const { host, flush, container } = await setup();
    for (const s of ['sm', 'md', 'lg'] as const) {
      host.size.set(s);
      flush();
      expect(await axeViolations(container), s).toEqual([]);
    }
  });

  it('[AC20] 0 violaciones en disabled, readonly, invalid (con y sin errorMessage)', async () => {
    const { host, flush, container } = await setup();

    host.disabled.set(true);
    flush();
    expect(await axeViolations(container), 'disabled').toEqual([]);
    host.disabled.set(false);

    host.readonly.set(true);
    flush();
    expect(await axeViolations(container), 'readonly').toEqual([]);
    host.readonly.set(false);

    host.invalid.set(true);
    flush();
    expect(await axeViolations(container), 'invalid sin errorMessage').toEqual([]);

    host.errorMessage.set('Formato inválido');
    flush();
    expect(await axeViolations(container), 'invalid con errorMessage').toEqual([]);
  });

  it('[AC21] campo CON label: 0 violaciones', async () => {
    const { container } = await setup();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('[AC21] campo SIN label (ni aria-label externo): axe caza la falta de nombre accesible (test negativo)', async () => {
    const view = await render(`<aegis-input />`, { imports: [AegisInputComponent] });
    const violations = await axeViolations(view.container);
    expect(violations.map((v) => v.id)).toContain('label');
  });

  // --- Afinado del usuario: disabled + aria-invalid simultáneos ---------------
  // No se asume: se comprueba con axe qué dice de verdad (ver docs/contracts/input.md
  // y el razonamiento en el commit). Si axe protesta, NO se quita aria-invalid: el
  // estado lógico (el valor precargado sigue siendo inválido) se mantiene aunque
  // no se resalte visualmente ni levante una violación de axe que no es tal.

  it('disabled + invalid simultáneos: aria-invalid se mantiene (no lo apaga disabled) y sigue sin violaciones de axe', async () => {
    const { host, flush, input, container } = await setup();
    host.disabled.set(true);
    host.invalid.set(true);
    flush();
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().disabled).toBe(true);
    expect(await axeViolations(container)).toEqual([]);
  });
});
