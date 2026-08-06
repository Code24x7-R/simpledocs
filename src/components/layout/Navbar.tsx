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
} from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import { saveDocument, openDocument, exportToMarkdown } from '../../utils/fileIO';
import { copyToClipboard, pasteFromClipboard } from '../../utils/clipboard';
import { importWordDocument } from '../../utils/wordImport';
import { formatMRUTimestamp } from '../../utils/mru';

const ZOOM_LEVELS = [
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
];

export default function Navbar() {
  const {
    docState,
    editor,
    zoom,
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
    setTableGridOpen,
    setInsertFieldOpen,
    mruList,
    addRecentFile,
  } = useDocStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);

  const handleSaveJson = () => {
    saveDocument(docState);
  };

  const handleOpenJson = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await openDocument(file);
      if (doc) {
        loadDocument(doc);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open document');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleCopy = async () => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '\n');
    if (selectedText) {
      const htmlContent = editor.view.nodeDOM(from)?.parentElement?.innerHTML ?? '';
      await copyToClipboard(selectedText, htmlContent);
    }
  };

  const handleCut = async () => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '\n');
    if (selectedText) {
      const htmlContent = editor.view.nodeDOM(from)?.parentElement?.innerHTML ?? '';
      await copyToClipboard(selectedText, htmlContent);
      editor.chain().focus().deleteSelection().run();
    }
  };

  const handlePaste = async () => {
    if (!editor) return;
    const { text, html } = await pasteFromClipboard();
    const content = html || text;
    if (content) {
      editor.chain().focus().insertContent(content).run();
    }
  };

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
    alert(`MRU: ${entry.name} (${formatMRUTimestamp(entry.timestamp)}). Use Open JSON to reopen saved documents.`);
  };

  const handleLoadDemo = async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const url = `${base}demo/Superbus-Maximus-Distracticus.json`;
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
          onClick={() => setFileMenuOpen(!fileMenuOpen)}
          className="px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-1"
        >
          File
        </button>
        {fileMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg z-50">
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
              onClick={() => { handleOpenJson(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" /> Open JSON
            </button>
            <button
              onClick={() => { handleImportWord(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FileUp className="w-4 h-4" /> Import Word
            </button>
            <button
              onClick={() => { handleSaveJson(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save JSON
            </button>
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
            <button
              onClick={() => { handlePrint(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
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
            onClick={() => setEditMenuOpen(!editMenuOpen)}
            className="px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-1"
          >
            Edit
          </button>
          {editMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50">
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
            onClick={() => setInsertMenuOpen(!insertMenuOpen)}
            className="px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-1"
          >
            Insert
          </button>
          {insertMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
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
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setViewMenuOpen(!viewMenuOpen)}
            className="px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-1"
          >
            View
          </button>
          {viewMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50">
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
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setHelpMenuOpen(!helpMenuOpen)}
            className="px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-1"
          >
            Help
          </button>
          {helpMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg z-50">
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
                href="https://code24x7-r.github.io/simplesheets/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setHelpMenuOpen(false)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> SimpleSheet
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
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
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
