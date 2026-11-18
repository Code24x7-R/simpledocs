// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Preload bridge. Runs sandboxed with context isolation; the renderer only
 * ever sees the whitelisted API below — never `ipcRenderer` or Node.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  DesktopCommand,
  DesktopOpenRecentResult,
  DesktopOpenedDocument,
  DesktopSaveRequest,
  DesktopSaveResult,
} from '../src/types/desktop';

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api = {
  isDesktop: true as const,
  platform: process.platform,
  getVersion: (): Promise<string> => ipcRenderer.invoke('desktop:get-version'),
  openDocument: (): Promise<DesktopOpenedDocument | { canceled: true }> =>
    ipcRenderer.invoke('desktop:open-document'),
  openRecent: (filePath: string): Promise<DesktopOpenRecentResult> =>
    ipcRenderer.invoke('desktop:open-recent', filePath),
  saveFile: (request: DesktopSaveRequest): Promise<DesktopSaveResult> =>
    ipcRenderer.invoke('desktop:save-file', request),
  onOpenDocument: (callback: (doc: DesktopOpenedDocument) => void): (() => void) =>
    subscribe('desktop:open-document', callback),
  onCommand: (callback: (command: DesktopCommand) => void): (() => void) =>
    subscribe('desktop:command', callback),
  rendererReady: (): void => ipcRenderer.send('desktop:renderer-ready'),
};

contextBridge.exposeInMainWorld('simpleDocsDesktop', api);
