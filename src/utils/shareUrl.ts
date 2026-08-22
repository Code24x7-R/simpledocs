// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * URL-fragment document sharing.
 *
 * Encodes a DocState into a self-contained URL hash (#doc=<compressed>) so a
 * document can be shared as a link with zero accounts and zero servers. The
 * recipient opens the link and the app hydrates the document from the hash.
 *
 * Uses lz-string's URI-component-safe encoding: the compressed payload is safe
 * to place directly in a URL fragment with no further escaping.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { DocState } from '../store/useDocStore';

/** Fragment payloads larger than this are unreliable to read back on Safari. */
export const MAX_SHARE_SIZE = 30 * 1024;

const FRAGMENT_PREFIX = '#doc=';

/**
 * Compress a DocState into a URI-component-safe string.
 * Returns the raw compressed payload (without the `#doc=` prefix / base URL).
 */
export function encodeDoc(doc: DocState): string {
  const json = JSON.stringify(doc);
  return compressToEncodedURIComponent(json);
}

/**
 * Build a full shareable URL for a document.
 * e.g. https://simpledocs.app/#doc=eJw9...
 */
export function encodeDocToUrl(doc: DocState, base?: string): string {
  const origin = base ?? `${window.location.origin}${window.location.pathname}`;
  return `${origin}${FRAGMENT_PREFIX}${encodeDoc(doc)}`;
}

/**
 * Parse a document from the current window location's hash fragment.
 * Returns null if there is no `#doc=` fragment, or if the payload is corrupt.
 */
export function loadDocFromUrl(): DocState | null {
  const hash = window.location.hash;
  if (!hash.startsWith(FRAGMENT_PREFIX)) return null;

  const compressed = hash.slice(FRAGMENT_PREFIX.length);
  if (!compressed) return null;

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(compressed);
  } catch {
    return null;
  }
  if (!json) return null;

  try {
    return JSON.parse(json) as DocState;
  } catch {
    return null;
  }
}

/**
 * Estimate the byte size of the compressed fragment for a document.
 * Used by the size guard to decide whether URL sharing is viable.
 */
export function estimateShareSize(doc: DocState): number {
  return new Blob([encodeDoc(doc)]).size;
}

/**
 * Whether a document is small enough to share reliably as a URL link.
 * Oversized documents should fall back to file download.
 */
export function canShareViaUrl(doc: DocState): boolean {
  return estimateShareSize(doc) <= MAX_SHARE_SIZE;
}
