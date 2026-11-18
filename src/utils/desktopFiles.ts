// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Document CRUD through native Windows dialogs when running in Electron.
 * Falls back to the existing in-app Open/Save modal on the web.
 */
import { useDocStore } from '../store/useDocStore';
import { getDesktopBridge, saveBlob } from './desktop';
import { parseDocumentText, sanitizeFileName, titleFromFileName } from './documentFile';

export type OpenOutcome = 'opened' | 'canceled' | 'invalid' | 'error' | 'unsupported';
export type SaveOutcome = 'saved' | 'canceled' | 'error' | 'unsupported';

/** Open a `.sdjson` document. Desktop: native Open dialog. Web: app modal. */
export async function openDocumentFromDisk(): Promise<OpenOutcome> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    useDocStore.getState().setDriveOpen(true, 'open');
    return 'unsupported';
  }

  try {
    const result = await bridge.openDocument();
    if ('canceled' in result) return 'canceled';

    const doc = parseDocumentText(result.text);
    if (!doc) return 'invalid';

    const store = useDocStore.getState();
    // Untitled documents adopt the filename so the title bar is meaningful.
    if (!doc.title || /^untitled( document)?$/i.test(doc.title)) {
      const title = titleFromFileName(result.name);
      if (title) doc.title = title;
    }
    store.loadDocument(doc);
    store.addRecentFile(result.name, result.text.length);
    return 'opened';
  } catch (err) {
    console.error('[Desktop] Open failed:', err);
    return 'error';
  }
}

/** Save the current document. Desktop: native Save dialog. Web: app modal. */
export async function saveDocumentToDisk(): Promise<SaveOutcome> {
  const bridge = getDesktopBridge();
  const store = useDocStore.getState();

  if (!bridge) {
    store.setDriveOpen(true, 'save');
    return 'unsupported';
  }

  const json = JSON.stringify(store.docState, null, 2);
  const suggestedName = `${sanitizeFileName(store.docState.title || 'Untitled')}.sdjson`;
  const outcome = await saveBlob(new Blob([json], { type: 'application/json' }), {
    suggestedName,
    filters: [{ name: 'SimpleDocs Document', extensions: ['sdjson'] }],
  });

  if (outcome.saved) {
    const savedName = outcome.name ?? suggestedName;
    store.addRecentFile(savedName, json.length);

    // Windows convention: Save As names the document. Adopt the chosen
    // filename for untitled documents and for explicit renames, so a restored
    // autosave has a meaningful title instead of "Untitled Document".
    const titleIsDefault = !store.docState.title || /^untitled( document)?$/i.test(store.docState.title);
    if (titleIsDefault || savedName !== suggestedName) {
      const title = titleFromFileName(savedName);
      if (title && title !== store.docState.title) store.updateTitle(title);
    }
    return 'saved';
  }
  return outcome.error ? 'error' : 'canceled';
}

/** Open a document originating from the file association / second instance. */
export function loadDocumentFromBridge(text: string, name: string): boolean {
  const doc = parseDocumentText(text);
  if (!doc) {
    console.warn('[Desktop] Skipped invalid document:', name);
    return false;
  }
  const store = useDocStore.getState();
  store.loadDocument(doc);
  store.addRecentFile(name, text.length);
  return true;
}
