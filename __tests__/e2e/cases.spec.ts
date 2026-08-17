import { test, expect } from '@playwright/test';

const FIXTURE_CASE = {
  id: 'A',
  name: 'A — Left Tower',
  description: 'Tall case on the far left wall',
  capacity: null,
  last_inventoried_at: null,
};

const FIXTURE_PIECE = {
  id: 'e2e-piece-1',
  sku: 'P9001',
  name: 'E2E Test Vessel',
  place_of_origin: 'North America',
  age: '800 CE',
  color: 'Brown',
  condition: 'Good',
  case_id: 'A',
  status: 'Active',
  photos: [],
  created_at: '2026-01-01T00:00:00Z',
};

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/cases**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([FIXTURE_CASE]),
    }),
  );
  await page.route('**/rest/v1/pottery**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([FIXTURE_PIECE]),
    }),
  );
});

test('public user can browse cases and open a case with a mocked piece inside', async ({
  page,
}) => {
  await page.goto('/cases');
  await expect(page.getByText('A — Left Tower')).toBeVisible();

  await page.getByText('A — Left Tower').click();
  await expect(page).toHaveURL(/\/cases\/A/);
  await expect(page.getByText('E2E Test Vessel')).toBeVisible();
});

test('public user can open the item detail page for a piece from the case', async ({ page }) => {
  await page.route('**/rest/v1/pottery**', (route) => {
    const url = route.request().url();
    if (url.includes('id=eq.')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FIXTURE_PIECE),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([FIXTURE_PIECE]),
    });
  });

  await page.goto(`/item/${FIXTURE_PIECE.id}`);
  await expect(page.getByText('E2E Test Vessel')).toBeVisible();
  await expect(page.getByText(FIXTURE_PIECE.sku)).toBeVisible();
});
