import { expect, test } from '@playwright/test';

test('el sandbox arranca y muestra la marca', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aegis UI', level: 1 })).toBeVisible();
});

test('el toggle de tema conmuta [data-theme] en :root', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
