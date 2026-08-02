import { useRef, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Printer,
  Undo2,
  Redo2,

} from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import { saveDocument, openDocument } from '../../utils/fileIO';

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
  } = useDocStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

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
        if (editor) {
          editor.commands.setContent(doc.content);
        }
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <nav className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0 shadow-sm z-10">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <FileText className="w-5 h-5 text-blue-600" />
        <span className="font-bold text-gray-800 text-lg">simpledocs</span>
      </div>

      {/* Title */}
      <input
        type="text"
        value={docState.title}
        onChange={(e) => updateTitle(e.target.value)}
        className="flex-1 max-w-md mx-auto text-center text-sm border border-gray-200 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
        placeholder="Document Title"
      />

      {/* File Menu */}
      <div className="relative shrink-0">
        <button
          onClick={() => setFileMenuOpen(!fileMenuOpen)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-1"
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
              onClick={() => { handleOpenJson(); setFileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" /> Open JSON
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
          </div>
        )}
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => editor?.commands.undo()}
          disabled={!editor?.can().undo()}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.commands.redo()}
          disabled={!editor?.can().redo()}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 shrink-0">
        {ZOOM_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => setZoom(level.value)}
            className={`px-2 py-1 text-xs rounded ${
              zoom === level.value
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </nav>
  );
}
