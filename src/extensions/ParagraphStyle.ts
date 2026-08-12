// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Extension, type Editor } from '@tiptap/core';
import '@tiptap/extension-text-style';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphStyle: {
      /**
       * Set the line height for the selected paragraph(s)
       */
      setLineHeight: (lineHeight: string) => ReturnType;
      /**
       * Unset the line height
       */
      unsetLineHeight: () => ReturnType;
      /**
       * Set the indent level (in pixels) for the selected paragraph(s)
       */
      setIndent: (indent: number) => ReturnType;
      /**
       * Increase indent by one step (40px)
       */
      increaseIndent: () => ReturnType;
      /**
       * Decrease indent by one step (40px)
       */
      decreaseIndent: () => ReturnType;
      /**
       * Set paragraph spacing (space before/after in pixels)
       */
      setParagraphSpacing: (spacing: { before: number; after: number }) => ReturnType;
      /**
       * Unset paragraph spacing
       */
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

/**
 * ParagraphStyle extension — adds lineHeight, indent, and paragraphSpacing
 * attributes to paragraph and heading nodes.
 *
 * These are block-level formatting properties that apply to entire
 * paragraphs, not inline text.
 */
export const ParagraphStyle = Extension.create({
  name: 'paragraphStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
          indent: {
            default: 0,
            parseHTML: (element) => {
              const marginLeft = element.style.marginLeft;
              if (marginLeft && marginLeft.endsWith('px')) {
                return parseInt(marginLeft, 10);
              }
              return 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent === 0) return {};
              return { style: `margin-left: ${attributes.indent}px` };
            },
          },
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => {
              const before = element.style.marginTop;
              const after = element.style.marginBottom;
              if (before || after) {
                return {
                  before: before && before.endsWith('px') ? parseInt(before, 10) : 0,
                  after: after && after.endsWith('px') ? parseInt(after, 10) : 0,
                };
              }
              return null;
            },
            renderHTML: (attributes) => {
              if (!attributes.paragraphSpacing) return {};
              const { before, after } = attributes.paragraphSpacing as { before: number; after: number };
              const style: string[] = [];
              if (before && before > 0) style.push(`margin-top: ${before}px`);
              if (after && after > 0) style.push(`margin-bottom: ${after}px`);
              if (style.length === 0) return {};
              return { style: style.join('; ') };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    /**
     * Helper: get the active block node type (paragraph or heading)
     * and its current attributes.
     */
    const getBlockTypeAndAttributes = (
      editor: Editor
    ): { type: 'paragraph' | 'heading'; attrs: Record<string, unknown> } => {
      const pHasAttrs = editor.getAttributes('paragraph');
      // If the paragraph has our custom attributes OR no heading attrs, use paragraph
      if (editor.isActive('paragraph') || !editor.getAttributes('heading')?.level) {
        return { type: 'paragraph', attrs: pHasAttrs };
      }
      return { type: 'heading', attrs: editor.getAttributes('heading') };
    };

    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ editor, commands }) => {
          const { type } = getBlockTypeAndAttributes(editor);
          return commands.updateAttributes(type, { lineHeight });
        },
      unsetLineHeight:
        () =>
        ({ editor, commands }) => {
          const { type } = getBlockTypeAndAttributes(editor);
          return commands.updateAttributes(type, { lineHeight: null });
        },
      setIndent:
        (indent: number) =>
        ({ editor, commands }) => {
          const { type } = getBlockTypeAndAttributes(editor);
          return commands.updateAttributes(type, { indent });
        },
      increaseIndent:
        () =>
        ({ editor, commands }) => {
          const { type, attrs } = getBlockTypeAndAttributes(editor);
          const current = (attrs.indent as number) ?? 0;
          return commands.updateAttributes(type, { indent: current + 40 });
        },
      decreaseIndent:
        () =>
        ({ editor, commands }) => {
          const { type, attrs } = getBlockTypeAndAttributes(editor);
          const current = (attrs.indent as number) ?? 0;
          return commands.updateAttributes(type, { indent: Math.max(0, current - 40) });
        },
      setParagraphSpacing:
        (spacing: { before: number; after: number }) =>
        ({ editor, commands }) => {
          const { type } = getBlockTypeAndAttributes(editor);
          return commands.updateAttributes(type, { paragraphSpacing: spacing });
        },
      unsetParagraphSpacing:
        () =>
        ({ editor, commands }) => {
          const { type } = getBlockTypeAndAttributes(editor);
          return commands.updateAttributes(type, { paragraphSpacing: null });
        },
    };
  },
});

export default ParagraphStyle;
