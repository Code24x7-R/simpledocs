// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { createExtensions } from '../../extensions';
import { useDocStore } from '../../store/useDocStore';

interface PageEditorProps {
  pageIndex: number;
  content: Record<string, unknown>;
  pageHeightPx: number;
  usableHeightPx: number;
  marginTopPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  headerHeightPx: number;
  footerHeightPx: number;
  lineHeightPx: number;
  onChange: (pageIndex: number, content: Record<string, unknown>) => void;
  onOverflow: (pageIndex: number, cursorAtEnd: boolean) => void;
  onUnderflow: (pageIndex: number) => void;
  onFocusNextPage: (pageIndex: number, cursorAtStart: boolean) => void;
  onFocusPrevPage: (pageIndex: number) => void;
  onMergeWithPrevPage: (pageIndex: number) => void;
  onEditorReady?: (editor: any, pageIndex: number) => void;
  /** Request cursor position to be applied after next content sync (e.g., after merge) */
  cursorPositionRef?: React.MutableRefObject<number | null>;
}

/**
 * Single page editor — one Tiptap instance rendering into a fixed-height
 * container. The editor's contenteditable has a fixed height matching the
 * usable body area (page height minus margins, header, footer).
 *
 * Overflow/underflow detection: after each update, we measure the scroll height
 * of the contenteditable. If it exceeds the usable height, we notify the parent
 * which can redistribute content to the next page. If there's room for more
 * content, we pull from the next page.
 *
 * Keyboard navigation:
 * - Enter creates new lines freely (overflow system handles page breaks)
 * - Arrow Down at end of full page → move to next page
 * - Arrow Up at start → move to previous page (at end)
 * - Backspace at start (not first page) → merge with previous page
 */
export default function PageEditor({
  pageIndex,
  content,
  usableHeightPx,
  marginTopPx,
  marginLeftPx,
  marginRightPx,
  headerHeightPx,
  lineHeightPx,
  onChange,
  onOverflow,
  onUnderflow,
  onFocusNextPage,
  onFocusPrevPage,
  onMergeWithPrevPage,
  onEditorReady,
  cursorPositionRef,
}: PageEditorProps) {
  const { setEditor } = useDocStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: createExtensions(),
    content,
    editorProps: {
      attributes: {
        class: 'tiptap',
        style: `min-height: ${usableHeightPx}px; line-height: ${lineHeightPx}px; padding-top: ${marginTopPx + headerHeightPx}px; padding-left: ${marginLeftPx}px; padding-right: ${marginRightPx}px;`,
      },
      handleKeyDown(view, event) {
        const { selection } = view.state;
        const docSize = view.state.doc.content.size;
        const resolved = view.state.doc.resolve(selection.from);
        // At the end of the last block (inside the doc, after all content)
        const isAtEnd = selection.empty && selection.from >= docSize - 1;
        // At the start of the first block (parentOffset = 0 and index in doc = 0)
        const isAtStart = selection.empty && resolved.depth >= 1 && resolved.parentOffset === 0 && resolved.index(0) === 0;

        // Arrow Down at the end of the document
        if (event.key === 'ArrowDown' && isAtEnd) {
          // Check if there's a next page OR if the current page is full (needs overflow)
          const { docState } = useDocStore.getState();
          const hasNextPage = pageIndex < docState.pages.length - 1;
          const el = editorRef.current?.querySelector('.tiptap') as HTMLElement | null;
          const isPageFull = el && el.scrollHeight > usableHeightPx + 2;
          if (hasNextPage || isPageFull) {
            event.preventDefault();
            onFocusNextPage(pageIndex, true);
            return true;
          }
          // Otherwise let the cursor move down within the page
          return false;
        }

        // Arrow Up at the start of the document → move to previous page
        if (event.key === 'ArrowUp' && isAtStart && pageIndex > 0) {
          event.preventDefault();
          onFocusPrevPage(pageIndex);
          return true;
        }

        // PgUp on any page after the first → move to end of previous page
        if (event.key === 'PageUp' && pageIndex > 0) {
          event.preventDefault();
          onFocusPrevPage(pageIndex);
          return true;
        }

        // PgDn on any page before the last → move to start of next page
        if (event.key === 'PageDown' && pageIndex < useDocStore.getState().docState.pages.length - 1) {
          event.preventDefault();
          onFocusNextPage(pageIndex, true);
          return true;
        }

        // Backspace at the start of the document (not first page) → merge with previous
        if (event.key === 'Backspace' && isAtStart && pageIndex > 0) {
          event.preventDefault();
          onMergeWithPrevPage(pageIndex);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(pageIndex, ed.getJSON());
      checkOverflowAndUnderflow();
    },
    onFocus: () => {
      setIsFocused(true);
      setEditor(editor);
    },
    onBlur: () => setIsFocused(false),
  });

  const checkOverflowAndUnderflow = () => {
    if (!editor) return;
    const el = editorRef.current?.querySelector('.tiptap') as HTMLElement | null;
    if (!el) return;

    const scrollHeight = el.scrollHeight;
    const paddingTop = marginTopPx + headerHeightPx;
    const contentHeight = scrollHeight - paddingTop;

    // Check if cursor is at the end of the document
    const { selection } = editor.state;
    const docSize = editor.state.doc.content.size;
    const isCursorAtEnd = selection.empty && selection.from === docSize - 1;

    if (contentHeight > usableHeightPx + 2) {
      // Content exceeds page → overflow to next page
      onOverflow(pageIndex, isCursorAtEnd);
    } else if (contentHeight < usableHeightPx - 2) {
      // There's room for more content → pull from next page
      onUnderflow(pageIndex);
    }
  };

  // Register the editor instance with the parent when created
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor, pageIndex);
    }
    // Apply any pending cursor position (e.g., after merge creates new editor)
    if (editor && cursorPositionRef?.current != null) {
      const pos = cursorPositionRef.current;
      const maxPos = editor.state.doc.content.size - 1;
      const safePos = Math.min(pos, maxPos);
      queueMicrotask(() => {
        editor.commands.setTextSelection(safePos);
        editor.commands.focus(safePos);
        cursorPositionRef.current = null;
      });
    }
  }, [editor, onEditorReady, pageIndex, cursorPositionRef]);

  // Sync external content changes (e.g., from search/render or migration).
  // Defer to a microtask to avoid flushSync warning during React commit phase.
  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        queueMicrotask(() => {
          editor.commands.setContent(content, { emitUpdate: false });
          // Apply any pending cursor position request (e.g., after merge)
          if (cursorPositionRef?.current != null) {
            const pos = cursorPositionRef.current;
            const maxPos = editor.state.doc.content.size - 1;
            const safePos = Math.min(pos, maxPos);
            editor.commands.setTextSelection(safePos);
            editor.commands.focus(safePos);
            cursorPositionRef.current = null;
          }
        });
      }
    }
  }, [content, editor, cursorPositionRef]);

  return (
    <div
      ref={editorRef}
      data-page-editor={pageIndex}
      className={`page-editor ${isFocused ? 'focused' : ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
