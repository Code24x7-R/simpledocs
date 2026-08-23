// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Type,
  ChevronDown,
  Copy,
  ClipboardPaste,
  Scissors,
  Search,
  MessageSquare,
  Undo,
  Redo,
  RemoveFormatting,
  Paintbrush,
  Volume2,
} from 'lucide-react';
import { useDocStore } from '../../../store/useDocStore';
import { useEditorClipboard } from '../../../hooks/useEditorClipboard';
import { TEXT_COLORS, HIGHLIGHT_COLORS } from '../../../constants';

const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Helvetica',
];

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

const HEADING_STYLES = [
  { label: 'Normal', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
  { label: 'Heading 5', value: 'h5' },
  { label: 'Heading 6', value: 'h6' },
];

export default function Toolbar() {
  const { editor, setSearchReplaceOpen, setChatOpen, chatOpen, setTtsOpen } = useDocStore();
  const { handleCopy, handleCut, handlePaste } = useEditorClipboard(editor);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);

  // Any dropdown open suspends the toolbar's arrow-key navigation so the
  // dropdown owns the keys instead.
  const anyDropdownOpen = styleDropdownOpen || fontDropdownOpen || sizeDropdownOpen || formatMenuOpen;

  // ---- Roving tabindex (ARIA toolbar pattern) ----------------------------
  // The toolbar is a SINGLE tab stop; arrow keys move focus between buttons.
  // `focusIndex` tracks which button currently has tabIndex={0}; all others
  // have tabIndex={-1}. Tab / Shift+Tab leave the toolbar entirely.
  const [focusIndex, setFocusIndex] = useState(0);

  const handleToolbarKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (anyDropdownOpen) return; // dropdown owns the keys
      // Query the buttons live from the DOM via the event target so the list
      // is always current regardless of React's render timing.
      const toolbar = e.currentTarget as HTMLElement;
      const buttons = Array.from(
        toolbar.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
      );
      const active = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      if (active === -1) return;
      const len = buttons.length;
      let next = active;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          next = (active + 1) % len;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          next = (active - 1 + len) % len;
          break;
        case 'Home':
          e.preventDefault();
          next = 0;
          break;
        case 'End':
          e.preventDefault();
          next = len - 1;
          break;
        default:
          return;
      }
      setFocusIndex(next);
      buttons[next]?.focus();
    },
    [anyDropdownOpen],
  );

  // Give a button the roving tabindex: only the focused button is in the
  // tab order (tabIndex 0); the rest are programmatically focusable (-1).
  const registerButton = useCallback(
    (index: number) => ({
      tabIndex: index === focusIndex ? 0 : -1,
      onFocus: () => setFocusIndex(index),
    }),
    [focusIndex],
  );

  if (!editor) return null;

  const isActive = (mark: string) => editor.isActive(mark);
  const isHeading = (level: number) => editor.isActive('heading', { level });

  // Resolve the active paragraph/heading label for the Style dropdown button.
  const getActiveStyle = (): string => {
    for (let level = 1; level <= 6; level++) {
      if (isHeading(level)) return `Heading ${level}`;
    }
    return 'Normal';
  };

  // Get the font size from the current selection using Tiptap's isActive
  const getActiveFontSize = (): string | null => {
    const foundSize = editor.getAttributes('textStyle').fontSize;
    if (foundSize) {
      return foundSize.replace(/px$/, '');
    }
    return null;
  };

  // Get the font family from the current selection using Tiptap's isActive
  const getActiveFontFamily = (): string | null => {
    const foundFont = editor.getAttributes('textStyle').fontFamily;
    return foundFont || null;
  };

  let idx = 0; // running index assigned to each toolbar button in DOM order

  const Button = ({
    onClick,
    active,
    disabled,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => {
    const i = idx++;
    return (
      <button
        {...registerButton(i)}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-pressed={active}
        className={`p-1.5 rounded transition-colors ${
          active
            ? 'bg-blue-600 text-white shadow-inner ring-1 ring-blue-700'
            : 'hover:bg-gray-100 text-gray-700'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {children}
      </button>
    );
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="h-auto min-h-10 bg-white border-b border-gray-200 flex items-center px-3 gap-0.5 flex-wrap shrink-0 py-1"
      onKeyDown={handleToolbarKeyDown}
    >
      {/* Style Dropdown */}
      <div className="relative">
        <button
          {...registerButton(idx++)}
          onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
        >
          {getActiveStyle()} <ChevronDown className="w-3 h-3" />
        </button>
        {styleDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
            {HEADING_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() => {
                  if (style.value === 'paragraph') {
                    editor.chain().focus().setParagraph().run();
                  } else {
                    editor.chain().focus().toggleHeading({ level: parseInt(style.value[1]) as 1 | 2 | 3 }).run();
                  }
                  setStyleDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  (style.value === 'paragraph' && editor.isActive('paragraph')) ||
                  (style.value.startsWith('h') && isHeading(parseInt(style.value[1])))
                    ? 'bg-blue-50 text-blue-700'
                    : ''
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />

      {/* Font Family */}
      <div className="relative">
        <button
          {...registerButton(idx++)}
          onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 min-w-[120px]"
        >
          <Type className="w-3 h-3" />
          <span className="truncate">{getActiveFontFamily() || 'Font'}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {fontDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {/* Default option */}
            <button
              onClick={() => {
                editor.chain().focus().unsetFontFamily().run();
                setFontDropdownOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 ${
                !getActiveFontFamily() ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500'
              }`}
            >
              Default
            </button>
            {FONT_FAMILIES.map((font) => {
              const isFontActive = editor.isActive('textStyle', { fontFamily: font });
              return (
                <button
                  key={font}
                  onClick={() => {
                    editor.chain().focus().setFontFamily(font).run();
                    setFontDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    isFontActive ? 'bg-blue-100 text-blue-700 font-medium' : ''
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Font Size */}
      <div className="relative">
        <button
          {...registerButton(idx++)}
          onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 min-w-[60px]"
        >
          {getActiveFontSize() || 'Size'} <ChevronDown className="w-3 h-3" />
        </button>
        {sizeDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-20 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {/* Default option to unset font size */}
            <button
              onClick={() => {
                editor.chain().focus().unsetFontSize().run();
                setSizeDropdownOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 ${
                !getActiveFontSize() ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500'
              }`}
            >
              Default
            </button>
            {FONT_SIZES.map((size) => {
              const isActive = editor.isActive('textStyle', { fontSize: `${size}px` });
              return (
                <button
                  key={size}
                  onClick={() => {
                    editor.chain().focus().setFontSize(`${size}px`).run();
                    setSizeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    isActive ? 'bg-blue-100 text-blue-700 font-medium' : ''
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Text Style toggles */}
      <Button onClick={() => editor.chain().focus().toggleBold().run()} active={isActive('bold')} title="Bold (Ctrl+B)">
        <Bold className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} active={isActive('italic')} title="Italic (Ctrl+I)">
        <Italic className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleUnderline().run()} active={isActive('underline')} title="Underline (Ctrl+U)">
        <Underline className="w-4 h-4" />
      </Button>

      {/* Format Menu */}
      <div className="relative">
        <button
          {...registerButton(idx++)}
          onClick={() => setFormatMenuOpen(!formatMenuOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
        >
          <Paintbrush className="w-4 h-4" />
          Format <ChevronDown className="w-3 h-3" />
        </button>
        {formatMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-50">
            <button
              onClick={() => { editor.chain().focus().toggleStrike().run(); setFormatMenuOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                isActive('strike') ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}
            >
              <Strikethrough className="w-4 h-4" /> Strikethrough
            </button>
            <button
              onClick={() => { editor.chain().focus().unsetAllMarks().run(); setFormatMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <RemoveFormatting className="w-4 h-4" /> Clear Formatting
            </button>
            <div className="border-t border-gray-100 my-1" />
            {/* Text Colour */}
            <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Text Colour
            </div>
            <div className="px-3 pb-2 grid grid-cols-7 gap-1.5">
              {TEXT_COLORS.map((color) => {
                const isActive = editor.isActive('textStyle', { color });
                return (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setFormatMenuOpen(false);
                    }}
                    className={`w-6 h-6 rounded border-2 hover:scale-110 transition-all ${
                      isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                );
              })}
            </div>
            <button
              onClick={() => { editor.chain().focus().unsetColor().run(); setFormatMenuOpen(false); }}
              className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 text-gray-600"
            >
              Default (no colour)
            </button>
            <div className="border-t border-gray-100 my-1" />
            {/* Highlight */}
            <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Highlight
            </div>
            <div className="px-3 pb-2 grid grid-cols-7 gap-1.5">
              {HIGHLIGHT_COLORS.map((color) => {
                const isActive = editor.isActive('textStyle', { backgroundColor: color });
                return (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setBackgroundColor(color).run();
                      setFormatMenuOpen(false);
                    }}
                    className={`w-6 h-6 rounded border-2 hover:scale-110 transition-all ${
                      isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                );
              })}
            </div>
            <button
              onClick={() => { editor.chain().focus().unsetBackgroundColor().run(); setFormatMenuOpen(false); }}
              className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 text-gray-600"
            >
              None (remove highlight)
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />

      {/* Clipboard */}
      <Button onClick={handleCopy} title="Copy">
        <Copy className="w-4 h-4" />
      </Button>
      <Button onClick={handleCut} title="Cut">
        <Scissors className="w-4 h-4" />
      </Button>
      <Button onClick={handlePaste} title="Paste">
        <ClipboardPaste className="w-4 h-4" />
      </Button>

      {/* Undo / Redo */}
      <Button onClick={() => editor.chain().focus().undo().run()} disabled={!editor?.can()?.undo()} title="Undo (Ctrl+Z)">
        <Undo className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().redo().run()} disabled={!editor?.can()?.redo()} title="Redo (Ctrl+Y)">
        <Redo className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />

      {/* Lists */}
      <Button onClick={() => editor.chain().focus().toggleBulletList().run()} active={isActive('bulletList')} title="Bullet List">
        <List className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} active={isActive('orderedList')} title="Numbered List">
        <ListOrdered className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleList('taskList', 'taskItem').run()} active={isActive('taskList')} title="Task List">
        <CheckSquare className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />

      {/* Blocks */}
      <Button onClick={() => editor.chain().focus().toggleBlockquote().run()} active={isActive('blockquote')} title="Blockquote">
        <Quote className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={isActive('codeBlock')} title="Code Block">
        <Code className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />

      {/* Tools */}
      <Button onClick={() => setSearchReplaceOpen(true)} title="Search & Replace">
        <Search className="w-4 h-4" />
      </Button>
      <Button
        onClick={() => setTtsOpen(true)}
        title="Text-to-Speech (Ctrl+Shift+T)"
      >
        <Volume2 className="w-4 h-4" />
      </Button>
      <Button
        onClick={() => setChatOpen(!chatOpen)}
        active={chatOpen}
        title="Toggle Chat"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>
    </div>
  );
}
