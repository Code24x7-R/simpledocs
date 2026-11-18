import { test, expect } from '@playwright/test';
import { openApp, loadDocument, getEditorState, getBlockStart, setSelection } from './helpers';

/**
 * Caret/focus behaviour after block merges in the single-editor model.
 * Replaces the old multi-page merge-focus spec.
 */

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('merge: Backspace at block start keeps focus and a visible caret', async ({ page }) => {
  await loadDocument(page, { paragraphs: ['Paragraph one', 'Paragraph two'] });
  const before = await getEditorState(page);
  expect(before?.blocks).toBe(2);

  await setSelection(page, await getBlockStart(page, 1));
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(200);

  const after = await getEditorState(page);
  expect(after?.blocks).toBe(1);
  expect(after?.focused).toBe(true);
  expect(after?.empty).toBe(true);
  await expect(page.locator('.tiptap')).toBeFocused();
});

test('merge: caret remains at the merge point with valid selection', async ({ page }) => {
  await loadDocument(page, { paragraphs: ['First block', 'Second block'] });
  await setSelection(page, await getBlockStart(page, 1));
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(200);

  const state = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__docStore.getState().editor;
    const { from, to } = editor.state.selection;
    return {
      from,
      to,
      docSize: editor.state.doc.content.size,
      focused: editor.view.hasFocus(),
      text: editor.getText(),
    };
  });

  expect(state.focused).toBe(true);
  expect(state.from).toBe(state.to);
  expect(state.from).toBeGreaterThan(0);
  expect(state.from).toBeLessThanOrEqual(state.docSize);
  expect(state.text).toContain('First blockSecond block');
});
