import { defineConfig, devices } from '@playwright/test';

/**
 * Config Playwright del sandbox.
 *
 * En Fase 1 solo hay un smoke test que verifica que la app arranca. Los tests
 * visuales, de axe (a11y) y de target-size llegan con el primer componente
 * (Fase 3) y alimentan los gates `visual`, `a11y` y `target-size` de §9.2.
 * Chromium para snapshots (§8.4); Firefox queda para el pase manual de a11y.
 */
export default defineConfig({
  testDir: './e2e',
  // Los baselines del gate `visual` son ESTILOS COMPUTADOS (colores/medidas desde
  // tokens en rem/px), deterministas entre plataformas: sin sufijo de SO/navegador,
  // un único baseline sirve en darwin (local) y en ubuntu (CI).
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFileName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx ng serve --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
