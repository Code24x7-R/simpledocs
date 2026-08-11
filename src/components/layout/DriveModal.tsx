// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Google Drive Modal — Save/Open documents to/from Google Drive.
 *
 * Provides two modes:
 * - "save": Save current document to Drive (with filename input)
 * - "open": Browse Drive and open a document
 */

import { useState, useEffect } from 'react';
import { X, FolderOpen, Save, Loader2, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { useDriveStore } from '../../store/useDriveStore';
import { listFiles, createFile, downloadFile, deleteFile, DriveFile } from '../../utils/driveApi';
import { openPicker } from '../../utils/pickerApi';

interface DriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'open';
  /** Current document title (for default filename). */
  documentTitle: string;
  /** Current document content as JSON string. */
  documentContent: string;
  /** Callback when a document is opened. */
  onOpenDocument: (content: string, fileName: string) => void;
}

export default function DriveModal({
  isOpen,
  onClose,
  mode,
  documentTitle,
  documentContent,
  onOpenDocument,
}: DriveModalProps) {
  const { isConnected, isLoading, error, connect, disconnect, clearError } = useDriveStore();

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [fileName, setFileName] = useState(documentTitle || 'Untitled');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFileName(documentTitle || 'Untitled');
      setLocalError(null);
      clearError();
      if (isConnected) {
        loadFiles();
      }
    }
  }, [isOpen, documentTitle, isConnected, clearError]);

  const loadFiles = async () => {
    setLoadingFiles(true);
    setLocalError(null);
    try {
      const fileList = await listFiles();
      setFiles(fileList);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleConnect = async () => {
    setLocalError(null);
    await connect();
    if (useDriveStore.getState().isConnected) {
      await loadFiles();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setLocalError(null);
    try {
      const name = fileName.endsWith('.sdjson') ? fileName : `${fileName}.sdjson`;
      await createFile(name, documentContent);
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFromList = async (file: DriveFile) => {
    setLoadingFiles(true);
    setLocalError(null);
    try {
      const content = await downloadFile(file.id);
      onOpenDocument(content, file.name);
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to open file');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handlePickerOpen = async () => {
    setLocalError(null);
    try {
      const docs = await openPicker({
        title: 'Open from Google Drive',
        showFolders: true,
      });
      if (docs.length > 0) {
        const doc = docs[0];
        const content = await downloadFile(doc.id);
        onOpenDocument(content, doc.name);
        onClose();
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to open picker');
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Move "${file.name}" to trash?`)) return;
    setLocalError(null);
    try {
      await deleteFile(file.id);
      setFiles(files.filter((f) => f.id !== file.id));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {mode === 'save' ? 'Save to Google Drive' : 'Open from Google Drive'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {displayError && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 break-words">{displayError}</span>
            <button onClick={() => { setLocalError(null); clearError(); }} className="text-red-400 hover:text-red-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isConnected ? (
            /* Not connected — show connect button */
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Connect to Google Drive to {mode === 'save' ? 'save' : 'open'} documents</p>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                Connect to Google Drive
              </button>
            </div>
          ) : mode === 'save' ? (
            /* Save mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Document name"
                />
                <p className="text-xs text-gray-500 mt-1">.sdjson extension will be added automatically</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !fileName.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save to Drive
              </button>
            </div>
          ) : (
            /* Open mode */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePickerOpen}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse Drive
                </button>
                <button
                  onClick={loadFiles}
                  disabled={loadingFiles}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  {loadingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Refresh
                </button>
              </div>

              {loadingFiles ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading files...
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No SimpleDocs files found in Drive</p>
                  <p className="text-xs mt-1">Save a document first to see it here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 group"
                    >
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenFromList(file)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 opacity-0 group-hover:opacity-100"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isConnected && (
          <div className="px-4 py-2 border-t border-gray-200 flex justify-end">
            <button
              onClick={disconnect}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
