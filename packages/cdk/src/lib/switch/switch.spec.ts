import { describe, expect, it } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AegisSwitch } from './switch';

@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisSwitch],
  template: `<button
    aegisSwitch
    #brain="aegisSwitch"
    [(checked)]="checked"
    [disabled]="disabled()"
  ></button>`,
})
class HostComponent {
  readonly checked = signal(false);
  readonly disabled = signal(false);
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = () => view.detectChanges();
  const button = () => screen.getByRole('switch') as HTMLButtonElement;
  return { view, host, flush, button };
}

describe('AegisSwitch (cdk brain)', () => {
  it('aplica role="switch" y type="button" sobre el <button> nativo', async () => {
    const { button } = await setup();
    expect(button().getAttribute('role')).toBe('switch');
    expect(button().type).toBe('button');
  });

  it('aria-checked está SIEMPRE presente con valor explícito (lo exige role=switch)', async () => {
    const { host, flush, button } = await setup();
    expect(button().getAttribute('aria-checked')).toBe('false');

    host.checked.set(true);
    flush();
    expect(button().getAttribute('aria-checked')).toBe('true');
  });

  it('el click alterna checked (two-way)', async () => {
    const { host, flush, button } = await setup();
    await userEvent.click(button());
    flush();
    expect(host.checked()).toBe(true);

    await userEvent.click(button());
    flush();
    expect(host.checked()).toBe(false);
  });

  it('genera un id propio si el consumidor no aporta uno', async () => {
    const { button } = await setup();
    expect(button().id).toMatch(/^aegis-switch-\d+$/);
  });

  it('disabled aplica el atributo NATIVO, no aria-disabled', async () => {
    const { host, flush, button } = await setup();
    host.disabled.set(true);
    flush();
    expect(button().disabled).toBe(true);
    expect(button().hasAttribute('aria-disabled')).toBe(false);
  });

  it('con disabled, toggle() no cambia el estado ni siquiera llamado a mano', async () => {
    const { view, host, flush } = await setup();
    host.disabled.set(true);
    flush();

    // La guarda del brain, no solo la del navegador: `toggle()` es público.
    view.fixture.debugElement.children[0].injector.get(AegisSwitch).toggle();
    flush();
    expect(host.checked()).toBe(false);
  });

  it('NO intercepta keydown: Enter y Space llegan por el click nativo del <button>', async () => {
    const { host, flush, button } = await setup();
    button().focus();

    await userEvent.keyboard(' ');
    flush();
    expect(host.checked()).toBe(true);

    await userEvent.keyboard('{Enter}');
    flush();
    expect(host.checked()).toBe(false);
  });

  it('focus() enfoca el <button> real', async () => {
    const { view, flush, button } = await setup();
    flush();
    view.fixture.debugElement.children[0].injector.get(AegisSwitch).focus();
    expect(document.activeElement).toBe(button());
  });
});
