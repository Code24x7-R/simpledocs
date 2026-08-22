// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEditor, EditorContent } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Scroll the paginated viewport so the target heading is visible, zoom-aware.
 * The viewport's own scroll handler tracks the new page number from the
 * resulting scroll position (the origin flag prevents it from snapping back
 * to a page boundary, so the view stays put on the heading).
 */
function scrollHeadingIntoView(targetEl: Element): void {
  const container = targetEl.closest('#paginated-viewport');
  if (!container) return;
  const zoom = useDocStore.getState().zoom;
  const containerRect = container.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const targetScrollTop =
    container.scrollTop + (targetRect.top - containerRect.top) / zoom;
  container.scrollTo({ top: targetScrollTop, behavior: 'auto' });
}

import { createPortal } from 'react-dom';
import { createExtensions } from '../../extensions';
import { useDocStore } from '../../store/useDocStore';
import TableContextMenu from './TableContextMenu';
import EditorBubbleMenu from './BubbleMenu';
import { useLinkPreview } from './useLinkPreview';

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * DocumentEditor — single Tiptap instance for the entire document.
 *
 * The Google Docs approach: one editor, one content tree. Pages are
 * visual guides rendered by PaginatedViewport — content flows naturally.
 */
export default function DocumentEditor() {
  const { docState, updateContent, setEditor } = useDocStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    visible: false,
  });
  const { preview: linkPreview, linkHandlers } = useLinkPreview();

  const editor = useEditor({
    extensions: createExtensions(),
    content: docState.content,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
      handleClick(_view: EditorView, _pos: number, event: MouseEvent) {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor) {
          const href = anchor.getAttribute('href');
          if (href) {
            event.preventDefault();
            // Internal anchor links (#heading) — scroll to target and focus cursor
            if (href.startsWith('#')) {
              const targetId = href.slice(1);
              const editorEl = editorRef.current;
              if (editorEl) {
                // Find the anchor target within the editor content
                const targetEl = editorEl.querySelector(`[id="${targetId}"], [data-anchor="${targetId}"], a[name="${targetId}"]`);
                if (targetEl && editor) {
                  // Place the cursor at the heading, then scroll the viewport
                  // zoom-aware (Tiptap's scrollIntoView ignores the scaled
                  // wrapper, so it drifts for headings further down the doc).
                  const pos = editor.view.posAtDOM(targetEl, 0);
                  editor.chain().focus().setTextSelection(pos).run();
                  scrollHeadingIntoView(targetEl);
                  return true;
                }
              }
              // Target not found — don't navigate
              return true;
            }
            // External links → open in new tab
            window.open(href, '_blank', 'noopener,noreferrer');
            return true;
          }
        }
        return false;
      },
      handleKeyDown(_view: EditorView, event: KeyboardEvent) {
        // Ctrl+Enter → insert page break
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (editor) {
            editor.chain().focus().setPageBreak().run();
          }
          return true;
        }
        // Plain Enter on a link → open in new tab (or scroll for internal)
        if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          if (editor?.isActive('link')) {
            const attrs = editor.getAttributes('link');
            const href = attrs.href as string | undefined;
            if (href) {
              event.preventDefault();
              if (href.startsWith('#')) {
                // Internal anchor — scroll to target and focus cursor
                const targetId = href.slice(1);
                const editorEl = editorRef.current;
                if (editorEl) {
                  const targetEl = editorEl.querySelector(`[id="${targetId}"], [data-anchor="${targetId}"], a[name="${targetId}"]`);
                  if (targetEl) {
                    const pos = editor.view.posAtDOM(targetEl, 0);
                    editor.chain().focus().setTextSelection(pos).run();
                    scrollHeadingIntoView(targetEl);
                  }
                }
              } else {
                window.open(href, '_blank', 'noopener,noreferrer');
              }
              return true;
            }
          }
        }
        // Ctrl+K → insert/edit link
        if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (editor) {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run();
            } else {
              // Dispatch custom event to open link modal
              window.dispatchEvent(new CustomEvent('simpledocs:open-link'));
            }
          }
          return true;
        }
        // Ctrl+Shift+F → toggle Normal / Paginated Editor
        if (event.key === 'f' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
          event.preventDefault();
          useDocStore.getState().setNormalEditorMode(!useDocStore.getState().normalEditorMode);
          return true;
        }
        // Ctrl+Shift+T → toggle TTS panel
        if (event.key === 't' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
          event.preventDefault();
          useDocStore.getState().setTtsOpen(!useDocStore.getState().ttsOpen);
          return true;
        }
        // Ctrl+Alt+4/5/6 → Heading 4/5/6
        if (event.key >= '4' && event.key <= '6' && (event.ctrlKey || event.metaKey) && event.altKey) {
          event.preventDefault();
          if (editor) {
            editor.chain().focus().toggleHeading({ level: parseInt(event.key) as 4 | 5 | 6 }).run();
          }
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        contextmenu(_view: EditorView, event: MouseEvent) {
          // Show context menu when right-clicking inside a table
          if (editor?.isActive('table')) {
            event.preventDefault();
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              visible: true,
            });
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateContent(ed.getJSON());
    },
  });

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Expose editor to store on creation and when it changes
  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  // Sync external content changes (e.g., from search/replace or migration)
  useEffect(() => {
    if (editor && docState.content) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(docState.content)) {
        queueMicrotask(() => {
          editor.commands.setContent(docState.content, { emitUpdate: false });
        });
      }
    }
  }, [docState.content, editor]);

  return (
    <div
      ref={editorRef}
      className="document-editor"
      {...linkHandlers}
    >
      <EditorBubbleMenu editor={editor} />
      <EditorContent editor={editor} />
      {contextMenu.visible && editor && (
        <TableContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          editor={editor}
          onClose={closeContextMenu}
        />
      )}
      {/* Link URL preview tooltip — portaled to body to escape the scaled viewport */}
      {linkPreview.visible &&
        createPortal(
          <div
            className="fixed z-[9999] px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none max-w-xs truncate"
            style={{
              left: linkPreview.x + 12,
              top: linkPreview.y + 12,
            }}
          >
            {linkPreview.href}
          </div>,
          document.body
        )}
    </div>
  );
}
