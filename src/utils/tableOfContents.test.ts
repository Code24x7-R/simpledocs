// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  extractHeadings,
  buildTocContent,
  assignHeadingAnchors,
  wrapTocInContainer,
  hasExistingToc,
  removeExistingToc,
  type TocEntry,
} from './tableOfContents';

const sampleDoc = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Introduction' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Some intro text.' }],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Background' }],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'History' }],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Methods' }],
    },
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Results' }],
    },
  ],
};

describe('extractHeadings', () => {
  it('extracts all headings from a document', () => {
    const entries = extractHeadings(sampleDoc);
    expect(entries).toHaveLength(5);
    expect(entries[0]).toEqual({
      level: 1,
      text: 'Introduction',
      anchorId: 'introduction',
      page: 1,
    });
    expect(entries[1].text).toBe('Background');
    expect(entries[1].level).toBe(2);
  });

  it('filters by minLevel', () => {
    const entries = extractHeadings(sampleDoc, { minLevel: 2 });
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.level >= 2)).toBe(true);
  });

  it('filters by maxLevel', () => {
    const entries = extractHeadings(sampleDoc, { maxLevel: 2 });
    expect(entries).toHaveLength(4);
    expect(entries.every((e) => e.level <= 2)).toBe(true);
  });

  it('filters by minLevel and maxLevel together', () => {
    const entries = extractHeadings(sampleDoc, { minLevel: 2, maxLevel: 2 });
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.level === 2)).toBe(true);
  });

  it('returns empty array for document with no headings', () => {
    const emptyDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Just text.' }] }],
    };
    expect(extractHeadings(emptyDoc)).toEqual([]);
  });

  it('handles empty document', () => {
    expect(extractHeadings({ type: 'doc', content: [] })).toEqual([]);
  });

  it('generates unique anchor IDs for duplicate headings', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Same' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Same' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Same' }] },
      ],
    };
    const entries = extractHeadings(doc);
    expect(entries[0].anchorId).toBe('same');
    expect(entries[1].anchorId).toBe('same-1');
    expect(entries[2].anchorId).toBe('same-2');
  });

  it('assigns page 1 to all headings when no page breaks', () => {
    const entries = extractHeadings(sampleDoc);
    expect(entries.every((e) => e.page === 1)).toBe(true);
  });

  it('increments page number at page breaks', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Page 1 Heading' }] },
        { type: 'pageBreak' },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Page 2 Heading' }] },
        { type: 'pageBreak' },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Page 3 Heading' }] },
      ],
    };
    const entries = extractHeadings(doc);
    expect(entries[0].page).toBe(1);
    expect(entries[1].page).toBe(2);
    expect(entries[2].page).toBe(3);
  });

  it('estimates page numbers from line counts when no page breaks', () => {
    // Create a document with enough content to span multiple pages
    // A4 = 28 lines per page. Each paragraph ~1 line, each h1 = 2 lines
    const content: unknown[] = [];
    // Fill page 1: 28 lines of paragraphs
    for (let i = 0; i < 28; i++) {
      content.push({ type: 'paragraph', content: [{ type: 'text', text: `Line ${i}` }] });
    }
    // Heading on page 2
    content.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Page 2 Heading' }] });
    const doc = { type: 'doc', content };
    const entries = extractHeadings(doc);
    expect(entries[0].page).toBe(2);
  });

  it('strips special characters from anchor IDs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Hello, World! @2024' }],
        },
      ],
    };
    const entries = extractHeadings(doc);
    expect(entries[0].anchorId).toBe('hello-world-2024');
  });

  it('handles headings with nested marks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [
            { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
          ],
        },
      ],
    };
    const entries = extractHeadings(doc);
    expect(entries[0].text).toBe('Bold and italic');
  });

  it('generates fallback anchor for empty heading text', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 1 }, content: [] }],
    };
    const entries = extractHeadings(doc);
    expect(entries[0].anchorId).toBe('heading');
  });
});

describe('buildTocContent', () => {
  it('returns an array with a tocEntry per heading', () => {
    const entries: TocEntry[] = [
      { level: 1, text: 'Intro', anchorId: 'intro', page: 1 },
      { level: 2, text: 'Background', anchorId: 'background', page: 1 },
    ];
    const content = buildTocContent(entries);
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(2);
    const first = content[0];
    expect(first.type).toBe('tocEntry');
    expect(first.attrs).toEqual({
      level: 1,
      anchorId: 'intro',
      text: 'Intro',
      page: 1,
    });
  });

  it('stores anchor id and text as tocEntry attributes', () => {
    const entries: TocEntry[] = [{ level: 1, text: 'Intro', anchorId: 'intro', page: 1 }];
    const content = buildTocContent(entries);
    expect(content).toHaveLength(1);
    const attrs = content[0].attrs as Record<string, unknown>;
    expect(attrs.anchorId).toBe('intro');
    expect(attrs.text).toBe('Intro');
    expect(attrs.page).toBe(1);
    expect(attrs.level).toBe(1);
  });

  it('preserves heading level per entry', () => {
    const entries: TocEntry[] = [
      { level: 1, text: 'Top', anchorId: 'top', page: 1 },
      { level: 3, text: 'Deep', anchorId: 'deep', page: 2 },
    ];
    const content = buildTocContent(entries);
    expect((content[0].attrs as Record<string, unknown>).level).toBe(1);
    expect((content[1].attrs as Record<string, unknown>).level).toBe(3);
  });

  it('returns placeholder tocEntry when no entries', () => {
    const content = buildTocContent([]);
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe('tocEntry');
    expect((content[0].attrs as Record<string, unknown>).text).toBe(
      'No headings found in document.'
    );
  });
});

describe('assignHeadingAnchors', () => {
  it('assigns id attributes to heading nodes', () => {
    const entries: TocEntry[] = [
      { level: 1, text: 'Intro', anchorId: 'intro', page: 1 },
      { level: 2, text: 'Background', anchorId: 'background', page: 1 },
    ];
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Background' }] },
      ],
    };
    const result = assignHeadingAnchors(doc, entries);
    const headings = (result.content as Record<string, unknown>[]).filter(
      (n) => n.type === 'heading'
    );
    expect((headings[0].attrs as Record<string, unknown>).id).toBe('intro');
    expect((headings[1].attrs as Record<string, unknown>).id).toBe('background');
  });

  it('does not mutate the original document', () => {
    const entries: TocEntry[] = [{ level: 1, text: 'Intro', anchorId: 'intro', page: 1 }];
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };
    assignHeadingAnchors(doc, entries);
    expect((doc.content as Record<string, unknown>[])[0].attrs).toEqual({ level: 1 });
  });

  it('handles empty entries array', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };
    const result = assignHeadingAnchors(doc, []);
    expect(result).toEqual(JSON.parse(JSON.stringify(doc)));
  });
});

describe('wrapTocInContainer', () => {
  it('wraps an array of tocEntry nodes in a tableOfContents container', () => {
    const tocEntries = [
      { type: 'tocEntry', attrs: { level: 1, anchorId: 'a', text: 'A', page: 1 } },
    ];
    const wrapped = wrapTocInContainer(tocEntries);
    expect(wrapped.type).toBe('tableOfContents');
    expect(wrapped.content).toEqual(tocEntries);
  });

  it('wraps an empty entries array', () => {
    const wrapped = wrapTocInContainer([]);
    expect(wrapped.type).toBe('tableOfContents');
    expect(wrapped.content).toEqual([]);
  });
});

describe('hasExistingToc', () => {
  it('returns true when document has a TOC node', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'tableOfContents', content: [{ type: 'bulletList', content: [] }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };
    expect(hasExistingToc(doc)).toBe(true);
  });

  it('returns false when document has no TOC node', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };
    expect(hasExistingToc(doc)).toBe(false);
  });

  it('returns false for empty document', () => {
    expect(hasExistingToc({ type: 'doc', content: [] })).toBe(false);
  });

  it('detects nested TOC nodes', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            { type: 'tableOfContents', content: [{ type: 'bulletList', content: [] }] },
          ],
        },
      ],
    };
    expect(hasExistingToc(doc)).toBe(true);
  });
});

describe('removeExistingToc', () => {
  it('removes TOC nodes from the document', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'tableOfContents', content: [{ type: 'bulletList', content: [] }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };
    const result = removeExistingToc(doc);
    expect((result.content as unknown[]).length).toBe(1);
    expect(((result.content as unknown[])[0] as Record<string, unknown>).type).toBe('heading');
  });

  it('does not mutate the original document', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'tableOfContents', content: [{ type: 'bulletList', content: [] }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };
    removeExistingToc(doc);
    expect((doc.content as unknown[]).length).toBe(2);
  });

  it('returns unchanged document when no TOC exists', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };
    const result = removeExistingToc(doc);
    expect((result.content as unknown[]).length).toBe(1);
  });
});
