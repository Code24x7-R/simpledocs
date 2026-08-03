// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Highlighter, Link } from 'lucide-react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus';

interface BubbleMenuProps {
  editor: Editor | null;
}

/**
 * BubbleMenu — floating toolbar that appears on text selection.
 *
 * Contains the most-used formatting controls for quick access
 * without moving the cursor to the main toolbar.
 */
export default function BubbleMenu({ editor }: BubbleMenuProps) {
  if (!editor) return null;

  const Button = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <TiptapBubbleMenu
      editor={editor}
      options={{
        placement: 'top-start',
      }}
      shouldShow={({ from, to, state }) => {
        // Only show when there's a non-empty selection
        return from !== to && !!state.selection;
      }}
    >
      <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1">
        <Button
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        <Button
          onClick={() => {
            const currentBg = editor.getAttributes('textStyle').backgroundColor;
            if (currentBg) {
              editor.chain().focus().unsetBackgroundColor().run();
            } else {
              editor.chain().focus().setBackgroundColor('#fef08a').run();
            }
          }}
          active={!!editor.getAttributes('textStyle').backgroundColor}
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run();
            } else {
              const url = window.prompt('Enter URL:', 'https://');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }
          }}
          active={editor.isActive('link')}
          title="Link"
        >
          <Link className="w-4 h-4" />
        </Button>
      </div>
    </TiptapBubbleMenu>
  );
}
