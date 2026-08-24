// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Extension, type Editor } from '@tiptap/core';
import '@tiptap/extension-heading';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    headingStyle: {
      /**
       * Set heading level on the current block only.
       * Constrains the change to the current paragraph/heading,
       * preventing style bleeding into adjacent blocks.
       */
      setBlockHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => ReturnType;
      /**
       * Remove heading (convert to paragraph) on the current block only.
       */
      unsetBlockHeading: () => ReturnType;
    };
  }
}

/**
 * HeadingStyle extension — provides block-scoped heading commands.
 *
 * Unlike the default toggleHeading which can affect adjacent blocks
 * in certain edge cases, setHeading constrains the change to the
 * current block only using blockRange.
 */
export const HeadingStyle = Extension.create({
  name: 'headingStyle',

  addCommands() {
    /**
     * Get the block range for the current selection.
     * This ensures we only affect the block containing the cursor.
     */
    const getBlockRange = (editor: Editor) => {
      const { $from } = editor.state.selection;
      // blockRange resolves to the range of the current block node
      return $from.blockRange($from);
    };

    return {
      setBlockHeading:
        (level: 1 | 2 | 3 | 4 | 5 | 6) =>
        ({ editor, state, dispatch }) => {
          const headingType = state.schema.nodes.heading;
          if (!headingType) return false;

          // Check if we're already a heading of this level
          const currentAttrs = editor.getAttributes('heading');
          if (currentAttrs.level === level) {
            // Already this heading level — do nothing
            return true;
          }

          // Use the standard setNode command which respects block boundaries
          // The key is to use the current block range, not the selection range
          const blockRange = getBlockRange(editor);
          if (!blockRange) return false;

          // Apply heading to the current block only
          const tr = state.tr;
          tr.setBlockType(blockRange.start, blockRange.end, headingType, { level });
          if (dispatch) {
            dispatch(tr.scrollIntoView());
          }
          return true;
        },
      unsetBlockHeading:
        () =>
        ({ editor, state, dispatch }) => {
          const paragraphType = state.schema.nodes.paragraph;
          if (!paragraphType) return false;

          // Only convert if we're actually in a heading
          if (!editor.isActive('heading')) return false;

          const blockRange = getBlockRange(editor);
          if (!blockRange) return false;

          const tr = state.tr;
          tr.setBlockType(blockRange.start, blockRange.end, paragraphType, {});
          if (dispatch) {
            dispatch(tr.scrollIntoView());
          }
          return true;
        },
    };
  },
});

export default HeadingStyle;
