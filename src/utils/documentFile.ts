// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { DocState } from '../store/useDocStore';

/**
 * Parse and shape-check a `.sdjson` document.
 *
 * Accepts the current `content` format and the legacy `pages[]` format (it is
 * migrated later by the store). Returns null for anything that is not a
 * document, so callers can reject bad files without touching app state.
 */
export function parseDocumentText(text: string): DocState | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown> | null;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.id &&
      parsed.settings &&
      (parsed.content || parsed.pages)
    ) {
      return parsed as unknown as DocState;
    }
  } catch {
    // Invalid JSON — fall through to null.
  }
  return null;
}

/** Filesystem-safe filename stem (no extension). */
export function sanitizeFileName(input: string): string {
  const base = input.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return base || 'Untitled';
}

/**
 * Derive a human document title from a saved filename.
 * Returns null for default/meaningless names so the caller keeps the existing
 * title (e.g. `Untitled_Document.sdjson` must not become "Untitled_Document").
 */
export function titleFromFileName(fileName: string): string | null {
  const stem = fileName.replace(/\.(sdjson|json|docx)$/i, '').replace(/_/g, ' ').trim();
  if (!stem) return null;
  if (/^untitled( document)?$/i.test(stem)) return null;
  return stem;
}
