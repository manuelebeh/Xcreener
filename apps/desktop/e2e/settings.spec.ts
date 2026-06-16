import { expect, test } from '@playwright/test';

test.describe('Settings smoke', () => {
  test('settings page shows integration controls', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByLabel('Theme')).toBeVisible();
    await expect(page.getByLabel('Global capture shortcut')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Launch at login' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Share anonymous usage data' })).toBeVisible();
  });
});
