// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Lightweight HTML-to-Markdown converter.
 *
 * Reverses the markdownToHtml conversion, handling common HTML elements
 * produced by Tiptap editor and the markdown-to-HTML converter.
 *
 * This is intentionally minimal — for full HTML-to-Markdown compliance,
 * use a library like `turndown`. This covers the 95% case for round-tripping
 * markdown → HTML → markdown within the editor.
 */

/**
 * Convert HTML string to Markdown.
 *
 * Handles:
 * - Headers (h1-h6)
 * - Bold (**text**) and italic (*text*)
 * - Inline code (`code`) and fenced code blocks
 * - Unordered lists (- item) and ordered lists (1. item)
 * - Blockquotes (> text)
 * - Links ([text](url))
 * - Horizontal rules (---)
 * - Paragraphs and line breaks
 *
 * @param html - HTML string to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  let result = html;

  // Remove empty paragraphs first
  result = result.replace(/<p>\s*<\/p>/g, '');

  // Fenced code blocks: <pre><code class="lang">...</code></pre>
  result = result.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string, code: string) => {
      const language = lang || '';
      // Unescape HTML entities in code
      const unescaped = unescapeHtml(code.trim());
      return `\`\`\`${language}\n${unescaped}\n\`\`\``;
    }
  );

  // Inline code: <code>text</code>
  result = result.replace(/<code>([\s\S]*?)<\/code>/g, (_match, code: string) => {
    return `\`${unescapeHtml(code)}\``;
  });

  // Headers: <h1>text</h1> through <h6>
  for (let level = 6; level >= 1; level--) {
    const tag = `h${level}`;
    const hashes = '#'.repeat(level);
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g');
    result = result.replace(regex, (_match, text: string) => {
      const inner = stripTagsInline(text).trim();
      return `${hashes} ${inner}`;
    });
  }

  // Bold: <strong>text</strong>
  result = result.replace(/<strong>([\s\S]*?)<\/strong>/g, (_match, text: string) => {
    const inner = stripTagsInline(text);
    return `**${inner}**`;
  });

  // Italic: <em>text</em>
  result = result.replace(/<em>([\s\S]*?)<\/em>/g, (_match, text: string) => {
    const inner = stripTagsInline(text);
    return `*${inner}*`;
  });

  // Links: <a href="url">text</a>
  result = result.replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_match, href: string, text: string) => {
    const inner = stripTagsInline(text);
    return `[${inner}](${href})`;
  });

  // Unordered lists: <ul><li>item</li>...</ul>
  result = result.replace(/<ul>([\s\S]*?)<\/ul>/g, (_match, items: string) => {
    return convertListItems(items, 'unordered');
  });

  // Ordered lists: <ol><li>item</li>...</ol>
  result = result.replace(/<ol>([\s\S]*?)<\/ol>/g, (_match, items: string) => {
    return convertListItems(items, 'ordered');
  });

  // Blockquotes: <blockquote><p>text</p></blockquote>
  result = result.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (_match, content: string) => {
    const text = stripTagsInline(content).trim();
    // Handle multi-line blockquotes
    const lines = text.split('\n');
    return lines.map((line) => `> ${line.trim()}`).join('\n');
  });

  // Horizontal rules: <hr>
  result = result.replace(/<hr\s*\/?>/g, '---');

  // Paragraphs: <p>text</p>
  result = result.replace(/<p>([\s\S]*?)<\/p>/g, (_match, text: string) => {
    const content = stripTagsInline(text).trim();
    if (!content) return ''; // skip empty paragraphs
    return content + '\n\n';
  });

  // Clean up: remove extra blank lines (more than 2 consecutive newlines)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Unescape any remaining HTML entities
  result = unescapeHtml(result);

  return result.trim();
}

/**
 * Convert inline HTML tags to their Markdown equivalents.
 * Handles <strong>, <em>, <code>, <a>, <b>, <i>, <u>, <span>, <br>.
 * Used for extracting text from header/list item content.
 */
function stripTagsInline(html: string): string {
  let result = html;

  // Bold: <strong>text</strong> or <b>text</b>
  result = result.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/g, '**$1**');

  // Italic: <em>text</em> or <i>text</i>
  result = result.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/g, '*$1*');

  // Links: <a href="url">text</a>
  result = result.replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)');

  // Code: <code>text</code>
  result = result.replace(/<code>([\s\S]*?)<\/code>/g, '`$1`');

  // Underline: <u>text</u> (no markdown equivalent, just strip tags)
  result = result.replace(/<u>([\s\S]*?)<\/u>/g, '$1');

  // Span: strip tags but keep content
  result = result.replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1');

  // Line breaks
  result = result.replace(/<br\s*\/?>/g, '\n');

  // Clean up extra whitespace
  result = result.replace(/ +/g, ' ');

  return result.trim();
}

/**
 * Convert list items to markdown format.
 */
function convertListItems(itemsHtml: string, type: 'unordered' | 'ordered'): string {
  const items: string[] = [];
  const regex = /<li>([\s\S]*?)<\/li>/g;
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = regex.exec(itemsHtml)) !== null) {
    const content = stripTagsInline(match[1]).trim();
    if (type === 'unordered') {
      items.push(`* ${content}`);
    } else {
      items.push(`${index}. ${content}`);
      index++;
    }
  }

  return items.join('\n');
}

/**
 * Unescape HTML entities back to their original characters.
 */
function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
