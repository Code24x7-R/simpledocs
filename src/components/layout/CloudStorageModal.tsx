// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Cloud Storage Modal — Save/Open documents to/from cloud providers.
 *
 * Supports:
 * - Google Drive (via Google Picker API + Drive API)
 * - Microsoft OneDrive (via Microsoft Graph API)
 *
 * Provides two modes:
 * - "save": Save current document to cloud (with filename input)
 * - "open": Browse cloud and open a document
 */

import { useState, useEffect } from 'react';
import { X, FolderOpen, Save, Loader2, AlertCircle, FileText, Trash2, Cloud } from 'lucide-react';
import { listFiles as listGoogleFiles, createFile as createGoogleFile, downloadFile as downloadGoogleFile, deleteFile as deleteGoogleFile, DriveFile } from '../../utils/driveApi';
import { openPicker } from '../../utils/pickerApi';
import { listFiles as listOneDriveFiles, createFile as createOneDriveFile, downloadFile as downloadOneDriveFile, deleteFile as deleteOneDriveFile, OneDriveItem } from '../../utils/onedriveApi';
import { requestAccessToken as getGoogleToken } from '../../utils/driveAuth';
import { signIn as signInOneDrive, signOut as signOutOneDrive } from '../../utils/onedriveAuth';

type CloudProvider = 'google' | 'onedrive';

interface CloudFile {
  id: string;
  name: string;
  modifiedTime: string;
}

interface CloudStorageModalProps {
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

export default function CloudStorageModal({
  isOpen,
  onClose,
  mode,
  documentTitle,
  documentContent,
  onOpenDocument,
}: CloudStorageModalProps) {
  const [provider, setProvider] = useState<CloudProvider | null>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [fileName, setFileName] = useState(documentTitle || 'Untitled');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFileName(documentTitle || 'Untitled');
      setError(null);
      setProvider(null);
      setFiles([]);
    }
  }, [isOpen, documentTitle]);

  const clearError = () => setError(null);

  // --- Google Drive ---
  const connectGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await getGoogleToken();
      setProvider('google');
      await loadGoogleFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Drive');
    } finally {
      setBusy(false);
    }
  };

  const loadGoogleFiles = async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const fileList = await listGoogleFiles();
      setFiles(fileList.map((f: DriveFile) => ({
        id: f.id,
        name: f.name,
        modifiedTime: f.modifiedTime,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const saveToGoogle = async () => {
    setSaving(true);
    setError(null);
    try {
      const name = fileName.endsWith('.sdjson') ? fileName : `${fileName}.sdjson`;
      await createGoogleFile(name, documentContent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const openFromGoogleList = async (file: CloudFile) => {
    setLoadingFiles(true);
    setError(null);
    try {
      const content = await downloadGoogleFile(file.id);
      onOpenDocument(content, file.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    } finally {
      setLoadingFiles(false);
    }
  };

  const openFromGooglePicker = async () => {
    setError(null);
    try {
      const docs = await openPicker({
        title: 'Open from Google Drive',
        showFolders: true,
      });
      if (docs.length > 0) {
        const doc = docs[0];
        const content = await downloadGoogleFile(doc.id);
        onOpenDocument(content, doc.name);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open picker');
    }
  };

  const deleteFromGoogle = async (file: CloudFile) => {
    if (!confirm(`Move "${file.name}" to trash?`)) return;
    setError(null);
    try {
      await deleteGoogleFile(file.id);
      setFiles(files.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  // --- OneDrive ---
  const connectOneDrive = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInOneDrive();
      setProvider('onedrive');
      await loadOneDriveFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to OneDrive');
    } finally {
      setBusy(false);
    }
  };

  const loadOneDriveFiles = async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const items = await listOneDriveFiles();
      setFiles(items.map((item: OneDriveItem) => ({
        id: item.id,
        name: item.name,
        modifiedTime: item.lastModifiedDateTime,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const saveToOneDrive = async () => {
    setSaving(true);
    setError(null);
    try {
      const name = fileName.endsWith('.sdjson') ? fileName : `${fileName}.sdjson`;
      await createOneDriveFile(name, documentContent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const openFromOneDrive = async (file: CloudFile) => {
    setLoadingFiles(true);
    setError(null);
    try {
      const content = await downloadOneDriveFile(file.id);
      onOpenDocument(content, file.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    } finally {
      setLoadingFiles(false);
    }
  };

  const deleteFromOneDrive = async (file: CloudFile) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    setError(null);
    try {
      await deleteOneDriveFile(file.id);
      setFiles(files.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  // --- Common ---
  const handleDisconnect = async () => {
    setBusy(true);
    try {
      if (provider === 'google') {
        const { signOut } = await import('../../utils/driveAuth');
        await signOut();
      } else if (provider === 'onedrive') {
        await signOutOneDrive();
      }
      setProvider(null);
      setFiles([]);
    } catch {
      // Ignore disconnect errors
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    if (provider === 'google') saveToGoogle();
    else if (provider === 'onedrive') saveToOneDrive();
  };

  const handleOpenFromList = (file: CloudFile) => {
    if (provider === 'google') openFromGoogleList(file);
    else if (provider === 'onedrive') openFromOneDrive(file);
  };

  const handleDelete = (file: CloudFile) => {
    if (provider === 'google') deleteFromGoogle(file);
    else if (provider === 'onedrive') deleteFromOneDrive(file);
  };

  const refreshFiles = () => {
    if (provider === 'google') loadGoogleFiles();
    else if (provider === 'onedrive') loadOneDriveFiles();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {mode === 'save' ? 'Save to Cloud' : 'Open from Cloud'}
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
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 break-words">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!provider ? (
            /* Provider selection */
            <div className="text-center py-8">
              <Cloud className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Choose a cloud provider</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={connectGoogle}
                  disabled={busy}
                  className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google Drive
                </button>
                <button
                  onClick={connectOneDrive}
                  disabled={busy}
                  className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#0364B8" d="M12.5 1.5c-2.9 0-5.5 1.6-6.9 4C3.6 6.4 2 8.4 2 11c0 3.3 2.7 6 6 6h10.5c2.8 0 5-2.2 5-5 0-2.5-1.8-4.5-4.2-4.9C18.6 3.8 15.8 1.5 12.5 1.5z"/>
                    <path fill="#0078D4" d="M6.5 18c-2.2 0-4-1.8-4-4s1.8-4 4-4c.4 0 .8.1 1.2.2C8.3 8.2 10.2 7 12.5 7c2.8 0 5.2 2 5.8 4.7.3-.1.6-.1.9-.1 1.9 0 3.5 1.6 3.5 3.5S21.1 18.5 19.2 18.5H6.5z"/>
                  </svg>
                  OneDrive
                </button>
              </div>
            </div>
          ) : mode === 'save' ? (
            /* Save mode */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Cloud className="w-4 h-4" />
                <span className="font-medium">
                  {provider === 'google' ? 'Google Drive' : 'OneDrive'}
                </span>
              </div>
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
                Save to {provider === 'google' ? 'Drive' : 'OneDrive'}
              </button>
            </div>
          ) : (
            /* Open mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Cloud className="w-4 h-4" />
                  <span className="font-medium">
                    {provider === 'google' ? 'Google Drive' : 'OneDrive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {provider === 'google' && (
                    <button
                      onClick={openFromGooglePicker}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5 text-xs"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Browse
                    </button>
                  )}
                  <button
                    onClick={refreshFiles}
                    disabled={loadingFiles}
                    className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1.5 text-xs"
                  >
                    {loadingFiles ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Refresh
                  </button>
                </div>
              </div>

              {loadingFiles ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading files...
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No SimpleDocs files found</p>
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
        {provider && (
          <div className="px-4 py-2 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={() => setProvider(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Switch provider
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
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
