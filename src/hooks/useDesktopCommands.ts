// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEffect } from 'react';
import { useDocStore } from '../store/useDocStore';
import { getDesktopBridge } from '../utils/desktop';
import { openDocumentFromDisk, saveDocumentToDisk } from '../utils/desktopFiles';

/**
 * Wire native menu commands (File/Help) to the same handlers the in-app menu
 * uses. No-op on the web.
 */
export function useDesktopCommands(): void {
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    return bridge.onCommand((command) => {
      const store = useDocStore.getState();
      switch (command) {
        case 'new':
          store.newDocument();
          break;
        case 'open':
          void openDocumentFromDisk().then((outcome) => {
            if (outcome === 'invalid') alert('Invalid document format');
            if (outcome === 'error') alert('Failed to open the document. See console for details.');
          });
          break;
        case 'save':
        case 'save-as':
          void saveDocumentToDisk().then((outcome) => {
            if (outcome === 'error') alert('Failed to save the document. See console for details.');
          });
          break;
        case 'export-pdf':
          window.dispatchEvent(new CustomEvent('simpledocs:export-pdf'));
          break;
        case 'about':
          store.setAboutOpen(true);
          break;
      }
    });
  }, []);
}
