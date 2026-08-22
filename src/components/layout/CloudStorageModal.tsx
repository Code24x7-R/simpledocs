// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Cloud Storage Modal — Save/Open documents to/from cloud providers.
 *
 * Supports:
 * - Google Drive (via Google Picker API + Drive API)
 * - Microsoft OneDrive (via Microsoft Graph API)
 * - S3-compatible storage (AWS S3, MinIO, Wasabi, DigitalOcean Spaces, etc.)
 *
 * Provides two modes:
 * - "save": Save current document to cloud (with filename input)
 * - "open": Browse cloud and open a document
 */

import { useState, useEffect, useRef } from 'react';
import { X, FolderOpen, Save, Loader2, AlertCircle, FileText, Trash2, Cloud, Server, Settings, Link, Check, Download, Share2 } from 'lucide-react';
import { listFiles as listGoogleFiles, createFile as createGoogleFile, downloadFile as downloadGoogleFile, deleteFile as deleteGoogleFile, DriveFile } from '../../utils/driveApi';
import { openPicker } from '../../utils/pickerApi';
import { listFiles as listOneDriveFiles, createFile as createOneDriveFile, downloadFile as downloadOneDriveFile, deleteFile as deleteOneDriveFile, OneDriveItem } from '../../utils/onedriveApi';
import { requestAccessToken as getGoogleToken } from '../../utils/driveAuth';
import { signIn as signInOneDrive, signOut as signOutOneDrive } from '../../utils/onedriveAuth';
import { listFiles as listS3Files, createFile as createS3File, downloadFile as downloadS3File, deleteFile as deleteS3File, S3Object } from '../../utils/s3Api';
import { loadS3Config, isS3Configured } from '../../utils/s3Config';
import { encodeDocToUrl, canShareViaUrl, estimateShareSize } from '../../utils/shareUrl';
import { shareDocument } from '../../utils/webShare';
import type { DocState } from '../../store/useDocStore';
import S3ConfigModal from './S3ConfigModal';

type CloudProvider = 'google' | 'onedrive' | 's3';

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
const [s3ConfigOpen, setS3ConfigOpen] = useState(false);
  const [s3Ready, setS3Ready] = useState(false);
  /** Whether the URL link was just copied (shows a brief confirmation). */
  const [linkCopied, setLinkCopied] = useState(false);
  /** Hidden file input for the userland "Open from file" action. */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFileName(documentTitle || 'Untitled');
      setError(null);
      setProvider(null);
      setFiles([]);
      setS3Ready(isS3Configured(loadS3Config()));
      setLinkCopied(false);
    }
  }, [isOpen, documentTitle]);

  const clearError = () => setError(null);

  // Size guard: can this document fit in a share link? Computed each render
  // from the current content string.
  let linkTooLarge = false;
  let linkSizeLabel = '';
  try {
    const doc = JSON.parse(documentContent) as DocState;
    const size = estimateShareSize(doc);
    linkTooLarge = !canShareViaUrl(doc);
    linkSizeLabel = `${Math.round(size / 1024)} KB`;
  } catch {
    linkTooLarge = true;
  }

  // --- Userland sharing (no accounts, no setup) ---

  /** Copy a self-contained share link to the clipboard. */
  const handleCopyLink = async () => {
    setError(null);
    try {
      const doc = JSON.parse(documentContent) as DocState;
      const url = encodeDocToUrl(doc, `${window.location.origin}${window.location.pathname}`);
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      // Auto-close shortly after confirming the copy.
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy link to clipboard');
    }
  };

  /** Share the document as a file via the native OS share sheet (or download). */
  const handleShareFile = async () => {
    setError(null);
    setBusy(true);
    try {
      const doc = JSON.parse(documentContent) as DocState;
      const result = await shareDocument(doc, documentTitle || 'Untitled');
      if (result === 'shared' || result === 'fallback') {
        onClose();
      }
      // 'cancelled' — stay open, no error.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share file');
    } finally {
      setBusy(false);
    }
  };

  /** Download the document as a .sdjson file to the local machine. */
  const handleDownloadFile = () => {
    setError(null);
    try {
      const doc = JSON.parse(documentContent) as DocState;
      const json = JSON.stringify(doc, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(documentTitle || 'Untitled').replace(/[^a-zA-Z0-9_-]/g, '_')}.sdjson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  /** Open the native file picker and load the chosen .sdjson file. */
  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-selected.
    e.target.value = '';
    if (!file) return;
    setError(null);
    setLoadingFiles(true);
    try {
      const text = await file.text();
      onOpenDocument(text, file.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setLoadingFiles(false);
    }
  };

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

  // --- S3-compatible ---
  const connectS3 = async () => {
    if (!s3Ready) {
      setS3ConfigOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setProvider('s3');
      await loadS3FilesHandler();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to S3 storage');
    } finally {
      setBusy(false);
    }
  };

  const loadS3FilesHandler = async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const objects = await listS3Files();
      setFiles(objects.map((obj: S3Object) => ({
        id: obj.key,
        name: obj.name,
        modifiedTime: obj.lastModified,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const saveToS3 = async () => {
    setSaving(true);
    setError(null);
    try {
      const name = fileName.endsWith('.sdjson') ? fileName : `${fileName}.sdjson`;
      await createS3File(name, documentContent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const openFromS3 = async (file: CloudFile) => {
    setLoadingFiles(true);
    setError(null);
    try {
      const content = await downloadS3File(file.id);
      onOpenDocument(content, file.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    } finally {
      setLoadingFiles(false);
    }
  };

  const deleteFromS3 = async (file: CloudFile) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    setError(null);
    try {
      await deleteS3File(file.id);
      setFiles(files.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const openS3Config = () => {
    setS3ConfigOpen(true);
  };

  const handleS3ConfigSaved = () => {
    setS3Ready(true);
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
      // S3 has no disconnect — credentials are local-only
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
    else if (provider === 's3') saveToS3();
  };

  const handleOpenFromList = (file: CloudFile) => {
    if (provider === 'google') openFromGoogleList(file);
    else if (provider === 'onedrive') openFromOneDrive(file);
    else if (provider === 's3') openFromS3(file);
  };

  const handleDelete = (file: CloudFile) => {
    if (provider === 'google') deleteFromGoogle(file);
    else if (provider === 'onedrive') deleteFromOneDrive(file);
    else if (provider === 's3') deleteFromS3(file);
  };

  const refreshFiles = () => {
    if (provider === 'google') loadGoogleFiles();
    else if (provider === 'onedrive') loadOneDriveFiles();
    else if (provider === 's3') loadS3FilesHandler();
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
            /* Userland home view — no accounts, no setup. */
            <div className="py-4">
              <div className="text-center mb-4">
                <Cloud className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-700 font-medium">
                  {mode === 'save' ? 'Save or share your document' : 'Open a document'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  No account or setup required. Your document is a <code className="text-xs bg-gray-100 px-1 rounded">.sdjson</code> file.
                </p>
              </div>

              {/* --- Primary userland actions --- */}
              {mode === 'save' ? (
                <div className="space-y-2">
                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    disabled={busy || linkTooLarge}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-3 text-left"
                  >
                    {linkCopied
                      ? <Check className="w-5 h-5 text-green-600 shrink-0" />
                      : <Link className="w-5 h-5 text-blue-600 shrink-0" />}
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {linkCopied ? 'Link copied!' : 'Copy Link'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {linkTooLarge
                          ? `Too large for a link (${linkSizeLabel}). Use Share File instead.`
                          : 'Share a link that contains the whole document.'}
                      </div>
                    </div>
                  </button>

                  {/* Share File (native share sheet / download) */}
                  <button
                    onClick={handleShareFile}
                    disabled={busy}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-3 text-left"
                  >
                    <Share2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Share File</div>
                      <div className="text-xs text-gray-500">
                        Send as a .sdjson file via your device's share sheet.
                      </div>
                    </div>
                  </button>

                  {/* Download to file */}
                  <button
                    onClick={handleDownloadFile}
                    disabled={busy}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-3 text-left"
                  >
                    <Download className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Save to File</div>
                      <div className="text-xs text-gray-500">
                        Download a .sdjson file to this device.
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Open from file */}
                  <button
                    onClick={handleOpenFile}
                    disabled={busy}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-3 text-left"
                  >
                    <FolderOpen className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Open from File</div>
                      <div className="text-xs text-gray-500">
                        Load a .sdjson file from this device.
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* --- Advanced: cloud accounts (collapsible) --- */}
              <details className="mt-4 pt-3 border-t border-gray-100 group">
                <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 select-none list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  Advanced: cloud accounts
                </summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-400">
                    Connect a cloud account to browse and store files online. Requires developer-side setup.
                  </p>

                  {/* Google Drive */}
                  <button
                    onClick={connectGoogle}
                    disabled={busy}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-3 text-left"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Google Drive</div>
                      <div className="text-xs text-gray-500">Requires a Google Cloud project + OAuth Client ID.</div>
                    </div>
                  </button>

                  {/* OneDrive */}
                  <button
                    onClick={connectOneDrive}
                    disabled={busy}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-3 text-left"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#0364B8" d="M12.5 1.5c-2.9 0-5.5 1.6-6.9 4C3.6 6.4 2 8.4 2 11c0 3.3 2.7 6 6 6h10.5c2.8 0 5-2.2 5-5 0-2.5-1.8-4.5-4.2-4.9C18.6 3.8 15.8 1.5 12.5 1.5z"/>
                      <path fill="#0078D4" d="M6.5 18c-2.2 0-4-1.8-4-4s1.8-4 4-4c.4 0 .8.1 1.2.2C8.3 8.2 10.2 7 12.5 7c2.8 0 5.2 2 5.8 4.7.3-.1.6-.1.9-.1 1.9 0 3.5 1.6 3.5 3.5S21.1 18.5 19.2 18.5H6.5z"/>
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">OneDrive</div>
                      <div className="text-xs text-gray-500">Requires an Azure AD app registration.</div>
                    </div>
                  </button>

                  {/* S3-compatible */}
                  <button
                    onClick={connectS3}
                    disabled={busy}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-3 text-left"
                  >
                    <Server className="w-5 h-5 text-gray-500 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">S3-Compatible Storage</div>
                      <div className="text-xs text-gray-500">
                        AWS S3, MinIO, Wasabi, DigitalOcean Spaces, Backblaze B2, Cloudflare R2.
                        {!s3Ready && ' Click to configure.'}
                      </div>
                    </div>
                    {!s3Ready && (
                      <Settings className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </button>
                </div>
              </details>

              {/* Footer info */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  Files are stored as <code className="bg-gray-100 px-1 rounded">.sdjson</code> (JSON format).
                </p>
              </div>

              {/* Hidden file input for Open from File */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".sdjson,application/json"
                className="hidden"
                onChange={handleFilePicked}
              />
            </div>
          ) : mode === 'save' ? (
            /* Save mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {provider === 's3' ? <Server className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  <span className="font-medium">
                    {provider === 'google' ? 'Google Drive' : provider === 'onedrive' ? 'OneDrive' : 'S3 Storage'}
                  </span>
                </div>
                {provider === 's3' && (
                  <button
                    onClick={openS3Config}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    Configure
                  </button>
                )}
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
                Save to {provider === 'google' ? 'Drive' : provider === 'onedrive' ? 'OneDrive' : 'S3'}
              </button>
            </div>
          ) : (
            /* Open mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {provider === 's3' ? <Server className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  <span className="font-medium">
                    {provider === 'google' ? 'Google Drive' : provider === 'onedrive' ? 'OneDrive' : 'S3 Storage'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {provider === 's3' && (
                    <button
                      onClick={openS3Config}
                      className="px-3 py-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 flex items-center gap-1.5 text-xs"
                    >
                      <Settings className="w-3 h-3" />
                      Configure
                    </button>
                  )}
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

      {/* S3 Configuration Modal */}
      <S3ConfigModal
        isOpen={s3ConfigOpen}
        onClose={() => {
          setS3ConfigOpen(false);
          // Re-check if S3 is now configured
          setS3Ready(isS3Configured(loadS3Config()));
        }}
        onSaved={handleS3ConfigSaved}
      />
    </div>
  );
}
