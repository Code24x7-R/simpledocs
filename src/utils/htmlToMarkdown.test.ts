// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from './htmlToMarkdown';

describe('htmlToMarkdown', () => {
  describe('headers', () => {
    it('converts h1-h6 headers', () => {
      expect(htmlToMarkdown('<h1>Hello</h1>')).toBe('# Hello');
      expect(htmlToMarkdown('<h2>Hello</h2>')).toBe('## Hello');
      expect(htmlToMarkdown('<h3>Hello</h3>')).toBe('### Hello');
      expect(htmlToMarkdown('<h4>Hello</h4>')).toBe('#### Hello');
      expect(htmlToMarkdown('<h5>Hello</h5>')).toBe('##### Hello');
      expect(htmlToMarkdown('<h6>Hello</h6>')).toBe('###### Hello');
    });

    it('handles inline formatting within headers', () => {
      expect(htmlToMarkdown('<h2><strong>Bold</strong> Header</h2>')).toBe('## **Bold** Header');
    });
  });

  describe('bold and italic', () => {
    it('converts bold', () => {
      expect(htmlToMarkdown('<p><strong>bold text</strong></p>')).toBe('**bold text**');
    });

    it('converts italic', () => {
      expect(htmlToMarkdown('<p><em>italic text</em></p>')).toBe('*italic text*');
    });

    it('handles nested bold and italic', () => {
      expect(htmlToMarkdown('<p><strong><em>bold italic</em></strong></p>')).toBe('***bold italic***');
    });
  });

  describe('inline code', () => {
    it('converts inline code', () => {
      expect(htmlToMarkdown('<p>Use <code>console.log()</code> to debug</p>')).toBe('Use `console.log()` to debug');
    });

    it('unescapes HTML entities in code', () => {
      expect(htmlToMarkdown('<p><code>&lt;div&gt;</code></p>')).toBe('`<div>`');
    });
  });

  describe('code blocks', () => {
    it('converts fenced code blocks', () => {
      const input = '<pre><code>const x = 1;</code></pre>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('```\nconst x = 1;\n```');
    });

    it('handles code blocks with language', () => {
      const input = '<pre><code class="language-typescript">const x: number = 1;</code></pre>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('```typescript\nconst x: number = 1;\n```');
    });

    it('unescapes HTML entities in code blocks', () => {
      const input = '<pre><code>&lt;div&gt;test&lt;/div&gt;</code></pre>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('```\n<div>test</div>\n```');
    });
  });

  describe('lists', () => {
    it('converts unordered lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const result = htmlToMarkdown(input);
      expect(result).toContain('* Item 1');
      expect(result).toContain('* Item 2');
      expect(result).toContain('* Item 3');
    });

    it('converts ordered lists', () => {
      const input = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      const result = htmlToMarkdown(input);
      expect(result).toContain('1. First');
      expect(result).toContain('2. Second');
      expect(result).toContain('3. Third');
    });

    it('handles inline formatting in list items', () => {
      const input = '<ul><li><strong>Bold item</strong></li><li><em>Italic item</em></li></ul>';
      const result = htmlToMarkdown(input);
      expect(result).toContain('* **Bold item**');
      expect(result).toContain('* *Italic item*');
    });
  });

  describe('blockquotes', () => {
    it('converts blockquotes', () => {
      const input = '<blockquote><p>This is a quote</p></blockquote>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('> This is a quote');
    });
  });

  describe('links', () => {
    it('converts links', () => {
      const input = '<p><a href="https://google.com">Google</a></p>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('[Google](https://google.com)');
    });
  });

  describe('horizontal rules', () => {
    it('converts hr to ---', () => {
      expect(htmlToMarkdown('<hr>')).toBe('---');
      expect(htmlToMarkdown('<hr/>')).toBe('---');
    });
  });

  describe('paragraphs', () => {
    it('unwraps paragraph tags', () => {
      expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
    });

    it('handles multiple paragraphs', () => {
      const input = '<p>Paragraph 1</p><p>Paragraph 2</p>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('removes empty paragraphs', () => {
      expect(htmlToMarkdown('<p></p>')).toBe('');
      expect(htmlToMarkdown('<p> </p>')).toBe('');
    });
  });

  describe('mixed content', () => {
    it('handles a realistic converted document', () => {
      const input = `<h1>Title</h1>\n<p>Some introduction text.</p>\n<h2>Section 1</h2>\n<p>Content with <strong>bold</strong> and <em>italic</em>.</p>\n<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n</ul>\n<blockquote><p>A quote</p></blockquote>\n<pre><code>const x = 1;</code></pre>`;

      const result = htmlToMarkdown(input);
      expect(result).toContain('# Title');
      expect(result).toContain('Some introduction text.');
      expect(result).toContain('## Section 1');
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
      expect(result).toContain('* Item 1');
      expect(result).toContain('* Item 2');
      expect(result).toContain('> A quote');
      expect(result).toContain('```\nconst x = 1;\n```');
    });
  });

  describe('element separation', () => {
    it('separates hr from following header with newlines', () => {
      const input = `<hr><h2>Document Overview</h2>`;
      const result = htmlToMarkdown(input);
      // Should NOT produce ---## Document Overview
      expect(result).not.toContain('---##');
      // Should have --- on its own line followed by header
      expect(result).toContain('---\n\n## Document Overview');
    });

    it('separates consecutive headers with blank lines', () => {
      const input = `<h1>Title</h1><h2>Subtitle</h2>`;
      const result = htmlToMarkdown(input);
      expect(result).toContain('# Title\n\n## Subtitle');
    });

    it('separates header from paragraph', () => {
      const input = `<h2>Section</h2><p>Content here.</p>`;
      const result = htmlToMarkdown(input);
      expect(result).toContain('## Section\n\nContent here.');
    });

    it('separates list from paragraph', () => {
      const input = `<ul><li>Item</li></ul><p>After list.</p>`;
      const result = htmlToMarkdown(input);
      expect(result).toContain('* Item\n\nAfter list.');
    });

    it('separates blockquote from paragraph', () => {
      const input = `<blockquote><p>Quote</p></blockquote><p>After quote.</p>`;
      const result = htmlToMarkdown(input);
      expect(result).toContain('> Quote\n\nAfter quote.');
    });
  });

  describe('styled paragraphs (line height, indent, paragraph spacing)', () => {
    it('handles paragraph with line-height style', () => {
      const input = '<p style="line-height: 2;">Double spaced text</p>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('Double spaced text');
    });

    it('handles paragraph with indent (margin-left) style', () => {
      const input = '<p style="margin-left: 40px;">Indented text</p>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('Indented text');
    });

    it('handles paragraph with paragraph spacing style', () => {
      const input = '<p style="margin-top: 12px; margin-bottom: 12px;">Spaced text</p>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('Spaced text');
    });

    it('handles paragraph with combined styles', () => {
      const input = '<p style="line-height: 1.5; margin-left: 80px; margin-top: 16px; margin-bottom: 16px;">Styled paragraph</p>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('Styled paragraph');
    });

    it('handles heading with line-height style', () => {
      const input = '<h2 style="line-height: 2;">Styled heading</h2>';
      const result = htmlToMarkdown(input);
      expect(result).toBe('## Styled heading');
    });
  });

  describe('HTML entity unescaping', () => {
    it('unescapes &amp;', () => {
      expect(htmlToMarkdown('<p>Tom &amp; Jerry</p>')).toBe('Tom & Jerry');
    });

    it('unescapes &lt; and &gt;', () => {
      expect(htmlToMarkdown('<p>5 &gt; 3 &lt; 10</p>')).toBe('5 > 3 < 10');
    });

    it('unescapes &quot;', () => {
      expect(htmlToMarkdown('<p>Say &quot;hello&quot;</p>')).toBe('Say "hello"');
    });
  });
});
