import { describe, expect, it, vi } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { AegisButton } from './button';

/**
 * Host que emula al `<aegis-button>` real: el consumidor escucha `(click)` en un
 * ANCESTRO del `<button>` nativo, así probamos que la supresión (que detiene la
 * propagación) impide que el click llegue al consumidor.
 */
@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisButton],
  template: `<div (click)="onClick()">
    <button aegisButton [disabled]="disabled()" [loading]="loading()">Go</button>
  </div>`,
})
class HostComponent {
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly onClick = vi.fn();
}

async function setup() {
  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const button = screen.getByRole('button') as HTMLButtonElement;
  const flush = () => view.detectChanges();
  return { host, button, flush };
}

describe('AegisButton (cdk brain)', () => {
  it('por defecto: activable, sin disabled ni aria-busy; el click llega al consumidor', async () => {
    const { host, button } = await setup();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(button);
    expect(host.onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled: aplica el `disabled` nativo y ningún click escapa', async () => {
    const { host, button, flush } = await setup();
    host.disabled.set(true);
    flush();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBeNull();
    fireEvent.click(button);
    expect(host.onClick).not.toHaveBeenCalled();
  });

  it('loading: aria-busy + aria-disabled, SIN disabled nativo (sigue enfocable), y sin click', async () => {
    const { host, button, flush } = await setup();
    host.loading.set(true);
    flush();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(host.onClick).not.toHaveBeenCalled();
  });

  it('disabled + loading: gana disabled (nativo, sin aria-busy)', async () => {
    const { host, button, flush } = await setup();
    host.disabled.set(true);
    host.loading.set(true);
    flush();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.getAttribute('aria-disabled')).toBeNull();
  });

  it('al salir de loading vuelve a ser activable (revierte estado)', async () => {
    const { host, button, flush } = await setup();
    host.loading.set(true);
    flush();
    fireEvent.click(button);
    expect(host.onClick).not.toHaveBeenCalled();

    host.loading.set(false);
    flush();
    expect(button.getAttribute('aria-busy')).toBeNull();
    fireEvent.click(button);
    expect(host.onClick).toHaveBeenCalledTimes(1);
  });

  it('declara data-handles="Enter Space" para el gate keyboard', async () => {
    const { button } = await setup();
    expect(button.getAttribute('data-handles')).toBe('Enter Space');
  });
});
