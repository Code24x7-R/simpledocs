// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Table of Contents utility — scans a Tiptap document JSON tree for heading
 * nodes, assigns unique anchor IDs, and builds a TOC content structure with
 * internal hyperlinks.
 */

export interface TocEntry {
  /** Heading level (1-6) */
  level: number;
  /** Heading text content */
  text: string;
  /** Unique anchor ID assigned to the heading */
  anchorId: string;
  /** Page number (1-based) where the heading appears */
  page: number;
}

export interface TocOptions {
  /** Minimum heading level to include (default: 1) */
  minLevel?: number;
  /** Maximum heading level to include (default: 6) */
  maxLevel?: number;
}

/**
 * Extract text content from a Tiptap node's children.
 */
function extractText(node: Record<string, unknown>): string {
  if (node.type === 'text') {
    return (node.text as string) || '';
  }
  if (node.content && Array.isArray(node.content)) {
    return (node.content as Record<string, unknown>[]).map(extractText).join('');
  }
  return '';
}

/**
 * Generate a URL-safe anchor ID from heading text.
 * If the base slug already exists in the set, appends a numeric suffix.
 */
function generateAnchorId(text: string, existingIds: Set<string>): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'heading';

  let id = base;
  let counter = 1;
  while (existingIds.has(id)) {
    id = `${base}-${counter}`;
    counter++;
  }
  existingIds.add(id);
  return id;
}

/**
 * Estimate lines consumed by a node for page estimation.
 * Headings take more visual space; paragraphs estimate based on text length.
 * Inline/text nodes return 0 since their parent block accounts for them.
 */
function estimateNodeLines(node: Record<string, unknown>): number {
  // Inline nodes — parent block already accounts for their content
  if (node.type === 'text' || node.type === 'hardBreak') return 0;

  if (node.type === 'heading') {
    // Headings: level 1 = 2 lines, level 2 = 1.5, others = 1
    const level = (node.attrs as Record<string, unknown>)?.level as number | undefined;
    if (level === 1) return 2;
    if (level === 2) return 1.5;
    return 1;
  }
  if (node.type === 'paragraph') {
    const text = extractText(node);
    // Assume ~80 chars per line for default font
    return Math.max(1, Math.ceil(text.length / 80));
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const items = (node.content as unknown[] | undefined) ?? [];
    return items.length;
  }
  if (node.type === 'table') {
    const rows = (node.content as unknown[] | undefined) ?? [];
    return rows.length;
  }
  if (node.type === 'blockquote') {
    const text = extractText(node);
    return Math.max(1, Math.ceil(text.length / 70));
  }
  if (node.type === 'codeBlock') {
    const text = extractText(node);
    return Math.max(1, text.split('\n').length);
  }
  if (node.type === 'horizontalRule' || node.type === 'pageBreak') {
    return 1;
  }
  return 1;
}

/**
 * Walk the document JSON tree and collect all heading nodes with their
 * text, level, and page number — filtered by the given level range.
 *
 * Page numbers are computed by counting explicit page breaks. If no page
 * breaks exist, pages are estimated from accumulated line counts assuming
 * A4 portrait (28 lines per page).
 */
export function extractHeadings(
  doc: Record<string, unknown>,
  options: TocOptions = {}
): TocEntry[] {
  const { minLevel = 1, maxLevel = 6 } = options;
  const entries: TocEntry[] = [];
  const existingIds = new Set<string>();

  // First pass: count explicit page breaks to determine pagination mode
  let totalPageBreaks = 0;
  function scanStats(nodes: unknown[]) {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;
      if (n.type === 'pageBreak') totalPageBreaks++;
      if (n.content && Array.isArray(n.content)) {
        scanStats(n.content as unknown[]);
      }
    }
  }
  if (doc.content && Array.isArray(doc.content)) {
    scanStats(doc.content as unknown[]);
  }

  const LINES_PER_PAGE = 28; // A4 portrait default
  const hasPageBreaks = totalPageBreaks > 0;

  // Second pass: assign page numbers to headings
  let currentPage = 1;
  let linesAccumulated = 0;

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;

      if (n.type === 'pageBreak') {
        currentPage++;
        linesAccumulated = 0;
        continue;
      }

      // Estimate lines for this node (for line-based page tracking)
      if (hasPageBreaks) {
        // When page breaks exist, track lines to warn about overflow but
        // rely on explicit breaks for page numbers
        linesAccumulated += estimateNodeLines(n);
      } else {
        // No page breaks — estimate page from accumulated lines
        linesAccumulated += estimateNodeLines(n);
        currentPage = Math.floor(linesAccumulated / LINES_PER_PAGE) + 1;
      }

      if (n.type === 'heading') {
        const level = (n.attrs as Record<string, unknown>)?.level as number | undefined;
        if (level && level >= minLevel && level <= maxLevel) {
          const text = extractText(n);
          const anchorId = generateAnchorId(text, existingIds);
          entries.push({ level, text, anchorId, page: currentPage });
        }
      }
      if (n.content && Array.isArray(n.content)) {
        walk(n.content as unknown[]);
      }
    }
  }

  // Reset for the actual walk
  currentPage = 1;
  linesAccumulated = 0;

  if (doc.content && Array.isArray(doc.content)) {
    walk(doc.content as unknown[]);
  }

  return entries;
}

/**
 * Build a Tiptap JSON fragment for the table of contents.
 *
 * The TOC is a nested bullet list where each item is a link to a heading
 * anchor. Indentation reflects heading level.
 */
export function buildTocContent(entries: TocEntry[]): Record<string, unknown> {
  if (entries.length === 0) {
    return {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'No headings found in document.' },
              ],
            },
          ],
        },
      ],
    };
  }

  const minLevel = Math.min(...entries.map((e) => e.level));

  const listItems = entries.map((entry) => {
    const indent = entry.level - minLevel;
    // Build the text with a tab/space + page number after the heading text
    const pageNum = entry.page;
    return {
      type: 'listItem',
      attrs: indent > 0 ? { indent } : undefined,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: `#${entry.anchorId}`,
                    class: undefined,
                    target: null,
                  },
                },
              ],
              text: entry.text,
            },
            {
              type: 'text',
              text: `\t${pageNum}`,
            },
          ],
        },
      ],
    };
  });

  return {
    type: 'bulletList',
    content: listItems,
  };
}

/**
 * Assign anchor IDs to heading nodes in a document JSON tree.
 *
 * Returns a deep copy of the document with `id` attributes added to heading
 * nodes. Only assigns IDs to headings that match the given entries.
 */
export function assignHeadingAnchors(
  doc: Record<string, unknown>,
  entries: TocEntry[]
): Record<string, unknown> {
  // Deep clone to avoid mutating the original
  const cloned = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;

  let entryIndex = 0;

  function walk(nodes: unknown[]): boolean {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;
      if (n.type === 'heading' && entryIndex < entries.length) {
        const entry = entries[entryIndex];
        const level = (n.attrs as Record<string, unknown>)?.level as number | undefined;
        if (level === entry.level) {
          // Verify text matches to ensure correct assignment
          const text = extractText(n);
          if (text === entry.text) {
            (n.attrs as Record<string, unknown>).id = entry.anchorId;
            entryIndex++;
          }
        }
      }
      if (n.content && Array.isArray(n.content)) {
        walk(n.content as unknown[]);
      }
    }
    return entryIndex >= entries.length;
  }

  if (cloned.content && Array.isArray(cloned.content)) {
    walk(cloned.content as unknown[]);
  }

  return cloned;
}

/**
 * Wrap TOC content in a styled container for visual distinction.
 */
export function wrapTocInContainer(
  tocContent: Record<string, unknown>
): Record<string, unknown> {
  return {
    type: 'tableOfContents',
    content: [tocContent],
  };
}

/**
 * Check whether the document already contains a table of contents node.
 */
export function hasExistingToc(doc: Record<string, unknown>): boolean {
  function walk(nodes: unknown[]): boolean {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;
      if (n.type === 'tableOfContents') return true;
      if (n.content && Array.isArray(n.content)) {
        if (walk(n.content as unknown[])) return true;
      }
    }
    return false;
  }

  if (doc.content && Array.isArray(doc.content)) {
    return walk(doc.content as unknown[]);
  }
  return false;
}

/**
 * Remove existing table of contents nodes from the document.
 * Returns a new document with all TOC nodes stripped.
 */
export function removeExistingToc(doc: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;

  function filterNodes(nodes: unknown[]): unknown[] {
    const result: unknown[] = [];
    for (const node of nodes) {
      if (!node || typeof node !== 'object') {
        result.push(node);
        continue;
      }
      const n = node as Record<string, unknown>;
      if (n.type === 'tableOfContents') {
        // Skip this node entirely
        continue;
      }
      if (n.content && Array.isArray(n.content)) {
        const filtered = filterNodes(n.content as unknown[]);
        result.push({ ...n, content: filtered });
      } else {
        result.push(node);
      }
    }
    return result;
  }

  if (cloned.content && Array.isArray(cloned.content)) {
    (cloned.content as unknown[]) = filterNodes(cloned.content as unknown[]);
  }

  return cloned;
}
