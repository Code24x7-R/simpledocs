// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

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
 * FontSize extension - adds fontSize attribute to the textStyle mark.
 *
 * IMPORTANT: The line height is fixed at 28 lines per page. Increasing
 * font size will cause text to wrap to more lines, potentially causing
 * overflow to additional pages. This is expected behavior - larger text
 * requires more space.
 *
 * This extends the textStyle mark to include fontSize, so it works
 * alongside font family and color.
 */
export const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
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
