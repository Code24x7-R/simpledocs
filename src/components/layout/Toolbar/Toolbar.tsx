// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
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
  IndentIncrease,
  IndentDecrease,
  WrapText,
  Rows,
} from 'lucide-react';
import { useDocStore } from '../../../store/useDocStore';
import { copyToClipboard, pasteFromClipboard } from '../../../utils/clipboard';

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

const LINE_HEIGHTS = [
  { label: 'Default', value: '' },
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3' },
];

const PARAGRAPH_SPACING = [
  { label: 'Default', before: 0, after: 0 },
  { label: '0pt / 0pt', before: 0, after: 0 },
  { label: '6pt / 6pt', before: 8, after: 8 },
  { label: '12pt / 12pt', before: 16, after: 16 },
  { label: '18pt / 18pt', before: 24, after: 24 },
  { label: '12pt / 6pt', before: 16, after: 8 },
  { label: '6pt / 12pt', before: 8, after: 16 },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', // Yellows
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', // Greens
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', // Blues (light blue included)
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', // Indigos
  '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', // Reds
  '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', // Purples
  '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', // Oranges
];



export default function Toolbar() {
  const { editor, setSearchReplaceOpen, setChatOpen, chatOpen } = useDocStore();
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [lineHeightDropdownOpen, setLineHeightDropdownOpen] = useState(false);
  const [paragraphSpacingDropdownOpen, setParagraphSpacingDropdownOpen] = useState(false);



  if (!editor) return null;

  const isActive = (mark: string) => editor.isActive(mark);
  const isHeading = (level: number) => editor.isActive('heading', { level });

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

  // Get the active line height from the current paragraph/heading
  const getActiveLineHeight = (): string => {
    const lh = editor.getAttributes('paragraph').lineHeight
      ?? editor.getAttributes('heading').lineHeight
      ?? null;
    return lh || '';
  };

  // Get the active indent from the current paragraph/heading
  const getActiveIndent = (): number => {
    return editor.getAttributes('paragraph').indent
      ?? editor.getAttributes('heading').indent
      ?? 0;
  };

  // Get the active paragraph spacing from the current paragraph/heading
  const getActiveParagraphSpacing = (): { before: number; after: number } | null => {
    return editor.getAttributes('paragraph').paragraphSpacing
      ?? editor.getAttributes('heading').paragraphSpacing
      ?? null;
  };

  // Clipboard handlers
  const handleCopy = async () => {
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '\n');
    const selectedHtml = editor.state.doc.slice(from, to).content;
    const htmlContent = selectedHtml.content?.length
      ? editor.view.nodeDOM(from)?.parentElement?.innerHTML ?? ''
      : '';
    if (selectedText) {
      await copyToClipboard(selectedText, htmlContent);
    }
  };

  const handleCut = async () => {
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '\n');
    if (selectedText) {
      const selectedHtml = editor.view.nodeDOM(from)?.parentElement?.innerHTML ?? '';
      await copyToClipboard(selectedText, selectedHtml);
      editor.chain().focus().deleteSelection().run();
    }
  };

  const handlePaste = async () => {
    const { text, html } = await pasteFromClipboard();
    const content = html || text;
    if (content) {
      editor.chain().focus().insertContent(content).run();
    }
  };

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
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  return (
    <div className="h-auto min-h-10 bg-white border-b border-gray-200 flex items-center px-3 gap-0.5 flex-wrap shrink-0 py-1">
      {/* Style Dropdown */}
      <div className="relative">
        <button
          onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
        >
          Style <ChevronDown className="w-3 h-3" />
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

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Font Family */}
      <div className="relative">
        <button
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

      {/* Format Menu */}
      <div className="relative">
        <button
          onClick={() => setFormatMenuOpen(!formatMenuOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
        >
          <Paintbrush className="w-4 h-4" />
          Format <ChevronDown className="w-3 h-3" />
        </button>
        {formatMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-50">
            {/* Text Style */}
            <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Text Style
            </div>
            <button
              onClick={() => { editor.chain().focus().toggleBold().run(); setFormatMenuOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                isActive('bold') ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}
            >
              <Bold className="w-4 h-4" /> Bold
            </button>
            <button
              onClick={() => { editor.chain().focus().toggleItalic().run(); setFormatMenuOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                isActive('italic') ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}
            >
              <Italic className="w-4 h-4" /> Italic
            </button>
            <button
              onClick={() => { editor.chain().focus().toggleUnderline().run(); setFormatMenuOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                isActive('underline') ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}
            >
              <Underline className="w-4 h-4" /> Underline
            </button>
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

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Line Height */}
      <div className="relative">
        <button
          onClick={() => setLineHeightDropdownOpen(!lineHeightDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
          title="Line Spacing"
        >
          <Rows className="w-4 h-4" />
          <span className="text-xs">{LINE_HEIGHTS.find((lh) => lh.value === getActiveLineHeight())?.label ?? 'Spacing'}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {lineHeightDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-50">
            {LINE_HEIGHTS.map((lh) => (
              <button
                key={lh.value}
                onClick={() => {
                  if (lh.value === '') {
                    editor.chain().focus().unsetLineHeight().run();
                  } else {
                    editor.chain().focus().setLineHeight(lh.value).run();
                  }
                  setLineHeightDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  getActiveLineHeight() === lh.value ? 'bg-blue-50 text-blue-700 font-medium' : ''
                }`}
              >
                {lh.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Indent / Outdent */}
      <Button
        onClick={() => editor.chain().focus().increaseIndent().run()}
        title="Increase Indent"
      >
        <IndentIncrease className="w-4 h-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().decreaseIndent().run()}
        disabled={getActiveIndent() === 0}
        title="Decrease Indent"
      >
        <IndentDecrease className="w-4 h-4" />
      </Button>

      {/* Paragraph Spacing */}
      <div className="relative">
        <button
          onClick={() => setParagraphSpacingDropdownOpen(!paragraphSpacingDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
          title="Paragraph Spacing"
        >
          <WrapText className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </button>
        {paragraphSpacingDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50">
            {PARAGRAPH_SPACING.map((ps) => {
              const isActive = getActiveParagraphSpacing()?.before === ps.before && getActiveParagraphSpacing()?.after === ps.after;
              return (
                <button
                  key={ps.label}
                  onClick={() => {
                    if (ps.before === 0 && ps.after === 0) {
                      editor.chain().focus().unsetParagraphSpacing().run();
                    } else {
                      editor.chain().focus().setParagraphSpacing({ before: ps.before, after: ps.after }).run();
                    }
                    setParagraphSpacingDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    isActive ? 'bg-blue-50 text-blue-700 font-medium' : ''
                  }`}
                >
                  {ps.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1" />

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

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Alignment */}
      <Button onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
        <AlignLeft className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
        <AlignCenter className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
        <AlignRight className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
        <AlignJustify className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

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

      <div className="w-px h-6 bg-gray-200 mx-1" />

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

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Tools */}
      <Button onClick={() => setSearchReplaceOpen(true)} title="Search & Replace">
        <Search className="w-4 h-4" />
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
