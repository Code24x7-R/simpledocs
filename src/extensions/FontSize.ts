// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Mark } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size for the selected text
       */
      setFontSize: (fontSize: string) => ReturnType;
      /**
       * Unset the font size
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * FontSize mark - sets font size on selected text.
 *
 * IMPORTANT: The line height is fixed at 28 lines per page. Increasing
 * font size will cause text to wrap to more lines, potentially causing
 * overflow to additional pages. This is expected behavior - larger text
 * requires more space.
 *
 * Font size is applied as an inline style on a mark.
 */
export const FontSize = Mark.create({
  name: 'fontSize',

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}; line-height: inherit`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        style: 'font-size',
        getAttrs: (value) => {
          if (typeof value === 'string' && value) {
            return { fontSize: value };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().focus().setMark('fontSize', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().focus().unsetMark('fontSize').run(),
    };
  },
});

export default FontSize;
