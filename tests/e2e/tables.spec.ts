import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tiptap', { timeout: 15000 });
});

test('table creation flow: insert 3x3 table', async ({ page }) => {
  await page.getByTestId('menu-insert').click();
  await page.getByRole('button', { name: 'Table', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Insert Table' })).toBeVisible();

  const cells = page.locator('.grid button');
  await cells.nth(22).hover(); // row 3, col 3 (0-indexed 2,2)
  await cells.nth(22).click();

  await expect(page.locator('.tiptap table')).toBeVisible();
  await expect(page.locator('.tiptap table tr')).toHaveCount(3);
});

test('table has header row', async ({ page }) => {
  await page.getByTestId('menu-insert').click();
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await page.locator('.grid button').nth(22).click();

  await expect(page.locator('.tiptap table tr:first-child th')).toHaveCount(3);
});
