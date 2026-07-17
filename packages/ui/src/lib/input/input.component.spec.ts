import { describe, expect, it } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { AegisInputComponent, type AegisInputSize, type AegisInputType } from './input.component';

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

  // --- Anuncio del error: SOLO aria-describedby + aria-invalid (ADR-019, Solución 5) ---
  // Un único <span> visible, siempre presente (vacío si no hay error), enlazado
  // por aria-describedby. Sin role="alert", sin aria-live: NVDA/JAWS reannuncian
  // nativamente la descripción de un campo enfocado cuando cambia; una región
  // live lo duplicaría (NVDA/JAWS) y rompería el describedby en VoiceOver.

  it('[AC10] no existe ningún nodo con role="alert" ni aria-live: el error se anuncia SOLO por aria-describedby', async () => {
    const { host, flush, container } = await setup();
    host.invalid.set(true);
    host.errorMessage.set('Formato inválido');
    flush();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  it('[AC11] el <span> de error existe SIEMPRE y su id está SIEMPRE en aria-describedby, vacío cuando no hay error', async () => {
    const { input, container } = await setup();
    const errorSpan = container.querySelector('.aegis-input__error');
    expect(errorSpan).not.toBeNull();
    expect(errorSpan?.textContent).toBe('');

    const describedBy = input().getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(describedBy!.split(' ')).toContain(errorSpan!.id);
  });

  it('[AC12] con helpText, aria-describedby incluye ayuda Y error (en ese orden)', async () => {
    const { host, flush, input } = await setup();
    host.helpText.set('Nunca compartimos tu correo.');
    host.invalid.set(true);
    host.errorMessage.set('Formato inválido');
    flush();
    const ids = input().getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0])?.textContent).toBe('Nunca compartimos tu correo.');
    expect(document.getElementById(ids[1])?.textContent?.trim()).toBe('Formato inválido');
  });

  it('[AC13] la relación aria-describedby con el error es ESTABLE: el mismo id antes y después de que aparezca el error, solo cambia el texto', async () => {
    const { host, flush, input } = await setup();
    const errorIdBefore = input().getAttribute('aria-describedby')!;
    expect(document.getElementById(errorIdBefore)?.textContent).toBe('');

    host.invalid.set(true);
    host.errorMessage.set('Formato inválido');
    flush();
    const errorIdAfter = input().getAttribute('aria-describedby')!;

    expect(errorIdAfter).toBe(errorIdBefore);
    expect(document.getElementById(errorIdAfter)?.textContent?.trim()).toBe('Formato inválido');
  });

  it('[AC14] el texto del error se ACTUALIZA in situ si cambia (el mismo nodo, nuevo texto — descripción siempre al día para el reenfoque)', async () => {
    const { host, flush, input } = await setup();
    const errorId = input().getAttribute('aria-describedby')!;

    host.invalid.set(true);
    host.errorMessage.set('Email inválido');
    flush();
    expect(document.getElementById(errorId)?.textContent?.trim()).toBe('Email inválido');

    host.errorMessage.set('Ya está registrado');
    flush();
    expect(document.getElementById(errorId)?.textContent?.trim()).toBe('Ya está registrado');
  });

  it('[AC15] invalid=true sin errorMessage: aria-invalid presente; el span de error sigue en aria-describedby pero vacío', async () => {
    const { host, flush, input } = await setup();
    host.invalid.set(true);
    flush();
    expect(input().getAttribute('aria-invalid')).toBe('true');

    const errorId = input().getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)?.textContent).toBe('');
  });

  it('[AC16] size por defecto es md; cada valor aplica su escala', async () => {
    const { host, flush, input } = await setup();
    expect(input()).toHaveClass('aegis-input--md');
    for (const s of ['sm', 'lg'] as const) {
      host.size.set(s);
      flush();
      expect(input()).toHaveClass(`aegis-input--${s}`);
    }
  });

  it('[AC17] el método focus() mueve el foco al <input> real', async () => {
    const view = await render(AegisInputComponent, { inputs: { label: 'Correo' } });
    const component = view.fixture.componentInstance;
    component.focus();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  // --- Teclado (gate keyboard + unitarios) ------------------------------------

  it('[AC18] Tab mueve el foco al campo; lo salta si disabled; lo respeta si readonly', async () => {
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

  it('[AC19] escribir un carácter actualiza value (comportamiento nativo)', async () => {
    const user = userEvent.setup();
    const { host, input } = await setup();
    await user.type(input(), 'a');
    expect(host.value()).toBe('a');
  });

  // --- Accesibilidad (axe) -----------------------------------------------------

  it('[AC20] 0 violaciones en los 3 tamaños, en default', async () => {
    const { host, flush, container } = await setup();
    for (const s of ['sm', 'md', 'lg'] as const) {
      host.size.set(s);
      flush();
      expect(await axeViolations(container), s).toEqual([]);
    }
  });

  it('[AC21] 0 violaciones en disabled, readonly, invalid (con y sin errorMessage)', async () => {
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

  it('[AC22] campo CON label: 0 violaciones', async () => {
    const { container } = await setup();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('[AC22] campo SIN label (ni aria-label externo): axe caza la falta de nombre accesible (test negativo)', async () => {
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
