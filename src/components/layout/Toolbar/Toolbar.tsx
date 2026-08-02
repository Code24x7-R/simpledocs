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
  Palette,
  Highlighter,
  Table,
  Sparkles,
  ChevronDown,
  Copy,
  ClipboardPaste,
  Scissors,
  Search,
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
  { label: 'Subtitle', value: 'subtitle' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const HIGHLIGHT_COLORS = [
  '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900', '#ff0000', '#0000ff',
  '#99ff99', '#99ffff', '#ff99ff', '#ffcc99', '#ff9999', '#9999ff',
];

export default function Toolbar() {
  const { editor, setTableGridOpen, setInsertFieldOpen, setSearchReplaceOpen } = useDocStore();
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [textColorDropdownOpen, setTextColorDropdownOpen] = useState(false);
  const [highlightColorDropdownOpen, setHighlightColorDropdownOpen] = useState(false);

  if (!editor) return null;

  const isActive = (mark: string) => editor.isActive(mark);
  const isHeading = (level: number) => editor.isActive('heading', { level });

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
                  } else if (style.value === 'subtitle') {
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
          <span className="truncate">Font</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {fontDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {FONT_FAMILIES.map((font) => (
              <button
                key={font}
                onClick={() => {
                  // Tiptap doesn't have native font family in StarterKit; use textStyle
                  editor.chain().focus().setFontFamily(font).run();
                  setFontDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                style={{ fontFamily: font }}
              >
                {font}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Size */}
      <div className="relative">
        <button
          onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 min-w-[60px]"
        >
          Size <ChevronDown className="w-3 h-3" />
        </button>
        {sizeDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-20 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => {
                  editor.chain().focus().setFontSize(size).run();
                  setSizeDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Text Formatting */}
      <Button onClick={() => editor.chain().focus().toggleBold().run()} active={isActive('bold')} title="Bold">
        <Bold className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} active={isActive('italic')} title="Italic">
        <Italic className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleUnderline().run()} active={isActive('underline')} title="Underline">
        <Underline className="w-4 h-4" />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleStrike().run()} active={isActive('strike')} title="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </Button>

      {/* Clipboard */}
      <div className="relative group">
        <button className="p-1.5 rounded hover:bg-gray-100 flex items-center gap-0.5" title="Copy" onClick={handleCopy}>
          <Copy className="w-4 h-4" />
        </button>
      </div>
      <div className="relative group">
        <button className="p-1.5 rounded hover:bg-gray-100 flex items-center gap-0.5" title="Cut" onClick={handleCut}>
          <Scissors className="w-4 h-4" />
        </button>
      </div>
      <div className="relative group">
        <button className="p-1.5 rounded hover:bg-gray-100 flex items-center gap-0.5" title="Paste" onClick={handlePaste}>
          <ClipboardPaste className="w-4 h-4" />
        </button>
      </div>

      {/* Text Color */}
      <div className="relative">
        <button
          onClick={() => setTextColorDropdownOpen(!textColorDropdownOpen)}
          className="p-1.5 rounded hover:bg-gray-100 flex items-center gap-0.5"
          title="Text Color"
        >
          <Palette className="w-4 h-4" />
          <div className="w-3 h-0.5 bg-red-500 rounded" />
        </button>
        {textColorDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 grid grid-cols-10 gap-0.5 p-2 bg-white border border-gray-200 rounded shadow-lg z-50 w-[220px]">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  editor.chain().focus().setColor(color).run();
                  setTextColorDropdownOpen(false);
                }}
                className="w-4 h-4 rounded border border-gray-200 hover:scale-125 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlight Color */}
      <div className="relative">
        <button
          onClick={() => setHighlightColorDropdownOpen(!highlightColorDropdownOpen)}
          className="p-1.5 rounded hover:bg-gray-100 flex items-center gap-0.5"
          title="Highlight Color"
        >
          <Highlighter className="w-4 h-4" />
          <div className="w-3 h-0.5 bg-yellow-400 rounded" />
        </button>
        {highlightColorDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 grid grid-cols-7 gap-0.5 p-2 bg-white border border-gray-200 rounded shadow-lg z-50">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color }).run();
                  setHighlightColorDropdownOpen(false);
                }}
                className="w-4 h-4 rounded border border-gray-200 hover:scale-125 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

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

      {/* Table */}
      <Button onClick={() => setTableGridOpen(true)} title="Insert Table">
        <Table className="w-4 h-4" />
      </Button>

      {/* Insert Field */}
      <Button onClick={() => setInsertFieldOpen(true)} title="Insert Field">
        <Sparkles className="w-4 h-4" />
      </Button>

      {/* Page Break */}
      <Button onClick={() => editor.chain().focus().setPageBreak().run()} title="Page Break (Ctrl+Enter)">
        <Minus className="w-4 h-4 rotate-90" />
      </Button>

      {/* Search & Replace */}
      <Button onClick={() => setSearchReplaceOpen(true)} title="Search & Replace">
        <Search className="w-4 h-4" />
      </Button>
    </div>
  );
}
