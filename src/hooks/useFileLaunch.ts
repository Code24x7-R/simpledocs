// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEffect } from 'react';
import { useDocStore } from '../store/useDocStore';
import { getDesktopBridge } from '../utils/desktop';
import { parseDocumentText } from '../utils/documentFile';

/**
 * Load documents opened from outside the app.
 *
 * Desktop (Electron): the main process delivers `.sdjson` files opened via the
 * Windows file association or a second launch through the preload bridge.
 * Web (installed PWA): the same job is done by the Web App Launch Queue.
 *
 * Both paths validate the document shape before touching app state; invalid
 * files are skipped with a console warning (the user did not trigger an action,
 * so no alert).
 */
export function useFileLaunch(): void {
  const loadDocument = useDocStore((s) => s.loadDocument);
  const addRecentFile = useDocStore((s) => s.addRecentFile);

  useEffect(() => {
    const ingest = (name: string, text: string): boolean => {
      const doc = parseDocumentText(text);
      if (!doc) {
        console.warn('[FileLaunch] Skipped file with invalid document shape:', name);
        return false;
      }
      loadDocument(doc);
      addRecentFile(name, text.length);
      console.log('[FileLaunch] Opened document from file:', name);
      return true;
    };

    const desktop = getDesktopBridge();
    if (desktop) {
      const unsubscribe = desktop.onOpenDocument((doc) => {
        ingest(doc.name, doc.text);
      });
      // Queued association documents are flushed once the renderer is ready.
      desktop.rendererReady();
      return unsubscribe;
    }

    const launchQueue = window.launchQueue;
    if (!launchQueue) return;

    launchQueue.setConsumer(async (params) => {
      for (const handle of params.files) {
        try {
          const file = await handle.getFile();
          ingest(file.name, await file.text());
        } catch (err) {
          console.warn('[FileLaunch] Failed to open file:', err);
        }
      }
    });
  }, [loadDocument, addRecentFile]);
}
