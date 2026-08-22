// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Export the editor HTML content to a Markdown file and trigger a download.
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
