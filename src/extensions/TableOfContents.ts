// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Node, mergeAttributes } from '@tiptap/core';

/**
 * TableOfContents — a block node that wraps the auto-generated TOC list.
 *
 * Renders as a styled container with a title and border to visually
 * distinguish the TOC from the rest of the document. Content can be
 * manually edited after generation.
 */
export const TableOfContents = Node.create({
  name: 'tableOfContents',

  group: 'block',

  defining: true,

  content: 'block+',

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
