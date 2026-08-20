// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Link, Palette } from 'lucide-react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus';
import { TEXT_COLORS, HIGHLIGHT_COLORS } from '../../constants';

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
            // Dispatch event to open the link modal (same path as Ctrl+K)
            window.dispatchEvent(new CustomEvent('simpledocs:open-link'));
          }}
          active={editor.isActive('link')}
          title="Link (Ctrl+K)"
        >
          <Link className="w-4 h-4" />
        </Button>
      </div>
    </TiptapBubbleMenu>
  );
}
