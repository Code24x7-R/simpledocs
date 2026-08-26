// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useRef, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Printer,
  Keyboard,
  Info,
  Copy,
  Scissors,
  ClipboardPaste,
  FileUp,
  FileDown,
  FileSpreadsheet,
  Image,
  Link,
  Table,
  Sparkles,
  Minus,
  List,
  Volume2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
  IndentDecrease,
} from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import { useEditorClipboard } from '../../hooks/useEditorClipboard';
import { exportToMarkdown } from '../../utils/fileIO';
import { importWordDocument } from '../../utils/wordImport';
import { formatMRUTimestamp } from '../../utils/mru';
import { LINE_HEIGHTS, PARAGRAPH_SPACING } from '../../constants';
import { useDropdownKeyboard } from '../../hooks/useDropdownKeyboard';

const ZOOM_LEVELS = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
];

const ZOOM_STEP = 0.1;

export default function Navbar() {
  const {
    docState,
    editor,
    zoom,
    normalEditorMode,
    setNormalEditorMode,
    updateTitle,
    newDocument,
    loadDocument,
    setZoom,
    setPageSetupOpen,
    helpMenuOpen,
    setHelpMenuOpen,
    setAboutOpen,
    setShortcutsOpen,
    setFieldMergeOpen,
    setImageOpen,
    setDriveOpen,
    setTableGridOpen,
    setInsertFieldOpen,
    setTocOpen,
    setTtsOpen,
    mruList,
    addRecentFile,
  } = useDocStore();

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [lineHeightFlyout, setLineHeightFlyout] = useState(false);
  const [paraSpacingFlyout, setParaSpacingFlyout] = useState(false);

  // Keyboard navigation for each open dropdown (focus into menu on open,
  // arrow keys move between items, Escape closes).
  const fileMenuKb = useDropdownKeyboard(fileMenuOpen, () => setFileMenuOpen(false));
  const editMenuKb = useDropdownKeyboard(editMenuOpen, () => setEditMenuOpen(false));
  const insertMenuKb = useDropdownKeyboard(insertMenuOpen, () => setInsertMenuOpen(false));
  const layoutMenuKb = useDropdownKeyboard(layoutMenuOpen, () => setLayoutMenuOpen(false));
  const viewMenuKb = useDropdownKeyboard(viewMenuOpen, () => setViewMenuOpen(false));
  const helpMenuKb = useDropdownKeyboard(helpMenuOpen, () => setHelpMenuOpen(false));

  // --- Layout menu helpers (read active paragraph/heading attributes) ---
  const getActiveLineHeight = (): string => {
    if (!editor) return '';
    return (
      editor.getAttributes('paragraph').lineHeight ??
      editor.getAttributes('heading').lineHeight ??
      ''
    );
  };
  const getActiveIndent = (): number => {
    if (!editor) return 0;
    return (
      editor.getAttributes('paragraph').indent ??
      editor.getAttributes('heading').indent ??
      0
    );
  };
  const getActiveParagraphSpacing = (): { before: number; after: number } | null => {
    if (!editor) return null;
    return (
      editor.getAttributes('paragraph').paragraphSpacing ??
      editor.getAttributes('heading').paragraphSpacing ??
      null
    );
  };
  const isActiveAlignment = (align: string): boolean =>
    !!editor && editor.isActive({ textAlign: align });

  const { handleCopy, handleCut, handlePaste } = useEditorClipboard(editor);

  const handleExportPdf = () => {
    // Triggered via custom event - App listens for this
    window.dispatchEvent(new CustomEvent('simpledocs:export-pdf'));
  };

  const handleExportMarkdown = () => {
    if (!editor) {
      alert('Editor not available');
      return;
    }
    const html = editor.getHTML();
    if (!html || html === '<p></p>' || html === '<p>\n</p>') {
      alert('Document is empty');
      return;
    }
    // Use the document title for the filename
    const filename = docState.title || 'document';
    exportToMarkdown(html, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  // Clipboard operations use the shared hook (handleCopy/handleCut/handlePaste)

  const wordFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportWord = () => {
    wordFileInputRef.current?.click();
  };

  const handleWordFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { html, messages } = await importWordDocument(file);
      const { Editor } = await import('@tiptap/core');
      const { createExtensions } = await import('../../extensions');
      const tempEditor = new Editor({
        extensions: createExtensions(),
        content: html,
      });
      const content = tempEditor.getJSON();
      tempEditor.destroy();
      const updated = {
        ...useDocStore.getState().docState,
        content,
        updatedAt: new Date().toISOString(),
      };
      loadDocument(updated);
      addRecentFile(file.name, file.size);
      if (messages.length > 0) {
        console.warn('Word import warnings:', messages);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import Word document');
    }
    if (wordFileInputRef.current) wordFileInputRef.current.value = '';
  };

  const handleOpenMRUFile = async (entry: { name: string; timestamp: number; size: number }) => {
    // For MRU, we just show info since we don't store the actual file content
    // In a full implementation, we'd store file references via File System Access API
    alert(`MRU: ${entry.name} (${formatMRUTimestamp(entry.timestamp)}). Use File → Open to reopen saved documents.`);
  };

  const handleLoadDemo = async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const url = `${base}demo/style-showcase.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load demo file');
      const doc = await res.json();
      loadDocument(doc);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load demo');
    }
    setFileMenuOpen(false);
  };

  return (
    <nav className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 shadow-sm z-10">
      {/* Brand */}
      <div className="flex items-center shrink-0">
        <span className="font-bold text-blue-700 text-lg">SimpleDocs</span>
      </div>

      {/* Centered Menu Group */}
      <div className="flex-1 flex items-center justify-center gap-4">
        {/* File Menu */}
        <div className="relative shrink-0">
        <button
          ref={fileMenuKb.registerTrigger}
          onClick={() => setFileMenuOpen(!fileMenuOpen)}
          className="px-2 py-1 text-sm leading-5 text-gray-700 bg-transparent rounded border-none hover:bg-gray-100 flex items-center gap-1 transition-colors duration-150"
        >
          File
        </button>
        {fileMenuOpen && (
          <div ref={fileMenuKb.ref} onKeyDown={fileMenuKb.onKeyDown} className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg z-50">
            <button
              onClick={() => { newDocument(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> New
            </button>
            <button
              onClick={handleLoadDemo}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Load Demo
            </button>
            <button
              onClick={() => { setDriveOpen(true, 'save'); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={() => { setDriveOpen(true, 'open'); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" /> Open
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { handleImportWord(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FileUp className="w-4 h-4" /> Import Word
            </button>
            <div
              className="relative"
              onMouseEnter={() => setExportMenuOpen(true)}
              onMouseLeave={() => setExportMenuOpen(false)}
            >
              <button
                onClick={() => setExportMenuOpen((v) => !v)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export
                <span className="ml-auto text-gray-400">▸</span>
              </button>
              {exportMenuOpen && (
                <div className="absolute top-0 left-full ml-0.5 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                  <button
                    onClick={() => { handleExportPdf(); setFileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export PDF
                  </button>
                  <button
                    onClick={() => { handleExportMarkdown(); setFileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" /> Export Markdown
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => { handlePrint(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { setPageSetupOpen(true); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              Page Setup
            </button>
            {mruList.length > 0 && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Recent Files
                </div>
                {mruList.map((entry) => (
                  <button
                    key={entry.name + entry.timestamp}
                    onClick={() => { handleOpenMRUFile(entry); setFileMenuOpen(false); }}
                    className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-gray-700">{entry.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{formatMRUTimestamp(entry.timestamp)}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

        {/* Edit Menu */}
        <div className="relative shrink-0">
          <button
            ref={editMenuKb.registerTrigger}
            onClick={() => setEditMenuOpen(!editMenuOpen)}
            className="px-2 py-1 text-sm leading-5 text-gray-700 bg-transparent rounded border-none hover:bg-gray-100 flex items-center gap-1 transition-colors duration-150"
          >
            Edit
          </button>
          {editMenuOpen && (
            <div ref={editMenuKb.ref} onKeyDown={editMenuKb.onKeyDown} className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50">
              <button
                onClick={() => { handleCopy(); setEditMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button
                onClick={() => { handleCut(); setEditMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Scissors className="w-4 h-4" /> Cut
              </button>
              <button
                onClick={() => { handlePaste(); setEditMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <ClipboardPaste className="w-4 h-4" /> Paste
              </button>
            </div>
          )}
        </div>

        {/* Insert Menu */}
        <div className="relative shrink-0">
          <button
            ref={insertMenuKb.registerTrigger}
            onClick={() => setInsertMenuOpen(!insertMenuOpen)}
            className="px-2 py-1 text-sm leading-5 text-gray-700 bg-transparent rounded border-none hover:bg-gray-100 flex items-center gap-1 transition-colors duration-150"
          >
            Insert
          </button>
          {insertMenuOpen && (
            <div ref={insertMenuKb.ref} onKeyDown={insertMenuKb.onKeyDown} className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
              <button
                onClick={() => { setImageOpen(true); setInsertMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Image className="w-4 h-4" /> Image
              </button>
              <button
                onClick={() => {
                  // Dispatch event so App.tsx handler populates modal state
                  // (current link URL + selected text) before opening
                  setInsertMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('simpledocs:open-link'));
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Link className="w-4 h-4" /> Link
              </button>
              <button
                onClick={() => { setTableGridOpen(true); setInsertMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Table className="w-4 h-4" /> Table
              </button>
              <button
                onClick={() => { setInsertFieldOpen(true); setInsertMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Field
              </button>
              <button
                onClick={() => { setTocOpen(true); setInsertMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <List className="w-4 h-4" /> Table of Contents
              </button>
              <button
                onClick={() => { setFieldMergeOpen(true); setInsertMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Merge Fields
              </button>
              <button
                onClick={() => { editor?.chain().focus().setPageBreak().run(); setInsertMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Minus className="w-4 h-4 rotate-90" /> Page Break
              </button>
              <button
                onClick={() => { setTtsOpen(true); setInsertMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" /> Read Aloud
              </button>
            </div>
          )}
        </div>

        {/* Layout Menu */}
        <div className="relative shrink-0">
          <button
            ref={layoutMenuKb.registerTrigger}
            onClick={() => setLayoutMenuOpen(!layoutMenuOpen)}
            className="px-2 py-1 text-sm leading-5 text-gray-700 bg-transparent rounded border-none hover:bg-gray-100 flex items-center gap-1 transition-colors duration-150"
          >
            Layout
          </button>
          {layoutMenuOpen && (
            <div ref={layoutMenuKb.ref} onKeyDown={layoutMenuKb.onKeyDown} className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-lg z-50">
              {/* Alignment */}
              <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Alignment
              </div>
              <div className="flex items-center gap-1 px-3 pb-2">
                {([
                  { align: 'left', icon: AlignLeft, label: 'Align Left' },
                  { align: 'center', icon: AlignCenter, label: 'Align Center' },
                  { align: 'right', icon: AlignRight, label: 'Align Right' },
                  { align: 'justify', icon: AlignJustify, label: 'Justify' },
                ] as const).map(({ align, icon: Icon, label }) => (
                  <button
                    key={align}
                    onClick={() => { editor?.chain().focus().setTextAlign(align).run(); setLayoutMenuOpen(false); }}
                    title={label}
                    aria-pressed={isActiveAlignment(align)}
                    className={`p-1.5 rounded transition-colors ${
                      isActiveAlignment(align)
                        ? 'bg-blue-600 text-white shadow-inner ring-1 ring-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 my-1" />
              {/* Spacing — collapsible flyout rows */}
              <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Spacing
              </div>
              <div
                className="relative"
                onMouseEnter={() => setLineHeightFlyout(true)}
                onMouseLeave={() => setLineHeightFlyout(false)}
              >
                <button
                  onClick={() => setLineHeightFlyout((v) => !v)}
                  className="w-full flex items-center justify-between text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <span>Line Height</span>
                  <span className="text-xs text-gray-400">{getActiveLineHeight() || 'Default'} ›</span>
                </button>
                {lineHeightFlyout && (
                  <div className="absolute top-0 left-full ml-0 w-44 bg-white border border-gray-200 rounded shadow-lg z-50">
                    {LINE_HEIGHTS.map((lh) => (
                      <button
                        key={lh.value}
                        onClick={() => {
                          if (lh.value === '') {
                            editor?.chain().focus().unsetLineHeight().run();
                          } else {
                            editor?.chain().focus().setLineHeight(lh.value).run();
                          }
                          setLineHeightFlyout(false);
                          setLayoutMenuOpen(false);
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
              <div
                className="relative"
                onMouseEnter={() => setParaSpacingFlyout(true)}
                onMouseLeave={() => setParaSpacingFlyout(false)}
              >
                <button
                  onClick={() => setParaSpacingFlyout((v) => !v)}
                  className="w-full flex items-center justify-between text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <span>Paragraph Spacing</span>
                  <span className="text-xs text-gray-400">›</span>
                </button>
                {paraSpacingFlyout && (
                  <div className="absolute top-0 left-full ml-0 w-44 bg-white border border-gray-200 rounded shadow-lg z-50">
                    {PARAGRAPH_SPACING.map((ps) => {
                      const activePs = getActiveParagraphSpacing();
                      const isActive = activePs?.before === ps.before && activePs?.after === ps.after;
                      return (
                        <button
                          key={ps.label}
                          onClick={() => {
                            if (ps.before === 0 && ps.after === 0) {
                              editor?.chain().focus().unsetParagraphSpacing().run();
                            } else {
                              editor?.chain().focus().setParagraphSpacing({ before: ps.before, after: ps.after }).run();
                            }
                            setParaSpacingFlyout(false);
                            setLayoutMenuOpen(false);
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
              <div className="border-t border-gray-100 my-1" />
              {/* Indent / Outdent */}
              <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                <button
                  onClick={() => { editor?.chain().focus().increaseIndent().run(); setLayoutMenuOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded hover:bg-gray-100"
                  title="Increase Indent"
                >
                  <IndentIncrease className="w-4 h-4" /> Indent
                </button>
                <button
                  onClick={() => { editor?.chain().focus().decreaseIndent().run(); setLayoutMenuOpen(false); }}
                  disabled={getActiveIndent() === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Decrease Indent"
                >
                  <IndentDecrease className="w-4 h-4" /> Outdent
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative shrink-0">
          <button
            ref={viewMenuKb.registerTrigger}
            onClick={() => setViewMenuOpen(!viewMenuOpen)}
            className="px-2 py-1 text-sm leading-5 text-gray-700 bg-transparent rounded border-none hover:bg-gray-100 flex items-center gap-1 transition-colors duration-150"
          >
            View
          </button>
          {viewMenuOpen && (
            <div ref={viewMenuKb.ref} onKeyDown={viewMenuKb.onKeyDown} className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg z-50">
              <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Zoom
              </div>
              {ZOOM_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => { setZoom(level.value); setViewMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    zoom === level.value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : ''
                  }`}
                >
                  {level.label}
                </button>
              ))}
              <div className="border-t border-gray-100 my-1" />
              <div className="flex items-center justify-between px-4 py-1">
                <span className="text-xs text-gray-500">Zoom</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setZoom(Math.max(0.5, +(zoom - ZOOM_STEP).toFixed(2))); setViewMenuOpen(false); }}
                    className="w-6 h-6 text-xs rounded hover:bg-gray-200 flex items-center justify-center"
                    title="Zoom out"
                  >
                    −
                  </button>
                  <span className="text-xs text-gray-600 w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => { setZoom(Math.min(2, +(zoom + ZOOM_STEP).toFixed(2))); setViewMenuOpen(false); }}
                    className="w-6 h-6 text-xs rounded hover:bg-gray-200 flex items-center justify-center"
                    title="Zoom in"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setNormalEditorMode(true); setViewMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                  {normalEditorMode && (
                    <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                Normal Editor
              </button>
              <button
                onClick={() => { setNormalEditorMode(false); setViewMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                  {!normalEditorMode && (
                    <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                Paginated Editor
              </button>
              <button
                onClick={() => {
                  const { updateSettings, docState } = useDocStore.getState();
                  updateSettings({ defaultNormalEditorMode: !docState.settings.defaultNormalEditorMode });
                  setViewMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-4 h-4 inline-flex items-center justify-center shrink-0">
                  {docState.settings.defaultNormalEditorMode && (
                    <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                Launch with Normal Editor by Default
              </button>
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div className="relative shrink-0">
          <button
            ref={helpMenuKb.registerTrigger}
            onClick={() => setHelpMenuOpen(!helpMenuOpen)}
            className="px-2 py-1 text-sm leading-5 text-gray-700 bg-transparent rounded border-none hover:bg-gray-100 flex items-center gap-1 transition-colors duration-150"
          >
            Help
          </button>
          {helpMenuOpen && (
            <div ref={helpMenuKb.ref} onKeyDown={helpMenuKb.onKeyDown} className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg z-50">
              <button
                onClick={() => { setShortcutsOpen(true); setHelpMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
              </button>
              <button
                onClick={() => { setAboutOpen(true); setHelpMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Info className="w-4 h-4" /> About simpledocs
              </button>
              <div className="border-t border-gray-100 my-1" />
              <a
                href="https://simplesheets.mouseclick.au"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setHelpMenuOpen(false)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> SimpleSheets
              </a>
            </div>
          )}
        </div>
      </div>{/* End centered menu group */}

      {/* Title / Filename */}
      <input
        type="text"
        value={docState.title}
        onChange={(e) => updateTitle(e.target.value)}
        className="w-56 text-sm border border-gray-200 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
        placeholder="Document Title"
      />

      <input
        ref={wordFileInputRef}
        type="file"
        accept=".docx"
        onChange={handleWordFileChange}
        className="hidden"
      />
    </nav>
  );
}
