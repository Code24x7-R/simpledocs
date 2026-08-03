// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { DocState } from '../store/useDocStore';

export function saveDocument(doc: DocState): void {
  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export the editor HTML content to a Markdown file.
 * Converts Tiptap HTML to Markdown and triggers a download.
 */
export function exportToMarkdown(html: string, filename: string = 'document'): void {
  // Dynamic import to avoid circular dependencies
  import('./htmlToMarkdown').then(({ htmlToMarkdown }) => {
    const markdown = htmlToMarkdown(html);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

export async function openDocument(file: File): Promise<DocState | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        // Accept both new format (pages) and legacy format (content)
        if (parsed.id && parsed.settings && parsed.content) {
          resolve(parsed as DocState);
        } else {
          reject(new Error('Invalid document format'));
        }
      } catch {
        reject(new Error('Failed to parse JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
