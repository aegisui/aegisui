import { expect, test } from '@playwright/test';

/**
 * Lo que jsdom NO puede decirnos, y por eso vive aquí.
 *
 * Los unitarios de Select y Combobox mockean `showPopover`/`hidePopover` porque
 * jsdom no implementa la Popover API: `:popover-open` nunca casa y el panel
 * quedaría en `display: none`, con sus opciones fuera del árbol de
 * accesibilidad. Ese mock hace útiles los unitarios, pero **no prueba** que en un
 * navegador de verdad el panel se muestre.
 *
 * Este spec cierra justo ese hueco, en Chromium real:
 *  1. El panel se muestra de verdad (capa superior, no recortado).
 *  2. Las opciones ENTRAN en el árbol de accesibilidad (rol expuesto).
 *  3. `aria-activedescendant` apunta a un elemento que existe en el DOM.
 *  4. Lo anterior sigue siendo cierto con la lista FILTRADA en vivo — el caso
 *     que solo el Combobox tiene y que más depende del overlay.
 *
 * Cada test ABRE el panel que necesita en vez de partir de uno ya abierto:
 * `popover="auto"` hace los popovers mutuamente excluyentes (abrir uno cierra los
 * demás), así que dos paneles abiertos a la vez es imposible por diseño del
 * estándar. Este gate fue justo quien lo descubrió.
 */

test.describe('Popover real (Chromium) — lo que jsdom no cubre', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('el panel del Select abierto se muestra de verdad y expone sus opciones', async ({
    page,
  }) => {
    const select = page.getByTestId('select-cerrado');
    const panel = select.locator('.aegis-select__panel');

    await select.getByRole('combobox').click();
    await expect(panel).toBeVisible();

    // El navegador lo pone en la capa superior: no queda recortado ni a 0x0.
    const caja = await panel.boundingBox();
    expect(caja, 'el panel debe tener caja real').not.toBeNull();
    expect(caja!.width).toBeGreaterThan(0);
    expect(caja!.height).toBeGreaterThan(0);

    // Las opciones existen en el ÁRBOL DE ACCESIBILIDAD, no solo en el DOM.
    const opciones = select.getByRole('option');
    await expect(opciones).toHaveCount(3);
    await expect(opciones.first()).toBeVisible();
  });

  test('el panel se posiciona respecto del disparador y copia su ancho', async ({ page }) => {
    const select = page.getByTestId('select-cerrado');
    const disparador = select.getByRole('combobox');
    const panel = select.locator('.aegis-select__panel');

    await disparador.click();
    await expect(panel).toBeVisible();

    const cajaD = (await disparador.boundingBox())!;
    const cajaP = (await panel.boundingBox())!;

    // `matchAnchorWidth`: el panel mide lo que el disparador (±1 px de redondeo).
    expect(Math.abs(cajaP.width - cajaD.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(cajaP.x - cajaD.x)).toBeLessThanOrEqual(2);

    // PEGADO AL DISPARADOR, en vertical. Esta es la aserción que faltaba: la
    // versión anterior solo pedía `y > 0`, y un panel mal posicionado a 6899 px
    // (coordenadas de documento aplicadas a un `position: fixed`) la cumplía. El
    // panel se abría de verdad y no se veía; el gate decía verde.
    const bordeInferiorDisparador = cajaD.y + cajaD.height;
    expect(
      Math.abs(cajaP.y - bordeInferiorDisparador),
      'el panel debe quedar pegado al disparador, no a cientos de píxeles',
    ).toBeLessThanOrEqual(24);

    // Y DENTRO DEL VIEWPORT: `toBeVisible()` de Playwright no lo garantiza —
    // un elemento fuera de pantalla sigue contando como visible para él.
    const vp = page.viewportSize()!;
    expect(cajaP.y, 'el panel debe estar dentro de la pantalla').toBeLessThan(vp.height);
    expect(cajaP.y + cajaP.height).toBeGreaterThan(0);
  });

  test('el Combobox filtra en vivo y las opciones filtradas siguen expuestas', async ({ page }) => {
    const combo = page.getByTestId('combobox-cerrado');
    const campo = combo.getByRole('combobox');

    await campo.click();
    await campo.fill('bra');

    const panel = combo.locator('.aegis-combobox__panel');
    await expect(panel).toBeVisible();

    const opciones = combo.getByRole('option');
    await expect(opciones).toHaveCount(1);
    await expect(opciones.first()).toHaveText(/Brasil/);
  });

  test('aria-activedescendant apunta a un elemento que EXISTE, con la lista filtrada', async ({
    page,
  }) => {
    const combo = page.getByTestId('combobox-cerrado');
    const campo = combo.getByRole('combobox');

    await campo.click();
    await campo.fill('a'); // casa con varias
    await campo.press('ArrowDown');

    for (let i = 0; i < 3; i++) {
      // `toHaveAttribute` REINTENTA; `getAttribute` no. Sin esta espera el test
      // leería el atributo antes de que Angular hubiera repintado.
      await expect(campo, `paso ${i}: debe haber una opción activa`).toHaveAttribute(
        'aria-activedescendant',
        /.+/,
      );
      const id = await campo.getAttribute('aria-activedescendant');

      const activa = page.locator(`[id="${id}"]`);
      await expect(activa, `paso ${i}: el id "${id}" debe existir en el DOM`).toHaveCount(1);
      await expect(activa).toHaveAttribute('role', 'option');

      await campo.press('ArrowDown');
    }
  });

  test('el foco DOM no sale del campo mientras se navega', async ({ page }) => {
    const combo = page.getByTestId('combobox-cerrado');
    const campo = combo.getByRole('combobox');

    await campo.click();
    await campo.fill('a');
    await campo.press('ArrowDown');
    await campo.press('ArrowDown');

    await expect(campo).toBeFocused();
  });

  test('Escape cierra y devuelve el foco al campo (nativo del popover)', async ({ page }) => {
    const combo = page.getByTestId('combobox-cerrado');
    const campo = combo.getByRole('combobox');
    const panel = combo.locator('.aegis-combobox__panel');

    await campo.click();
    await campo.fill('a');
    await expect(panel).toBeVisible();

    await campo.press('Escape');
    await expect(panel).toBeHidden();
    await expect(campo).toBeFocused();
  });

  test('el ARIA del combobox está en el <input> REAL, no en el envoltorio', async ({ page }) => {
    const combo = page.getByTestId('combobox-cerrado');
    const campo = combo.locator('input');

    await expect(campo).toHaveAttribute('role', 'combobox');
    await expect(campo).toHaveAttribute('aria-autocomplete', 'list');
    await expect(campo).toHaveAttribute('aria-expanded', 'false');

    await campo.click();
    await campo.fill('a');
    await expect(campo).toHaveAttribute('aria-expanded', 'true');

    const controla = await campo.getAttribute('aria-controls');
    await expect(page.locator(`[id="${controla}"]`)).toHaveAttribute('role', 'listbox');
  });

  test('un combobox inválido conserva el ARIA del patrón Y el anuncio de su error', async ({
    page,
  }) => {
    const combo = page.getByTestId('combobox-invalido');
    const campo = combo.locator('input');

    await campo.click();
    await campo.fill('a');

    // Del envoltorio
    await expect(campo).toHaveAttribute('role', 'combobox');
    // Del Input, intactos: el raíl de los siete protegidos, en un navegador real
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    const descrito = await campo.getAttribute('aria-describedby');
    expect(descrito).toBeTruthy();
    await expect(page.locator(`[id="${descrito}"]`)).toContainText('Elige un país');
  });

  test('el panel truncado scrollea en vez de desbordar el viewport', async ({ page }) => {
    const select = page.getByTestId('select-truncado');
    const panel = select.locator('.aegis-select__panel');

    await select.getByRole('combobox').click();
    await expect(panel).toBeVisible();
    const caja = (await panel.boundingBox())!;
    const alto = page.viewportSize()!.height;

    expect(caja.height, 'el panel no puede ser más alto que el viewport').toBeLessThanOrEqual(alto);
    const scrollea = await panel.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(scrollea, 'con 100 opciones el panel debe scrollear').toBe(true);
  });
});
