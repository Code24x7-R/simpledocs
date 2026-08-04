// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { test, expect, Page } from '@playwright/test';

/**
 * Test: Merge focus issue
 * When pressing Backspace at start of page 2 line 1 col 1,
 * focus should shift to page 1 end WITH caret visible.
 */

/** Minimal Tiptap editor shape for E2E helpers */
interface TiptapEditor {
  state: {
    selection: { from: number; to: number; empty: boolean };
    doc: { resolve(pos: number): { index(depth: number): number; parentOffset: number }; content: { size: number } };
  };
  commands: {
    focus(): void;
    setTextSelection(pos: number): void;
  };
  view: { dom: HTMLElement };
}

interface EditorElement extends HTMLElement {
  editor?: TiptapEditor;
}

interface WindowWithStore extends Window {
  __docStore?: {
    getState(): {
      loadDocument(doc: unknown): void;
    };
  };
}

async function setup(page: Page) {
  await page.goto('/');
  await page.waitForSelector('.tiptap', { timeout: 10000 });
}

async function createTwoPageDoc(page: Page) {
  await page.evaluate(() => {
    // Define helpers inside browser context
    const para = (text: string) => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] });
    const makeDoc = (paras: string[]) => ({ type: 'doc', content: paras.map(para) });

    const store = (window as WindowWithStore).__docStore;
    if (store) {
      store.getState().loadDocument({
        id: 'test-merge',
        title: 'Merge Test',
        createdAt: '2026-08-04T00:00:00Z',
        updatedAt: '2026-08-04T00:00:00Z',
        settings: {
          pageFormat: 'A4',
          orientation: 'portrait',
          margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
          header: { enabled: false, content: '' },
          footer: { enabled: false, showPageNumbers: false },
          pageGap: 24,
          showPageBackgrounds: true,
        },
        pages: [
          { id: 'p1', content: makeDoc(Array.from({ length: 28 }, (_, i) => `Line ${i + 1}`)) },
          { id: 'p2', content: makeDoc(['Page 2 content']) },
        ],
      });
    }
  });
  await page.waitForTimeout(200);
}

async function getActiveEditor(page: Page): Promise<TiptapEditor | null> {
  return await page.evaluate(() => {
    const focused = document.activeElement;
    if (!focused?.classList.contains('tiptap')) return null;
    return (focused as EditorElement | null)?.editor || null;
  });
}

async function getCurrentPage(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const focused = document.activeElement;
    const wrapper = focused?.closest('[data-page-editor]');
    return wrapper ? parseInt(wrapper.getAttribute('data-page-editor') || '0', 10) : -1;
  });
}

async function getCursorPos(page: Page): Promise<{ line: number; col: number }> {
  return await page.evaluate(() => {
    const focused = document.activeElement;
    const editor = (focused as EditorElement | null)?.editor;
    if (!editor) return { line: 0, col: 0 };
    const { selection } = editor.state;
    const resolved = editor.state.doc.resolve(selection.from);
    return { line: resolved.index(0) + 1, col: resolved.parentOffset + 1 };
  });
}

async function getPageCount(page: Page): Promise<number> {
  return await page.locator('[data-page-editor]').count();
}

test.beforeEach(async ({ page }) => {
  await setup(page);
});

test('merge: backspace at start of page 2 should focus page 1 with caret', async ({ page }) => {
  await createTwoPageDoc(page);

  // Verify initial state: 2 pages
  expect(await getPageCount(page)).toBe(2);

  // Focus page 2 and place cursor at start
  const page2Editor = page.locator('[data-page-editor="1"] .tiptap');
  await page2Editor.click();
  await page.waitForTimeout(100);

  // Verify page 2 is focused
  expect(await getCurrentPage(page)).toBe(1);

  // Move cursor to very start of page 2
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-page-editor="1"] .tiptap');
    const editor = (el as EditorElement | null)?.editor;
    if (editor) {
      editor.commands.setTextSelection(1);
    }
  });
  await page.waitForTimeout(50);

  // Verify cursor is at start
  const posBefore = await getCursorPos(page);
  expect(posBefore.line).toBe(1);
  expect(posBefore.col).toBe(1);

  // Press Backspace at start of page 2 → should merge into page 1
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300); // Wait for merge + focus

  // DEBUG: Log what happened
  const pageCountAfter = await getPageCount(page);
  const currentPageAfter = await getCurrentPage(page);
  const activeEditor = await getActiveEditor(page);
  const cursorPosAfter = await getCursorPos(page);

  console.log('\n=== MERGE DEBUG ===');
  console.log('Page count after merge:', pageCountAfter);
  console.log('Current page after merge:', currentPageAfter);
  console.log('Active element:', await page.evaluate(() => document.activeElement?.className));
  console.log('Active editor exists:', !!activeEditor);
  console.log('Cursor pos after merge:', cursorPosAfter);
  console.log('===================\n');

  // EXPECTED BEHAVIOR:
  // 1. Page count should decrease from 2 to 1
  expect(pageCountAfter).toBe(1);

  // 2. Current page should be 0 (page 1)
  expect(currentPageAfter).toBe(0);

  // 3. The editor should have focus (caret visible)
  const hasFocus = await page.evaluate(() => {
    const focused = document.activeElement;
    return focused?.classList.contains('tiptap') || false;
  });
  expect(hasFocus).toBe(true);

  // 4. Cursor should be at end of merged content (line 28+)
  expect(cursorPosAfter.line).toBeGreaterThan(20);
});

test('merge: verify caret is visible after merge', async ({ page }) => {
  await createTwoPageDoc(page);

  // Focus page 2
  await page.locator('[data-page-editor="1"] .tiptap').click();
  await page.waitForTimeout(100);

  // Move cursor to start
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-page-editor="1"] .tiptap');
    const editor = (el as EditorElement | null)?.editor;
    if (editor) editor.commands.setTextSelection(1);
  });
  await page.waitForTimeout(50);

  // Press Backspace
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300);

  // Check if caret is visible (editor has focus and shows caret)
  const caretInfo = await page.evaluate(() => {
    const focused = document.activeElement;
    const editor = (focused as EditorElement | null)?.editor;
    if (!editor) return { hasEditor: false };
    const { selection } = editor.state;
    return {
      hasEditor: true,
      selectionEmpty: selection.empty,
      from: selection.from,
      docSize: editor.state.doc.content.size,
      hasFocus: document.activeElement === editor.view.dom,
    };
  });

  console.log('\n=== CARET DEBUG ===');
  console.log('Caret info:', caretInfo);
  console.log('===================\n');

  expect(caretInfo.hasEditor).toBe(true);
  expect(caretInfo.hasFocus).toBe(true);
});
