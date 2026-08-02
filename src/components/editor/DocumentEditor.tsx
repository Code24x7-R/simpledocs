// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import { useDocStore } from '../../store/useDocStore';
import { createExtensions } from '../../extensions';

/**
 * Document Editor
 *
 * Single Tiptap instance holding ALL document content.
 * Content flows continuously - pagination is handled visually by the viewport.
 */
export default function DocumentEditor() {
  const { docState, setEditor, updateContent } = useDocStore();

  const editor = useEditor({
    extensions: createExtensions(),
    content: docState.content,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateContent(ed.getJSON());
    },
  });

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  useEffect(() => {
    if (editor && docState.content) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(docState.content)) {
        editor.commands.setContent(docState.content, { emitUpdate: false });
      }
    }
  }, [docState.content, editor]);

  return (
    <div id="tiptap-editor" className="min-h-full">
      <EditorContent editor={editor} />
    </div>
  );
}
