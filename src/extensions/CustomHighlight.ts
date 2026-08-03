// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Highlight } from '@tiptap/extension-highlight';

/**
 * Custom Highlight extension that doesn't override text color.
 *
 * The default Tiptap Highlight extension renders with `color: inherit`
 * which can override existing text colors when highlight is applied.
 * This custom version only sets the background-color, preserving any
 * text color set by the textStyle mark.
 */
export const CustomHighlight = Highlight.extend({
  renderHTML({ HTMLAttributes }) {
    if (!HTMLAttributes.color) {
      return ['span', {}];
    }
    return [
      'mark',
      {
        'data-color': HTMLAttributes.color,
        style: `background-color: ${HTMLAttributes.color}`,
      },
    ];
  },
});

export default CustomHighlight;
