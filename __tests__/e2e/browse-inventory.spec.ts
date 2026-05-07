import { test, expect } from '@playwright/test';

test('public user can load the inventory without being redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).not.toHaveURL(/login/);
  await expect(page.locator('header')).toBeVisible();
});

test('public user can open an item detail page', async ({ page }) => {
  await page.goto('/');
  const firstItem = page.locator('a[href^="/item/"]').first();
  const count = await firstItem.count();
  if (count === 0) {
    test.skip();
    return;
  }
  await firstItem.click();
  await expect(page).toHaveURL(/\/item\//);
  await expect(page.locator('header')).toBeVisible();
});

test('add page redirects unauthenticated users', async ({ page }) => {
  await page.goto('/add');
  await expect(page).not.toHaveURL('/add');
});
