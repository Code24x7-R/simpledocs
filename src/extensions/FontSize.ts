// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Extension } from '@tiptap/core';

/**
 * FontSize extension - sets font size on selected text.
 *
 * IMPORTANT: The line height is fixed at 28 lines per page. Increasing
 * font size will cause text to wrap to more lines, potentially causing
 * overflow to additional pages. This is expected behavior - larger text
 * requires more space.
 *
 * Font size is applied as an inline style (not a fixed attribute) so it
 * scales naturally within the fixed line grid.
 */
export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().focus().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().focus().unsetMark('textStyle').run(),
    };
  },
});

export default FontSize;
