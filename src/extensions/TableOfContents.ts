// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Node, mergeAttributes } from '@tiptap/core';

/**
 * TableOfContents — a block node that wraps auto-generated TOC entries.
 *
 * Renders as a styled container with a border to visually distinguish the
 * TOC from the rest of the document. Content can be regenerated after
 * insertion via the Table of Contents modal.
 */
export const TableOfContents = Node.create({
  name: 'tableOfContents',

  group: 'block',

  defining: true,

  content: 'tocEntry+',

  addAttributes() {
    return {
      class: {
        default: 'toc-container',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-toc]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-toc': '', class: 'toc-container' }),
      0,
    ];
  },
});

/**
 * TocEntry — a single Table of Contents line.
 *
 * An atom block (no editable content) that stores the heading level, anchor
 * id, title text, and page number as attributes. It renders as a flex row:
 * the title is an internal hyperlink to the heading anchor, a dot-leader
 * spans the gap, and the page number is right-aligned.
 *
 * Layout (CSS flex):
 *   [ <a href="#anchor">Title</a> ][ dot leader ][ page ]
 *
 * All data is persisted as data-* attributes on the wrapping div so the node
 * round-trips cleanly through serialization (atom, content: '').
 */
export const TocEntry = Node.create({
  name: 'tocEntry',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: (el) => Number(el.getAttribute('data-level')) || 1,
        renderHTML: (attrs) => ({ 'data-level': attrs.level }),
      },
      anchorId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-anchor-id') || '',
        renderHTML: (attrs) => ({ 'data-anchor-id': attrs.anchorId }),
      },
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-text') || '',
        renderHTML: (attrs) => ({ 'data-text': attrs.text }),
      },
      page: {
        default: 1,
        parseHTML: (el) => Number(el.getAttribute('data-page')) || 1,
        renderHTML: (attrs) => ({ 'data-page': attrs.page }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-toc-entry]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as Record<string, unknown>;
    const level = (attrs.level as number) || 1;
    const anchorId = (attrs.anchorId as string) || '';
    const text = (attrs.text as string) || '';
    const page = (attrs.page as number) || 1;

    // Indent reflects heading level (each level deeper = 1.25em indent).
    const indentEm = (level - 1) * 1.25;

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-toc-entry': '',
        class: 'toc-entry',
        style: `padding-left: ${indentEm}em`,
      }),
      [
        'a',
        { href: `#${anchorId}`, class: 'toc-entry-link' },
        text || '',
      ],
      ['span', { class: 'toc-leader' }],
      [
        'span',
        { class: 'toc-page' },
        String(page),
      ],
    ];
  },
});
