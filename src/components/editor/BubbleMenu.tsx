// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Link, Palette } from 'lucide-react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus';

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', // Yellows
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', // Greens
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', // Blues
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', // Indigos
  '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', // Reds
  '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', // Purples
  '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', // Oranges
];

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
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-color-picker]')) {
        setColorPickerOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColorPickerOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [colorPickerOpen]);

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
      shouldShow={({ from, to, state, editor: ed }) => {
        // Show when there's a non-empty selection...
        if (from !== to && !!state.selection) return true;
        // ...or when the cursor is inside a link (allows editing/removing links)
        return ed.isActive('link');
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

        <div className="relative" data-color-picker>
          <Button
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            active={!!editor.getAttributes('textStyle').backgroundColor || !!editor.getAttributes('textStyle').color}
            title="Text Colour / Highlight"
          >
            <Palette className="w-4 h-4" />
          </Button>
          {colorPickerOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
              {/* Text Colour */}
              <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Text Colour
              </div>
              <div className="px-1 pb-2 grid grid-cols-7 gap-1">
                {TEXT_COLORS.map((color) => {
                  const isActive = editor.isActive('textStyle', { color });
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setColorPickerOpen(false);
                      }}
                      className={`w-5 h-5 rounded border-2 hover:scale-110 transition-all ${
                        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  );
                })}
              </div>
              <div className="px-2 py-1">
                <button
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setColorPickerOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-50 text-gray-600 rounded"
                >
                  Default (no colour)
                </button>
              </div>
              <div className="border-t border-gray-100 my-1" />
              {/* Highlight */}
              <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Highlight
              </div>
              <div className="px-1 pb-2 grid grid-cols-7 gap-1">
                {HIGHLIGHT_COLORS.map((color) => {
                  const isActive = editor.isActive('textStyle', { backgroundColor: color });
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setBackgroundColor(color).run();
                        setColorPickerOpen(false);
                      }}
                      className={`w-5 h-5 rounded border-2 hover:scale-110 transition-all ${
                        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  );
                })}
              </div>
              <button
                onClick={() => {
                  editor.chain().focus().unsetBackgroundColor().run();
                  setColorPickerOpen(false);
                }}
                className="w-full text-left px-2 py-1 text-xs hover:bg-gray-50 text-gray-600 rounded"
              >
                None (remove highlight)
              </button>
            </div>
          )}
        </div>
        <Button
          onClick={() => {
            if (editor.isActive('link')) {
              // Cursor is on a link — prompt to edit the URL (or cancel to keep)
              const currentUrl = editor.getAttributes('link').href || '';
              const url = window.prompt('Edit URL (leave empty to remove):', currentUrl);
              if (url === null) return; // cancelled — keep existing link
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              } else {
                editor.chain().focus().unsetLink().run();
              }
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
