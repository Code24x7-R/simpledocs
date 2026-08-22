// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Web Share API wrapper for sharing documents as files.
 *
 * Uses navigator.share() with a File attachment when available (gives the
 * native OS share sheet — Messages, Mail, AirDrop, etc.). Falls back to a
 * plain .sdjson download when the API is unavailable (desktop Firefox,
 * unsupported browsers).
 */
import type { DocState } from '../store/useDocStore';

/** Result of a share attempt. */
export type ShareResult =
  | 'shared' // navigator.share succeeded
  | 'cancelled' // user dismissed the share sheet
  | 'fallback'; // API unavailable, fell back to download

const SDJSON_EXT = '.sdjson';

function fileNameFor(title: string): string {
  const base = (title || 'Untitled').trim() || 'Untitled';
  return base.endsWith(SDJSON_EXT) ? base : `${base}${SDJSON_EXT}`;
}

/** Whether the browser can share file attachments via the Web Share API. */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    return false;
  }
  // Probe with a representative File to confirm file sharing is allowed.
  try {
    const probe = new File(['{}'], `probe${SDJSON_EXT}`, { type: 'application/json' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Trigger a plain .sdjson download (the fallback path). */
function downloadDocument(doc: DocState, fileName: string): void {
  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share a document. Returns how the share was handled so the caller can show
 * appropriate feedback. Never throws on user cancellation.
 */
export async function shareDocument(doc: DocState, title: string): Promise<ShareResult> {
  const fileName = fileNameFor(title);

  if (!canShareFiles()) {
    downloadDocument(doc, fileName);
    return 'fallback';
  }

  const json = JSON.stringify(doc, null, 2);
  const file = new File([json], fileName, { type: 'application/json' });

  try {
    await navigator.share({ files: [file], title: fileNameFor(title).replace(SDJSON_EXT, '') });
    return 'shared';
  } catch (err) {
    // The user dismissing the share sheet throws an AbortError — not a failure.
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    throw err;
  }
}
