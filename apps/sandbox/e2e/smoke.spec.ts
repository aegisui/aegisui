import { expect, test } from '@playwright/test';

test('el sandbox arranca y muestra su título', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aegis UI — Sandbox' })).toBeVisible();
});
