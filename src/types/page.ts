// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Page model for the true paginated content architecture.
 *
 * Each page holds its own Tiptap JSON content tree. The document is an
 * array of pages rather than a single flat content tree. This enables
 * per-page rendering in fixed-height containers without overlay alignment.
 */

export interface Page {
  id: string;
  /** Tiptap JSON content for this page: { type: 'doc', content: [...] } */
  content: Record<string, unknown>;
}

/**
 * Create a new empty page with a single empty paragraph.
 */
export function createEmptyPage(): Page {
  return {
    id: crypto.randomUUID(),
    content: {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
  };
}

/**
 * Create a page from existing Tiptap JSON content.
 */
export function createPageFromContent(content: Record<string, unknown>): Page {
  return {
    id: crypto.randomUUID(),
    content,
  };
}
