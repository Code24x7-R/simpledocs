import { test, expect } from '@playwright/test';
import { openApp, loadDocument, getEditorState, setSelection, getBlockStart } from './helpers';

/**
 * Single-editor keyboard navigation and block merge.
 *
 * These replace the old multi-page-editor specs. The app now uses one Tiptap
 * instance for the whole document, so cross-page caret transitions are ordinary
 * ProseMirror block navigation; pages are computed scroll guides only.
 */

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test.describe('single editor model', () => {
  test('renders one contenteditable for a long multi-page document', async ({ page }) => {
    await loadDocument(page, {
      paragraphs: Array.from({ length: 80 }, (_, i) => `Line ${i + 1}`),
    });

    await expect(page.locator('.tiptap')).toHaveCount(1);
    await expect(page.locator('[data-page-editor]')).toHaveCount(0);
    const scrollHeight = await page.locator('#paginated-viewport').evaluate((el) => el.scrollHeight);
    expect(scrollHeight).toBeGreaterThan(1200);
  });

  test('ArrowDown moves the caret to the next block', async ({ page }) => {
    await loadDocument(page, { paragraphs: ['Line 1', 'Line 2', 'Line 3'] });
    await setSelection(page, 1);
    await page.keyboard.press('ArrowDown');

    const state = await getEditorState(page);
    expect(state?.blockIndex).toBe(1);
  });

  test('ArrowUp moves the caret to the previous block', async ({ page }) => {
    await loadDocument(page, { paragraphs: ['Line 1', 'Line 2', 'Line 3'] });
    await setSelection(page, await getBlockStart(page, 1));
    await page.keyboard.press('ArrowUp');

    const state = await getEditorState(page);
    expect(state?.blockIndex).toBe(0);
  });

  test('PageDown scrolls the viewport and keeps editor focus', async ({ page }) => {
    await loadDocument(page, {
      paragraphs: Array.from({ length: 100 }, (_, i) => `Scroll line ${i + 1}`),
    });
    await page.locator('.tiptap').click();

    const viewport = page.locator('#paginated-viewport');
    const before = await viewport.evaluate((el) => el.scrollTop);
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(300);
    const after = await viewport.evaluate((el) => el.scrollTop);

    expect(after).toBeGreaterThan(before);
    await expect(page.locator('.tiptap')).toBeFocused();
  });
});

test.describe('block merge', () => {
  test('Backspace at the start of a block merges it into the previous block', async ({ page }) => {
    await loadDocument(page, { paragraphs: ['Hello World', 'Second paragraph'] });
    const before = await getEditorState(page);
    await setSelection(page, await getBlockStart(page, 1));
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(150);

    const after = await getEditorState(page);
    expect(after?.blocks).toBe((before?.blocks ?? 0) - 1);
    expect(after?.focused).toBe(true);
    expect(after?.empty).toBe(true);
    expect(after?.text).toContain('Hello WorldSecond paragraph');
  });

  test('Backspace at the document start leaves the document valid and focused', async ({ page }) => {
    await loadDocument(page, { paragraphs: ['First paragraph', 'Second paragraph'] });
    const before = await getEditorState(page);
    await setSelection(page, 1);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);

    const after = await getEditorState(page);
    expect(after?.blocks).toBe(before?.blocks);
    expect(after?.focused).toBe(true);
    expect(after?.text).toBe(before?.text);
  });

  test('Enter at the end of the document adds a block and keeps the caret visible', async ({ page }) => {
    await loadDocument(page, { paragraphs: ['Only paragraph'] });
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editor = (window as any).__docStore.getState().editor;
      editor.commands.focus();
      editor.commands.selectTextblockEnd();
    });
    const before = await getEditorState(page);

    await page.keyboard.press('Enter');
    await page.keyboard.type('New line');

    const after = await getEditorState(page);
    expect(after?.blocks).toBe((before?.blocks ?? 0) + 1);
    expect(after?.focused).toBe(true);
    expect(after?.text).toContain('New line');
  });
});
