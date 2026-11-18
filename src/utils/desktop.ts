// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Renderer-side adapter for the Electron bridge.
 *
 * Every function degrades to the existing browser behaviour when the bridge is
 * absent, so the same bundle runs on the web and in the desktop shell.
 */
import type { DesktopBridge, DesktopFileFilter } from '../types/desktop';

export interface SaveBlobOptions {
  suggestedName: string;
  filters?: DesktopFileFilter[];
}

export interface SaveOutcome {
  saved: boolean;
  name?: string;
  path?: string;
  /** True when saving failed (as opposed to the user cancelling). */
  error?: boolean;
}

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return window.simpleDocsDesktop ?? null;
}

export function isDesktop(): boolean {
  return getDesktopBridge() !== null;
}

/** Read a Blob as a bare base64 string (no data-URL prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/** Decode a bare base64 string into a Blob. */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/** Browser download via a temporary anchor. */
export function downloadBlob(blob: Blob, suggestedName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Save bytes to disk. Desktop: native Save dialog through the bridge.
 * Web: ordinary download. Never throws on user cancellation.
 */
export async function saveBlob(blob: Blob, options: SaveBlobOptions): Promise<SaveOutcome> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    downloadBlob(blob, options.suggestedName);
    return { saved: true, name: options.suggestedName };
  }

  try {
    const base64 = await blobToBase64(blob);
    const result = await bridge.saveFile({
      base64,
      suggestedName: options.suggestedName,
      filters: options.filters,
    });
    if (result.canceled) return { saved: false };
    return { saved: true, name: result.name, path: result.path };
  } catch (err) {
    console.error('[Desktop] Save failed:', err);
    return { saved: false, error: true };
  }
}
