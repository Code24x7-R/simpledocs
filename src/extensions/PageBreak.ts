// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import PageBreakView from '../components/editor/nodes/PageBreakView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

/**
 * PageBreak node — visual indicator of a page boundary.
 *
 * In the true paginated model, pages are implicit (fixed-height containers).
 * This node is now purely visual — it renders as a horizontal divider but
 * does NOT affect pagination. Content flows automatically based on overflow.
 */
export const PageBreak = Node.create({
  name: 'pageBreak',

  group: 'block',

  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'page-break', class: 'page-break' },
        HTMLAttributes
      ),
    ];
  },

  addAttributes() {
    return {
      nodeIndex: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-node-index');
          return val ? parseInt(val, 10) : null;
        },
        renderHTML: (attributes) => {
          if (attributes.nodeIndex == null) return {};
          return { 'data-node-index': attributes.nodeIndex };
        },
      },
    };
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakView);
  },
});
