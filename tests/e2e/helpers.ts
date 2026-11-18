// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Page, expect } from '@playwright/test';

/**
 * Shared E2E helpers for the single-editor architecture.
 *
 * The editor renders ONE ProseMirror instance for the whole document; pages are
 * computed guides, not separate editors. These helpers reach the app's exposed
 * store (`window.__docStore`) to load fixtures and read caret state.
 */

export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.tiptap')).toBeVisible({ timeout: 15000 });
}

export interface LoadOptions {
  title?: string;
  paragraphs: string[];
}

export async function loadDocument(page: Page, { title = 'E2E Document', paragraphs }: LoadOptions): Promise<void> {
  await page.evaluate(({ title, paragraphs }) => {
    const content = {
      type: 'doc',
      content: paragraphs.map((text) => ({
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : [],
      })),
    };
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__docStore;
    store.getState().loadDocument({
      id: 'e2e-doc',
      title,
      createdAt: now,
      updatedAt: now,
      totalPages: 1,
      settings: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
        header: { enabled: false, content: '' },
        footer: { enabled: false, showPageNumbers: false },
        pageGap: 24,
        showPageBackgrounds: true,
        orphans: 2,
        widows: 2,
        defaultNormalEditorMode: false,
      },
      content,
    });
  }, { title, paragraphs });
  await page.waitForTimeout(150);
}

export interface EditorSnapshot {
  from: number;
  to: number;
  empty: boolean;
  blocks: number;
  blockIndex: number;
  blockOffset: number;
  focused: boolean;
  text: string;
}

export async function getEditorState(page: Page): Promise<EditorSnapshot | null> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__docStore.getState().editor;
    if (!editor) return null;
    const { selection, doc } = editor.state;
    const resolved = doc.resolve(selection.from);
    return {
      from: selection.from,
      to: selection.to,
      empty: selection.empty,
      blocks: doc.childCount,
      blockIndex: resolved.index(0),
      blockOffset: resolved.parentOffset,
      focused: editor.view.hasFocus(),
      text: editor.getText(),
    };
  });
}

export async function setSelection(page: Page, pos: number): Promise<void> {
  await page.evaluate((position) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__docStore.getState().editor;
    editor.commands.focus();
    editor.commands.setTextSelection(position);
  }, pos);
  await page.waitForTimeout(50);
}

/** Start-of-block ProseMirror position for a top-level block index. */
export async function getBlockStart(page: Page, index: number): Promise<number> {
  return page.evaluate((blockIndex) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__docStore.getState().editor;
    let pos = 1;
    editor.state.doc.forEach((_node: unknown, offset: number, i: number) => {
      if (i === blockIndex) pos = offset + 1;
    });
    return pos;
  }, index);
}
