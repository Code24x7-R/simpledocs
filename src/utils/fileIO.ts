// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { saveBlob } from './desktop';

/**
 * Export the editor HTML content to a Markdown file.
 * Desktop: native Save dialog. Web: download.
 */
export async function exportToMarkdown(html: string, filename: string = 'document'): Promise<void> {
  // Dynamic import to avoid circular dependencies
  const { htmlToMarkdown } = await import('./htmlToMarkdown');
  const markdown = htmlToMarkdown(html);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  await saveBlob(blob, {
    suggestedName: `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
}
