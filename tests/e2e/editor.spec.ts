import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('loads the single-editor workspace', async ({ page }) => {
  await expect(page.getByText('SimpleDocs', { exact: true })).toBeVisible();
  await expect(page.locator('.tiptap')).toBeVisible();
  // The multi-editor architecture is gone: exactly one contenteditable.
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(1);
  await expect(page.locator('[data-page-editor]')).toHaveCount(0);
});

test('formatting flow: bold text', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('Hello World');

  await page.keyboard.press('Control+a');
  await page.locator('button[title^="Bold"]').click();

  await expect(page.locator('.tiptap strong')).toContainText('Hello World');
});

test('formatting flow: italic text', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('Italic Text');

  await page.keyboard.press('Control+a');
  await page.locator('button[title^="Italic"]').click();

  await expect(page.locator('.tiptap em')).toContainText('Italic Text');
});

test('creates a heading from the style dropdown', async ({ page }) => {
  const editor = page.locator('.tiptap');
  await editor.click();
  await page.keyboard.type('My Heading');

  await page.getByTestId('style-dropdown').click();
  await page.getByRole('button', { name: 'Heading 1', exact: true }).click();

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

  await page.locator('button[title^="Undo"]').click();
  await expect(page.locator('.tiptap')).not.toContainText('Test undo');

  await page.locator('button[title^="Redo"]').click();
  await expect(page.locator('.tiptap')).toContainText('Test undo');
});

test('zoom controls change zoom level', async ({ page }) => {
  await page.getByTestId('menu-view').click();
  await page.getByRole('button', { name: '75%', exact: true }).click();

  const viewport = page.locator('#paginated-viewport > div');
  await expect(viewport).toHaveCSS('transform', /matrix\(0\.75/);
});

test('page setup modal opens and closes', async ({ page }) => {
  await page.getByTestId('menu-file').click();
  await page.getByTestId('file-page-setup').click();

  await expect(page.getByRole('heading', { name: 'Page Setup' })).toBeVisible();

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Page Setup' })).not.toBeVisible();
});

test('document title can be edited', async ({ page }) => {
  const titleInput = page.getByTestId('document-title');
  await titleInput.fill('My New Document Title');
  await expect(titleInput).toHaveValue('My New Document Title');
});
