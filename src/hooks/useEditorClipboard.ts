// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { copyToClipboard, pasteFromClipboard } from '../utils/clipboard';

/**
 * useEditorClipboard — consolidated clipboard operations for the editor.
 *
 * Both the Toolbar and Navbar menus use identical copy/cut/paste logic.
 * This hook ensures a single source of truth and consistent behavior.
 */
export function useEditorClipboard(editor: Editor | null) {
  const handleCopy = useCallback(async () => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '\n');
    if (!selectedText) return;
    const htmlContent = editor.view.nodeDOM(from)?.parentElement?.innerHTML ?? '';
    await copyToClipboard(selectedText, htmlContent);
  }, [editor]);

  const handleCut = useCallback(async () => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '\n');
    if (!selectedText) return;
    const htmlContent = editor.view.nodeDOM(from)?.parentElement?.innerHTML ?? '';
    await copyToClipboard(selectedText, htmlContent);
    editor.chain().focus().deleteSelection().run();
  }, [editor]);

  const handlePaste = useCallback(async () => {
    if (!editor) return;
    const { text, html } = await pasteFromClipboard();
    const content = html || text;
    if (content) {
      editor.chain().focus().insertContent(content).run();
    }
  }, [editor]);

  return { handleCopy, handleCut, handlePaste };
}
