// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import { markdownToHtml, containsMarkdown } from './markdownToHtml';

describe('markdownToHtml', () => {
  describe('headers', () => {
    it('converts h1-h6 headers', () => {
      expect(markdownToHtml('# Hello')).toBe('<h1>Hello</h1>');
      expect(markdownToHtml('## Hello')).toBe('<h2>Hello</h2>');
      expect(markdownToHtml('### Hello')).toBe('<h3>Hello</h3>');
      expect(markdownToHtml('#### Hello')).toBe('<h4>Hello</h4>');
      expect(markdownToHtml('##### Hello')).toBe('<h5>Hello</h5>');
      expect(markdownToHtml('###### Hello')).toBe('<h6>Hello</h6>');
    });

    it('converts h1, h2, h3 headings specifically', () => {
      expect(markdownToHtml('# Heading 1')).toBe('<h1>Heading 1</h1>');
      expect(markdownToHtml('## Heading 2')).toBe('<h2>Heading 2</h2>');
      expect(markdownToHtml('### Heading 3')).toBe('<h3>Heading 3</h3>');
    });

    it('handles headings followed by content', () => {
      const input = '# Title\n\nSome paragraph text';
      const result = markdownToHtml(input);
      expect(result).toBe('<h1>Title</h1>\n<p>Some paragraph text</p>');
    });

    it('applies inline formatting within headers', () => {
      expect(markdownToHtml('## **Bold** Header')).toBe('<h2><strong>Bold</strong> Header</h2>');
    });
  });

  describe('bold and italic', () => {
    it('converts bold with **', () => {
      expect(markdownToHtml('**bold text**')).toBe('<p><strong>bold text</strong></p>');
    });

    it('converts bold with __', () => {
      expect(markdownToHtml('__bold text__')).toBe('<p><strong>bold text</strong></p>');
    });

    it('converts italic with *', () => {
      expect(markdownToHtml('*italic text*')).toBe('<p><em>italic text</em></p>');
    });

    it('converts italic with _', () => {
      expect(markdownToHtml('_italic text_')).toBe('<p><em>italic text</em></p>');
    });

    it('handles nested bold and italic', () => {
      const result = markdownToHtml('***bold italic***');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });
  });

  describe('inline code', () => {
    it('converts inline code spans', () => {
      expect(markdownToHtml('Use `console.log()` to debug')).toBe(
        '<p>Use <code>console.log()</code> to debug</p>'
      );
    });

    it('escapes HTML in code spans', () => {
      expect(markdownToHtml('`<div>`')).toBe('<p><code>&lt;div&gt;</code></p>');
    });
  });

  describe('code blocks', () => {
    it('converts fenced code blocks', () => {
      const input = '```\nconst x = 1;\n```';
      const result = markdownToHtml(input);
      expect(result).toContain('<pre><code>');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('</code></pre>');
    });

    it('handles code blocks with language', () => {
      const input = '```typescript\nconst x: number = 1;\n```';
      const result = markdownToHtml(input);
      expect(result).toContain('class="language-typescript"');
      expect(result).toContain('const x: number = 1;');
    });

    it('escapes HTML in code blocks', () => {
      const input = '```\n<div>test</div>\n```';
      const result = markdownToHtml(input);
      expect(result).toContain('&lt;div&gt;');
    });
  });

  describe('lists', () => {
    it('converts unordered lists', () => {
      const input = '- Item 1\n- Item 2\n- Item 3';
      const result = markdownToHtml(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<li>Item 3</li>');
      expect(result).toContain('</ul>');
    });

    it('converts ordered lists', () => {
      const input = '1. First\n2. Second\n3. Third';
      const result = markdownToHtml(input);
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>First</li>');
      expect(result).toContain('<li>Second</li>');
      expect(result).toContain('<li>Third</li>');
      expect(result).toContain('</ol>');
    });

    it('applies inline formatting in list items', () => {
      const input = '- **Bold item**\n- *Italic item*';
      const result = markdownToHtml(input);
      expect(result).toContain('<li><strong>Bold item</strong></li>');
      expect(result).toContain('<li><em>Italic item</em></li>');
    });

    it('handles unordered lists with blank lines between items', () => {
      const input = '- Item 1\n\n- Item 2\n\n- Item 3';
      const result = markdownToHtml(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<li>Item 3</li>');
      expect(result).toContain('</ul>');
    });

    it('handles ordered lists with blank lines between items', () => {
      const input = '1. First\n\n2. Second\n\n3. Third';
      const result = markdownToHtml(input);
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>First</li>');
      expect(result).toContain('<li>Second</li>');
      expect(result).toContain('<li>Third</li>');
      expect(result).toContain('</ol>');
    });

    it('does not treat a paragraph starting with a number as a list', () => {
      const input = '100 ways to improve your writing';
      const result = markdownToHtml(input);
      // Single line starting with number but no . should be paragraph
      expect(result).toBe('<p>100 ways to improve your writing</p>');
    });

    it('does not treat a single dash as a list', () => {
      const input = 'Some text - with a dash in it';
      const result = markdownToHtml(input);
      expect(result).toBe('<p>Some text - with a dash in it</p>');
    });

    it('treats mixed list/non-list as list when list marker present', () => {
      // First line is a list item, second is not (no blank line)
      // With lenient detection, this becomes a list
      const input = '- List item\nNot a list item';
      const result = markdownToHtml(input);
      // Lenient: any block with a list marker becomes a list
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>List item</li>');
    });

    it('separates list from non-list content with blank line', () => {
      // List item followed by blank line then non-list content
      const input = '- List item\n\nNot a list item';
      const result = markdownToHtml(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>List item</li>');
      expect(result).toContain('<p>Not a list item</p>');
    });

    it('handles LLM-style inconsistent list formatting', () => {
      // Only some items have * prefix (common in LLM output)
      const input = ' Core Objectives: (description)\n Subtext: (description)\n* Relational Dynamics: (description)';
      const result = markdownToHtml(input);
      // Should produce a list with all items
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Core Objectives: (description)</li>');
      // Leading whitespace is trimmed
      expect(result).toContain('<li>Subtext: (description)</li>');
      expect(result).toContain('<li>Relational Dynamics: (description)</li>');
    });

    it('handles mixed list and non-list content', () => {
      const input = 'Paragraph before\n\n- List item 1\n- List item 2\n\nParagraph after';
      const result = markdownToHtml(input);
      expect(result).toContain('<p>Paragraph before</p>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>List item 1</li>');
      expect(result).toContain('<li>List item 2</li>');
      expect(result).toContain('<p>Paragraph after</p>');
    });
  });

  describe('blockquotes', () => {
    it('converts blockquotes', () => {
      expect(markdownToHtml('> This is a quote')).toBe(
        '<blockquote><p>This is a quote</p></blockquote>'
      );
    });
  });

  describe('links', () => {
    it('converts links', () => {
      expect(markdownToHtml('[Google](https://google.com)')).toBe(
        '<p><a href="https://google.com">Google</a></p>'
      );
    });
  });

  describe('horizontal rules', () => {
    it('converts --- to hr', () => {
      expect(markdownToHtml('---')).toBe('<hr>');
    });

    it('converts *** to hr', () => {
      expect(markdownToHtml('***')).toBe('<hr>');
    });
  });

  describe('paragraphs', () => {
    it('wraps plain text in paragraph tags', () => {
      expect(markdownToHtml('Hello world')).toBe('<p>Hello world</p>');
    });

    it('handles multiple paragraphs', () => {
      const input = 'Paragraph 1\n\nParagraph 2';
      const result = markdownToHtml(input);
      expect(result).toBe('<p>Paragraph 1</p>\n<p>Paragraph 2</p>');
    });
  });

  describe('mixed content', () => {
    it('handles a realistic LLM response', () => {
      const input = `# Summary

Here are the key points:

1. **First point** with details
2. *Second point* with \`code\`
3. Third point

> Important note here

\`\`\`typescript
const example = "code";
\`\`\`
`;
      const result = markdownToHtml(input);
      expect(result).toContain('<h1>Summary</h1>');
      expect(result).toContain('<ol>');
      expect(result).toContain('<strong>First point</strong>');
      expect(result).toContain('<em>Second point</em>');
      expect(result).toContain('<code>code</code>');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('<pre><code');
      expect(result).toContain('class="language-typescript"');
    });
  });

  describe('HTML escaping', () => {
    it('escapes HTML in plain text', () => {
      expect(markdownToHtml('<script>alert("xss")</script>')).toBe(
        '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>'
      );
    });
  });
});

describe('LLM response samples', () => {
    it('handles inconsistent list formatting from LLM', () => {
      // LLM output where only some items have * prefix
      const input = `### 1. Character Psychology & Motivation
 Core Objectives: (The characters here are technological phases.)
 Subtext & Secrets: (The subtext lies in the struggle.)
* Relational Dynamics: (The dynamic is oppositional.)`;

      const result = markdownToHtml(input);
      // Should produce a heading (& escaped to &amp;)
      expect(result).toContain('<h3>1. Character Psychology &amp; Motivation</h3>');
      // Should handle the list items (even with inconsistent formatting)
      expect(result).toContain('<ul>');
      expect(result).toContain('Relational Dynamics');
    });

    it('converts the full fiction editor sample', () => {
      const input = `## Narrative Overview
This excerpt functions as an ambitious historical thesis rather than a traditional narrative scene.

The tone is academic and declarative.

### 1. Character Psychology & Motivation
 Core Objectives: (The characters here are technological phases.)
* Relational Dynamics: (The dynamic is oppositional.)`;

      const result = markdownToHtml(input);
      expect(result).toContain('<h2>Narrative Overview</h2>');
      // & is escaped to &amp; in HTML
      expect(result).toContain('<h3>1. Character Psychology &amp; Motivation</h3>');
      expect(result).toContain('<p>This excerpt functions as an ambitious historical thesis rather than a traditional narrative scene.</p>');
      expect(result).toContain('<p>The tone is academic and declarative.</p>');
    });

    it('handles bold with trailing colon (common in LLM output)', () => {
      const input = `**Stylistic Fingerprint:** (The style is expository.)
**Rhythmic Variance:** (Sentence structure is uniform.)`;
      const result = markdownToHtml(input);
      // Each line should be a paragraph with bold
      expect(result).toContain('<strong>Stylistic Fingerprint:</strong>');
      expect(result).toContain('<strong>Rhythmic Variance:</strong>');
    });
  });

  describe('containsMarkdown', () => {
  it('detects headers', () => {
    expect(containsMarkdown('# Hello')).toBe(true);
    expect(containsMarkdown('## World')).toBe(true);
  });

  it('detects bold', () => {
    expect(containsMarkdown('**bold**')).toBe(true);
  });

  it('detects italic', () => {
    expect(containsMarkdown('*italic*')).toBe(true);
  });

  it('detects inline code', () => {
    expect(containsMarkdown('`code`')).toBe(true);
  });

  it('detects code blocks', () => {
    expect(containsMarkdown('```\ncode\n```')).toBe(true);
  });

  it('detects lists', () => {
    expect(containsMarkdown('- item')).toBe(true);
    expect(containsMarkdown('1. item')).toBe(true);
  });

  it('detects blockquotes', () => {
    expect(containsMarkdown('> quote')).toBe(true);
  });

  it('detects horizontal rules', () => {
    expect(containsMarkdown('---')).toBe(true);
  });

  it('detects links', () => {
    expect(containsMarkdown('[text](url)')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(containsMarkdown('Just plain text here.')).toBe(false);
    expect(containsMarkdown('No markdown at all')).toBe(false);
  });
});
