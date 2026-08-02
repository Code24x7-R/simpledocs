import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tiptap', { timeout: 10000 });
});

test('table creation flow: insert 3x3 table', async ({ page }) => {
  // Click the table button to open grid modal
  await page.locator('button[title="Insert Table"]').click();

  // Wait for grid to appear
  await page.waitForSelector('.grid');

  // The grid has 100 cells (10x10), we need to hover over cell at row 3, col 3
  // Cells are 0-indexed: row 3, col 3 = index (2 * 10) + 2 = 22
  const gridContainer = page.locator('.grid');
  const cells = gridContainer.locator('button');
  await cells.nth(22).hover(); // row 3, col 3 (0-indexed: 2,2 -> 22)
  await cells.nth(22).click();

  // Verify table is rendered
  await expect(page.locator('.tiptap table')).toBeVisible();
  await expect(page.locator('.tiptap table tr')).toHaveCount(3);
});

test('table has header row', async ({ page }) => {
  await page.locator('button[title="Insert Table"]').click();
  await page.waitForSelector('.grid');

  const gridContainer = page.locator('.grid');
  const cells = gridContainer.locator('button');
  await cells.nth(22).click();

  // Should have 3 rows, first row should contain <th> elements
  await expect(page.locator('.tiptap table tr:first-child th')).toHaveCount(3);
});
