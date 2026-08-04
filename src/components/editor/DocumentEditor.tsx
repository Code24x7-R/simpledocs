// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEditor, EditorContent } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createExtensions } from '../../extensions';
import { useDocStore } from '../../store/useDocStore';
import TableContextMenu from './TableContextMenu';
import EditorBubbleMenu from './BubbleMenu';

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

  const editor = useEditor({
    extensions: createExtensions(),
    content: docState.content,
    editorProps: {
      attributes: {
        class: 'tiptap',
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
    <div ref={editorRef} className="document-editor">
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
    </div>
  );
}
