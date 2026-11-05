import { test, expect, type Page } from '@playwright/test';

const PIECE = {
  id: 'e2e-browse-1',
  sku: 'P9101',
  name: 'E2E Effigy Bottle',
  place_of_origin: 'Northeast Arkansas',
  age: '1200–1500 CE',
  color: 'Buff',
  tribe_culture: 'Mississippian',
  culture_id: 'mississippian',
  region: 'North America',
  period_start_year: 1200,
  period_end_year: 1500,
  condition: 'Good',
  case_id: null,
  status: 'Active',
  photos: [],
  thumbs: [],
  ai_fields: [],
  description: 'A shell-tempered effigy bottle.',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

async function stubSupabase(page: Page) {
  await page.route('**/rest/v1/pottery**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: JSON.stringify([PIECE]),
    }),
  );
}

test('public visitors browse the collection and open a piece by SKU', async ({ page }) => {
  await stubSupabase(page);
  await page.goto('/');
  await expect(page).not.toHaveURL(/login/);
  await expect(
    page.getByRole('heading', { name: 'Pottery from across the ancient world' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /E2E Effigy Bottle/ }).click();
  await expect(page).toHaveURL(/\/item\/P9101$/);
  await expect(page.getByRole('heading', { level: 1, name: 'E2E Effigy Bottle' })).toBeVisible();
  await expect(page.getByText('A shell-tempered effigy bottle.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
});

test('filters and views are kept in the URL', async ({ page }) => {
  await stubSupabase(page);
  await page.goto('/?view=timeline&region=North%20America');
  await expect(page.getByRole('tab', { name: 'Timeline' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Remove filter North America' })).toBeVisible();
  await expect(page.getByRole('region', { name: '1250 – 1500 CE' })).toBeVisible();
});

for (const path of ['/add', '/dashboard', '/review', '/catalog/print']) {
  test(`${path} redirects signed-out visitors to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  });
}
