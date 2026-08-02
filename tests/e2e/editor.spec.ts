import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for the editor to be ready
  await page.waitForSelector('.tiptap', { timeout: 10000 });
});

test('loads the editor with default content', async ({ page }) => {
  await expect(page.locator('text=simpledocs')).toBeVisible();
  await expect(page.locator('.tiptap')).toBeVisible();
});

test('formatting flow: bold text', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('Hello World');

  // Select all text and make it bold
  await page.keyboard.press('Control+a');
  await page.locator('button[title="Bold"]').click();

  // Check that a <strong> element exists
  await expect(page.locator('.tiptap strong')).toContainText('Hello World');
});

test('formatting flow: italic text', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('Italic Text');

  await page.keyboard.press('Control+a');
  await page.locator('button[title="Italic"]').click();

  await expect(page.locator('.tiptap em')).toContainText('Italic Text');
});

test('creates a heading', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('My Heading');

  await page.locator('button:has-text("Style")').click();
  await page.locator('button:has-text("Heading 1")').click();

  await expect(page.locator('.tiptap h1')).toContainText('My Heading');
});

test('creates a bullet list', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('Item 1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Item 2');

  await page.keyboard.press('Control+a');
  await page.locator('button[title="Bullet List"]').click();

  await expect(page.locator('.tiptap ul li')).toHaveCount(2);
});

test('undo and redo work', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('Test undo');

  await page.locator('button[title="Undo"]').click();
  await expect(page.locator('.tiptap')).not.toContainText('Test undo');

  await page.locator('button[title="Redo"]').click();
  await expect(page.locator('.tiptap')).toContainText('Test undo');
});

test('zoom controls change zoom level', async ({ page }) => {
  await page.locator('button:has-text("75%")').click();
  // The zoom is applied via CSS transform on the viewport container
  const viewport = page.locator('#paginated-viewport > div');
  await expect(viewport).toHaveCSS('transform', /matrix\(0\.75/);
});

test('page setup modal opens and closes', async ({ page }) => {
  // Open via File menu
  await page.locator('button:has-text("File")').click();
  await page.locator('button:has-text("Page Setup")').click();

  await expect(page.locator('text=Page Setup')).toBeVisible();

  // Close
  await page.locator('button:has-text("Cancel")').click();
  await expect(page.locator('text=Page Setup')).not.toBeVisible();
});

test('document title can be edited', async ({ page }) => {
  const titleInput = page.locator('input[placeholder="Document Title"]');
  await titleInput.fill('My New Document Title');
  await expect(titleInput).toHaveValue('My New Document Title');
});
