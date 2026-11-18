// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Types shared by the Electron main process, preload bridge, and renderer.
 */

export type DesktopCommand =
  | 'new'
  | 'open'
  | 'save'
  | 'save-as'
  | 'export-pdf'
  | 'about';

export interface DesktopFileFilter {
  name: string;
  extensions: string[];
}

export interface DesktopOpenedDocument {
  name: string;
  path: string;
  text: string;
}

export interface DesktopSaveRequest {
  /** File bytes encoded as base64 (kept as a string for structured clone). */
  base64: string;
  suggestedName: string;
  filters?: DesktopFileFilter[];
}

export type DesktopOpenRecentResult =
  | { status: 'ok'; document: DesktopOpenedDocument }
  | { status: 'missing' }
  | { status: 'forbidden' };

export interface DesktopSaveResult {
  canceled: boolean;
  path?: string;
  name?: string;
}

/** API exposed by electron/preload.ts on `window.simpleDocsDesktop`. */
export interface DesktopBridge {
  readonly isDesktop: true;
  readonly platform: string;
  getVersion(): Promise<string>;
  openDocument(): Promise<DesktopOpenedDocument | { canceled: true }>;
  /** Reopen a file from Recent Files (path must be allowlisted by the main process). */
  openRecent(path: string): Promise<DesktopOpenRecentResult>;
  saveFile(request: DesktopSaveRequest): Promise<DesktopSaveResult>;
  /** Subscribe to documents opened via association/second-instance. */
  onOpenDocument(callback: (doc: DesktopOpenedDocument) => void): () => void;
  /** Subscribe to native menu commands. */
  onCommand(callback: (command: DesktopCommand) => void): () => void;
  /** Tell the main process the renderer can receive queued documents. */
  rendererReady(): void;
}

declare global {
  interface Window {
    simpleDocsDesktop?: DesktopBridge;
  }
}
