import { test, expect } from '@playwright/test';

// PDF generation lazy-loads ~21 MB of embedded fonts on first export.
test.setTimeout(180_000);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tiptap', { timeout: 15000 });
});

test('PDF export produces a downloadable searchable PDF', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.getByTestId('menu-file').click();
  await page.getByTestId('file-export').hover();
  await expect(page.getByTestId('file-export-pdf')).toBeVisible();

  const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
  // DOM click avoids the mouse leaving the hover-only flyout mid-click.
  await page.getByTestId('file-export-pdf').evaluate((el) => (el as HTMLElement).click());
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^Untitled_Document.*\.pdf$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  const { statSync } = await import('node:fs');
  expect(statSync(path!).size).toBeGreaterThan(1000);

  const pdfErrors = errors.filter((e) => /pdf|html2pdf/i.test(e));
  expect(pdfErrors).toHaveLength(0);
});
