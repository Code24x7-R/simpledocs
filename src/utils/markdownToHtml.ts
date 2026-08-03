// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Lightweight Markdown-to-HTML converter.
 *
 * Handles the common markdown elements that LLMs typically output:
 * - Headers (# ## ###)
 * - Bold (**text**) and italic (*text* or _text_)
 * - Inline code (`code`) and fenced code blocks (```code```)
 * - Unordered lists (- item) and ordered lists (1. item)
 * - Blockquotes (> text)
 * - Links ([text](url))
 * - Horizontal rules (---)
 * - Paragraphs and line breaks
 *
 * This is intentionally minimal — for full CommonMark compliance, use a
 * library like `marked` or `markdown-it`. This covers the 95% case for
 * LLM-generated markdown responses.
 */

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Apply inline markdown formatting (bold, italic, code, links) to text.
 * Escapes HTML first, then applies formatting.
 */
function applyInlineFormatting(text: string): string {
  // Escape HTML entities first to prevent XSS
  let result = escapeHtml(text);

  // Code spans (must be first to protect content from other formatting)
  // Content inside backticks is already escaped, just wrap in <code>
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links ([text](url))
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return result;
}

/**
 * Convert a single block of markdown text to HTML.
 * Block-level elements are handled here.
 */
function convertBlock(block: string): string {
  const trimmed = block.trim();

  if (!trimmed) return '';

  // Fenced code blocks (```language\ncode```)
  const codeBlockMatch = trimmed.match(/^```(\w*)\n([\s\S]*?)```$/);
  if (codeBlockMatch) {
    const lang = codeBlockMatch[1] ? ` class="language-${escapeHtml(codeBlockMatch[1])}"` : '';
    const code = escapeHtml(codeBlockMatch[2].trim());
    return `<pre><code${lang}>${code}</code></pre>`;
  }

  // Horizontal rule
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
    return '<hr>';
  }

  // Headers (multiline flag to match headers within multi-line blocks)
  const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const headerContent = applyInlineFormatting(headerMatch[2]);
    const headerHtml = `<h${level}>${headerContent}</h${level}>`;

    // Check if there's content after the header (on subsequent lines)
    const lines = trimmed.split('\n');
    const firstLine = lines[0];
    if (firstLine.trim().match(/^#{1,6}\s+/) && lines.length > 1) {
      // There's content after the header - convert it separately
      const remainingLines = lines.slice(1).join('\n').trim();
      if (remainingLines) {
        const remainingHtml = convertBlock(remainingLines);
        return `${headerHtml}\n${remainingHtml}`;
      }
    }

    return headerHtml;
  }

  // Blockquote
  if (trimmed.startsWith('>')) {
    const content = applyInlineFormatting(trimmed.slice(1).trim());
    return `<blockquote><p>${content}</p></blockquote>`;
  }

  // Unordered list (at least one line is a list item)
  // Handles inconsistent LLM output where only some items have markers
  if (/^[-*+]\s/m.test(trimmed)) {
    const items = trimmed.split('\n').map((line) => {
      // Remove list marker and trim leading whitespace
      const itemContent = line.replace(/^[-*+]\s+/, '').trim();
      return `<li>${applyInlineFormatting(itemContent)}</li>`;
    });
    return `<ul>${items.join('')}</ul>`;
  }

  // Ordered list (at least one line is a numbered item)
  if (/^\d+\.\s/m.test(trimmed)) {
    const items = trimmed.split('\n').map((line) => {
      // Remove list marker and trim leading whitespace
      const itemContent = line.replace(/^\d+\.\s+/, '').trim();
      return `<li>${applyInlineFormatting(itemContent)}</li>`;
    });
    return `<ol>${items.join('')}</ol>`;
  }

  // Paragraph (default)
  return `<p>${applyInlineFormatting(trimmed)}</p>`;
}

/**
 * Check if a line is a list item (unordered or ordered).
 */
function isListItem(line: string): boolean {
  return /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line);
}

/**
 * Convert markdown text to HTML string.
 *
 * Handles:
 * - Fenced code blocks (preserved as-is, including blank lines)
 * - Lists (kept together even with blank lines between items)
 * - All other block-level elements
 *
 * @param markdown - Markdown text to convert
 * @returns HTML string suitable for insertion into Tiptap editor
 */
export function markdownToHtml(markdown: string): string {
  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  // First pass: collapse blank lines within list regions
  // This ensures list items separated by blank lines stay together
  const processedLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Handle fenced code blocks - keep them intact
    if (line.startsWith('```')) {
      const codeBlock: string[] = [line];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeBlock.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        codeBlock.push(lines[i]); // closing ```
        i++;
      }
      // Add code block lines with markers to prevent blank-line processing
      processedLines.push('__CODEBLOCK_START__');
      processedLines.push(...codeBlock);
      processedLines.push('__CODEBLOCK_END__');
      continue;
    }

    // Handle list regions: collapse blank lines between list items
    if (isListItem(line)) {
      processedLines.push(line);
      i++;
      // Skip blank lines that are followed by more list items
      while (i < lines.length) {
        if (isListItem(lines[i])) {
          processedLines.push(lines[i]);
          i++;
        } else if (lines[i].trim() === '' && i + 1 < lines.length && isListItem(lines[i + 1])) {
          i++; // skip blank line within list
        } else {
          break;
        }
      }
      continue;
    }

    processedLines.push(line);
    i++;
  }

  // Second pass: split into blocks (separated by blank lines)
  const blocks: string[] = [];
  let currentBlock = '';
  let inCodeBlock = false;

  for (const line of processedLines) {
    if (line === '__CODEBLOCK_START__') {
      if (currentBlock.trim()) {
        blocks.push(currentBlock.trim());
      }
      currentBlock = '';
      inCodeBlock = true;
    } else if (line === '__CODEBLOCK_END__') {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = '';
      inCodeBlock = false;
    } else if (inCodeBlock) {
      currentBlock += (currentBlock ? '\n' : '') + line;
    } else if (line.trim() === '') {
      if (currentBlock.trim()) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
    } else {
      currentBlock += (currentBlock ? '\n' : '') + line;
    }
  }

  // Don't forget the last block
  if (currentBlock.trim()) {
    blocks.push(currentBlock.trim());
  }

  // Convert each block to HTML
  const htmlParts = blocks.map(convertBlock).filter(Boolean);

  return htmlParts.join('\n');
}

/**
 * Check if a string appears to contain markdown formatting.
 * Used to decide whether to apply MD→HTML conversion.
 */
export function containsMarkdown(text: string): boolean {
  // Check for common markdown patterns
  return (
    /^#{1,6}\s/m.test(text) ||          // Headers
    /\*\*[^*]+\*\*/.test(text) ||       // Bold (**text**)
    /`[^`]+`/.test(text) ||             // Inline code
    /^```/m.test(text) ||               // Code blocks
    /^[-*+]\s/m.test(text) ||           // Unordered lists
    /^\d+\.\s/m.test(text) ||           // Ordered lists
    /^>\s/m.test(text) ||               // Blockquotes
    /^---/m.test(text) ||               // Horizontal rules
    /\*[^*\s][^*]*\*/.test(text) ||     // Italic (*text*)
    /_[^_\s][^_]*_/.test(text) ||       // Italic (_text_)
    /\[.+\]\(.+\)/.test(text)           // Links
  );
}
