import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tiptap', { timeout: 10000 });
});

test('PDF export flow: triggers without errors', async ({ page }) => {
  // Listen for console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Open File menu and click Export PDF
  await page.locator('button:has-text("File")').click();
  await page.locator('button:has-text("Export PDF")').click();

  // Wait a moment for any async operations
  await page.waitForTimeout(1000);

  // Should not have any console errors related to PDF export
  const pdfErrors = errors.filter((e) => e.toLowerCase().includes('pdf') || e.toLowerCase().includes('html2pdf'));
  expect(pdfErrors).toHaveLength(0);
});
