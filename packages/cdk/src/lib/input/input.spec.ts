import { describe, expect, it } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { AegisInput } from './input';

@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisInput],
  template: `<input
    aegisInput
    #brain="aegisInput"
    [disabled]="disabled()"
    [readonly]="readonly()"
    [required]="required()"
    [invalid]="invalid()"
    [helpId]="helpId()"
    [errorId]="errorId()"
  />`,
})
class HostComponent {
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly invalid = signal(false);
  readonly helpId = signal<string | undefined>(undefined);
  readonly errorId = signal<string | undefined>(undefined);
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const input = () => screen.getByRole('textbox') as HTMLInputElement;
  const flush = () => view.detectChanges();
  return { host, input, flush };
}

describe('AegisInput (cdk brain)', () => {
  it('genera un id propio si no se aporta ninguno', async () => {
    const { input } = await setup();
    expect(input().id).toMatch(/^aegis-input-\d+$/);
  });

  it('sin invalid: aria-invalid ausente (no "false")', async () => {
    const { input } = await setup();
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('invalid=true: aria-invalid="true"', async () => {
    const { host, input, flush } = await setup();
    host.invalid.set(true);
    flush();
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('required=true: required nativo + aria-required="true"', async () => {
    const { host, input, flush } = await setup();
    host.required.set(true);
    flush();
    expect(input().required).toBe(true);
    expect(input().getAttribute('aria-required')).toBe('true');
  });

  it('sin required: aria-required ausente', async () => {
    const { input } = await setup();
    expect(input().getAttribute('aria-required')).toBeNull();
  });

  it('disabled=true: disabled nativo', async () => {
    const { host, input, flush } = await setup();
    host.disabled.set(true);
    flush();
    expect(input().disabled).toBe(true);
  });

  it('readonly=true: readOnly nativo, sigue enfocable', async () => {
    const { host, input, flush } = await setup();
    host.readonly.set(true);
    flush();
    expect(input().readOnly).toBe(true);
    input().focus();
    expect(input()).toHaveFocus();
  });

  it('sin helpId ni errorId: aria-describedby ausente', async () => {
    const { input } = await setup();
    expect(input().getAttribute('aria-describedby')).toBeNull();
  });

  it('con helpId: aria-describedby lo incluye', async () => {
    const { host, input, flush } = await setup();
    host.helpId.set('help-1');
    flush();
    expect(input().getAttribute('aria-describedby')).toBe('help-1');
  });

  it('con helpId y errorId: aria-describedby incluye ambos, en orden ayuda -> error', async () => {
    const { host, input, flush } = await setup();
    host.helpId.set('help-1');
    host.errorId.set('error-1');
    flush();
    expect(input().getAttribute('aria-describedby')).toBe('help-1 error-1');
  });

  it('focus() enfoca el input real', async () => {
    const view = await render(HostComponent);
    const brainRef = view.fixture.debugElement.children[0].references['brain'] as AegisInput;
    brainRef.focus();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});
