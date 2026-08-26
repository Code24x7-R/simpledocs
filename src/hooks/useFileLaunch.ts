// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEffect } from 'react';
import { useDocStore } from '../store/useDocStore';

/**
 * Handle PWA file-launch events.
 *
 * When SimpleDocs is installed as a PWA and the user double-clicks a `.sdjson`
 * file, Windows launches the app and delivers the file via `launchQueue`.
 * This hook reads each file handle, parses it as JSON, validates the shape
 * of a DocState, and hands it to the store's loadDocument (which migrates
 * legacy `pages[]` format and sanitizes content).
 *
 * Validates the same shape as the Drive open handler: `id`, `settings`, and
 * either `content` or `pages` must be present. Invalid files are skipped
 * with a console warning — no alert, since the user didn't trigger an action.
 */
export function useFileLaunch(): void {
  const loadDocument = useDocStore((s) => s.loadDocument);

  useEffect(() => {
    const launchQueue = window.launchQueue;
    if (!launchQueue) return;

    launchQueue.setConsumer(async (params) => {
      for (const handle of params.files) {
        try {
          const file = await handle.getFile();
          const text = await file.text();
          const parsed = JSON.parse(text);

          if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.id &&
            parsed.settings &&
            (parsed.content || parsed.pages)
          ) {
            loadDocument(parsed as Parameters<typeof loadDocument>[0]);
            console.log('[FileLaunch] Opened document from file:', file.name);
          } else {
            console.warn('[FileLaunch] Skipped file with invalid document shape:', file.name);
          }
        } catch (err) {
          console.warn('[FileLaunch] Failed to open file:', err);
        }
      }
    });
  }, [loadDocument]);
}
