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

describe('AegisInput — passthrough al control interno (controlAttrs)', () => {
  @Component({
    selector: 'host-attrs',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AegisInput],
    template: `<input
      aegisInput
      [invalid]="invalid()"
      [errorId]="errorId()"
      [controlAttrs]="attrs()"
      data-testid="campo"
    />`,
  })
  class AttrsHost {
    readonly attrs = signal<Record<string, string | null> | undefined>(undefined);
    readonly invalid = signal(false);
    readonly errorId = signal<string | undefined>(undefined);
  }

  const montar = async () => {
    const view = await render(AttrsHost);
    const host = view.fixture.componentInstance;
    const flush = async () => {
      view.detectChanges();
      for (let i = 0; i < 3; i++) await Promise.resolve();
      view.detectChanges();
    };
    await flush();
    return { host, flush, campo: screen.getByTestId('campo') };
  };

  it('aplica los atributos al <input>', async () => {
    const { host, flush, campo } = await montar();
    host.attrs.set({ role: 'combobox', 'aria-expanded': 'true' });
    await flush();

    expect(campo.getAttribute('role')).toBe('combobox');
    expect(campo.getAttribute('aria-expanded')).toBe('true');
  });

  it('null RETIRA el atributo (no lo deja en "")', async () => {
    const { host, flush, campo } = await montar();
    host.attrs.set({ 'aria-activedescendant': 'opt-1' });
    await flush();
    expect(campo.getAttribute('aria-activedescendant')).toBe('opt-1');

    host.attrs.set({ 'aria-activedescendant': null });
    await flush();
    expect(campo.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('retira los atributos que desaparecen del mapa', async () => {
    const { host, flush, campo } = await montar();
    host.attrs.set({ role: 'combobox', 'aria-expanded': 'true' });
    await flush();

    host.attrs.set({ role: 'combobox' });
    await flush();
    expect(campo.hasAttribute('aria-expanded')).toBe(false);
    expect(campo.getAttribute('role')).toBe('combobox');
  });

  it('reaplica en caliente sin zone.js: 50 cambios seguidos se reflejan los 50', async () => {
    const { host, flush, campo } = await montar();
    for (let i = 0; i < 50; i++) {
      host.attrs.set({ 'aria-activedescendant': `opt-${i}` });
      await flush();
      expect(campo.getAttribute('aria-activedescendant')).toBe(`opt-${i}`);
    }
  });

  // RAÍL DEL CONJUNTO PROTEGIDO. Si alguien "abre" el conjunto en el futuro,
  // estos casos se ponen rojos: la protección estructural tiene su regresión.
  const PROTEGIDOS = [
    'id',
    'disabled',
    'readonly',
    'required',
    'aria-required',
    'aria-invalid',
    'aria-describedby',
  ];

  for (const protegido of PROTEGIDOS) {
    it(`lanza en dev al intentar escribir "${protegido}", y el valor del Input gana`, async () => {
      const { host, flush } = await montar();
      host.attrs.set({ [protegido]: 'pisado' });

      await expect(flush()).rejects.toThrow(
        new RegExp(`controlAttrs no puede escribir "${protegido}"`),
      );
    });
  }

  it('el ARIA de combobox y el propio del Input COEXISTEN en el mismo <input>', async () => {
    const { host, flush, campo } = await montar();
    host.invalid.set(true);
    host.errorId.set('err-1');
    host.attrs.set({
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-activedescendant': 'opt-3',
      'aria-autocomplete': 'list',
    });
    await flush();

    // Del envoltorio
    expect(campo.getAttribute('role')).toBe('combobox');
    expect(campo.getAttribute('aria-expanded')).toBe('true');
    expect(campo.getAttribute('aria-activedescendant')).toBe('opt-3');
    // Del Input, intactos
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(campo.getAttribute('aria-describedby')).toBe('err-1');
  });

  it('sin controlAttrs, el Input se comporta igual que antes', async () => {
    const { campo } = await montar();
    expect(campo.hasAttribute('role')).toBe(false);
    expect(campo.hasAttribute('aria-expanded')).toBe(false);
  });
});
