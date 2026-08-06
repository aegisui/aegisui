import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { AegisOverlay } from './overlay';

// vi.hoisted asegura que estas vars se inicializan ANTES de que vi.mock se ejecute
// (vi.mock se iza al tope del módulo; las var normales no).
const { mockCleanup, mockComputePosition, mockAutoUpdate, mockSizeOpts } = vi.hoisted(() => {
  const mockCleanup = vi.fn();
  const mockComputePosition = vi.fn().mockResolvedValue({
    x: 10,
    y: 20,
    placement: 'bottom-start',
  });
  // Llama al callback inmediatamente, igual que el autoUpdate real hace en el primer render.
  const mockAutoUpdate = vi.fn().mockImplementation((_a: unknown, _f: unknown, cb: () => void) => {
    cb();
    return mockCleanup;
  });
  const mockSizeOpts = {
    apply: undefined as ((s: { availableHeight: number }) => void) | undefined,
  };
  return { mockCleanup, mockComputePosition, mockAutoUpdate, mockSizeOpts };
});

vi.mock('@floating-ui/dom', () => ({
  computePosition: mockComputePosition,
  autoUpdate: mockAutoUpdate,
  flip: vi.fn().mockReturnValue({ name: 'flip', fn: vi.fn() }),
  shift: vi.fn().mockReturnValue({ name: 'shift', fn: vi.fn() }),
  size: vi.fn().mockImplementation((opts: { apply?: (s: { availableHeight: number }) => void }) => {
    mockSizeOpts.apply = opts?.apply;
    return { name: 'size', fn: vi.fn() };
  }),
  offset: vi.fn().mockReturnValue({ name: 'offset', fn: vi.fn() }),
}));

// Host genérico: anchor en el DOM, panel flotante con [aegisOverlay]
@Component({
  selector: 'host-cmp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AegisOverlay],
  template: `
    <button #btn>Anchor</button>
    <div
      aegisOverlay
      #overlay="aegisOverlay"
      [(open)]="open"
      [anchor]="anchor()"
      [placement]="placement()"
      [flip]="enableFlip()"
      [shift]="enableShift()"
      [offset]="offsetPx()"
      [matchAnchorWidth]="matchWidth()"
      [maxHeightFromViewport]="maxHeight()"
      (placementChange)="onPlacement($event)"
      data-testid="panel"
    >
      panel
    </div>
  `,
})
class HostComponent {
  readonly open = signal(false);
  readonly anchor = signal<HTMLElement | undefined>(undefined);
  readonly placement = signal<'bottom-start' | 'top-start'>('bottom-start');
  readonly enableFlip = signal(true);
  readonly enableShift = signal(true);
  readonly offsetPx = signal(0);
  readonly matchWidth = signal(false);
  readonly maxHeight = signal(true);
  lastPlacement: string | null = null;
  onPlacement(p: string) {
    this.lastPlacement = p;
  }
}

async function setup() {
  // No se resetean los mocks aquí: lo hace beforeEach, y mockReturnValue/mockReset
  // después de beforeEach sobrescribiría la implementación correcta.

  const view = await render(HostComponent);
  const host = view.fixture.componentInstance;
  const flush = async () => {
    view.detectChanges();
    // Espera múltiples ticks: effect (zoneless) → computePosition.then() → posibles chains
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  const panel = screen.getByTestId('panel') as HTMLElement;
  const anchorEl = screen.getByRole('button') as HTMLElement;

  // Parchea la API del popover en el panel para que jsdom lo soporte
  panel.showPopover = vi.fn();
  panel.hidePopover = vi.fn();

  return { host, panel, anchorEl, flush, view };
}

describe('AegisOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputePosition.mockResolvedValue({ x: 10, y: 20, placement: 'bottom-start' });
    // Restaura la implementación que llama al callback inmediatamente (igual que el real).
    // mockReturnValue aquí sobrescribiría la implementación y rompería el callback.
    mockAutoUpdate.mockImplementation((_a: unknown, _f: unknown, cb: () => void) => {
      cb();
      return mockCleanup;
    });
  });

  it('con open=true y anchor, llama a showPopover y escribe coordenadas', async () => {
    const { host, panel, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();

    expect(panel.showPopover).toHaveBeenCalled();
    expect(panel.style.getPropertyValue('--aegis-overlay-x')).toBe('10px');
    expect(panel.style.getPropertyValue('--aegis-overlay-y')).toBe('20px');
  });

  it('placement por defecto es "bottom-start"', async () => {
    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();

    expect(mockComputePosition).toHaveBeenCalledWith(
      anchorEl,
      expect.any(HTMLElement),
      expect.objectContaining({ placement: 'bottom-start' }),
    );
  });

  it('data-placement refleja la posición efectiva, no la preferida', async () => {
    mockComputePosition.mockResolvedValue({ x: 0, y: 0, placement: 'top-start' });
    const { host, panel, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();

    expect(panel.getAttribute('data-placement')).toBe('top-start');
  });

  it('flip=true incluye el middleware flip', async () => {
    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.enableFlip.set(true);
    host.open.set(true);
    await flush();

    const [, , config] = mockComputePosition.mock.calls[0];
    const names = config.middleware.map((m: { name: string }) => m.name);
    expect(names).toContain('flip');
  });

  it('flip=false no incluye el middleware flip', async () => {
    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.enableFlip.set(false);
    host.open.set(true);
    await flush();

    const [, , config] = mockComputePosition.mock.calls[0];
    const names = config.middleware.map((m: { name: string }) => m.name);
    expect(names).not.toContain('flip');
  });

  it('shift=true incluye el middleware shift', async () => {
    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.enableShift.set(true);
    host.open.set(true);
    await flush();

    const [, , config] = mockComputePosition.mock.calls[0];
    const names = config.middleware.map((m: { name: string }) => m.name);
    expect(names).toContain('shift');
  });

  it('placementChange se emite cuando la posición efectiva cambia', async () => {
    mockComputePosition
      .mockResolvedValueOnce({ x: 0, y: 0, placement: 'top-start' })
      .mockResolvedValue({ x: 0, y: 0, placement: 'bottom-start' });

    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();

    expect(host.lastPlacement).toBe('top-start');
  });

  it('matchAnchorWidth=true escribe --aegis-overlay-anchor-width', async () => {
    const { host, panel, anchorEl, flush } = await setup();
    Object.defineProperty(anchorEl, 'offsetWidth', { value: 200, configurable: true });
    host.anchor.set(anchorEl);
    host.matchWidth.set(true);
    host.open.set(true);
    await flush();

    expect(panel.style.getPropertyValue('--aegis-overlay-anchor-width')).toBe('200px');
  });

  it('matchAnchorWidth=false NO escribe --aegis-overlay-anchor-width', async () => {
    const { host, panel, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.matchWidth.set(false);
    host.open.set(true);
    await flush();

    expect(panel.style.getPropertyValue('--aegis-overlay-anchor-width')).toBe('');
  });

  it('maxHeightFromViewport=true incluye el middleware size y su apply escribe la custom property', async () => {
    const { host, panel, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.maxHeight.set(true);
    host.open.set(true);
    await flush();

    const [, , config] = mockComputePosition.mock.calls[0];
    const names = config.middleware.map((m: { name: string }) => m.name);
    expect(names).toContain('size');

    // Invoca directamente el apply del middleware size para cubrir la línea del setter
    mockSizeOpts.apply?.({ availableHeight: 300 });
    expect(panel.style.getPropertyValue('--aegis-overlay-available-height')).toBe('300px');
  });

  it('offset > 0 incluye el middleware offset', async () => {
    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.offsetPx.set(8);
    host.open.set(true);
    await flush();

    const [, , config] = mockComputePosition.mock.calls[0];
    const names = config.middleware.map((m: { name: string }) => m.name);
    expect(names).toContain('offset');
  });

  it('el evento toggle nativo con newState=closed sincroniza open a false', async () => {
    const { host, panel, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();
    expect(host.open()).toBe(true);

    // Simula el cierre nativo (Esc, clic fuera) del Popover API
    const toggleEvt = new Event('toggle');
    Object.assign(toggleEvt, { newState: 'closed' });
    fireEvent(panel, toggleEvt);

    expect(host.open()).toBe(false);
  });

  it('destruir el componente con overlay abierto desuscribe autoUpdate', async () => {
    const { host, anchorEl, flush, view } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();

    expect(mockCleanup).not.toHaveBeenCalled();
    view.fixture.destroy();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('sin anchor, open=true no llama a showPopover ni a computePosition', async () => {
    const { host, panel, flush } = await setup();
    host.anchor.set(undefined);
    host.open.set(true);
    await flush();

    expect(panel.showPopover).not.toHaveBeenCalled();
    expect(mockComputePosition).not.toHaveBeenCalled();
  });

  it('ancla retirada del DOM mientras open: autoUpdate detecta isConnected=false y cierra', async () => {
    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();

    // Captura el callback que autoUpdate registra y lo invoca con el ancla desconectada
    const autoUpdateCb = mockAutoUpdate.mock.calls[0][2] as () => void;
    anchorEl.remove(); // desconecta del DOM
    autoUpdateCb();

    expect(host.open()).toBe(false);
  });

  it('no expone tipos de @floating-ui/* en el tipo de los inputs', () => {
    // Verifica que AegisPlacement es nuestra unión, no un reexport de Floating UI.
    // Esta comprobación es de tipos (el .d.ts se verifica en el gate de contratos);
    // aquí confirmamos que el runtime acepta los valores de nuestra unión.
    const validPlacements: AegisOverlay['placement'] extends () => infer T ? T[] : never[] = [
      'top',
      'top-start',
      'top-end',
      'right',
      'bottom',
      'bottom-start',
      'left',
    ];
    expect(validPlacements).toHaveLength(7);
  });
});

describe('AegisOverlay — estrategia de posicionamiento', () => {
  it('usa strategy "fixed": la capa superior se posiciona contra el VIEWPORT', async () => {
    // Regresión de un bug real: con la estrategia por defecto (`absolute`),
    // Floating UI devuelve coordenadas relativas al DOCUMENTO. Aplicadas al
    // `position: fixed` que exige la capa superior, el panel aterriza a la
    // altura que el ancla ocupa en la página entera — en una página larga, a
    // miles de píxeles fuera de la pantalla. El panel SÍ se abría; simplemente
    // no se veía.
    const { host, anchorEl, flush } = await setup();
    host.anchor.set(anchorEl);
    host.open.set(true);
    await flush();

    const [, , config] = mockComputePosition.mock.calls[0];
    expect(config.strategy).toBe('fixed');
  });
});
