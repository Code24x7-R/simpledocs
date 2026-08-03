// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { createExtensions } from '../../extensions';
import { useDocStore } from '../../store/useDocStore';

/**
 * DocumentEditor — single Tiptap instance for the entire document.
 *
 * The Google Docs approach: one editor, one content tree. Pages are
 * visual guides rendered by PaginatedViewport — content flows naturally.
 */
export default function DocumentEditor() {
  const { docState, updateContent, setEditor } = useDocStore();
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: createExtensions(),
    content: docState.content,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
      handleKeyDown(_view, event) {
        // Ctrl+Enter → insert page break
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (editor) {
            editor.chain().focus().setPageBreak().run();
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateContent(ed.getJSON());
    },
  });

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
      <EditorContent editor={editor} />
    </div>
  );
}
