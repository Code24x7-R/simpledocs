import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import TemplateFieldView from '../components/editor/nodes/TemplateFieldView';

export interface TemplateFieldOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    templateField: {
      insertTemplateField: (fieldName: string) => ReturnType;
    };
  }
}

export const TemplateField = Node.create<TemplateFieldOptions>({
  name: 'templateField',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      fieldName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-field-name'),
        renderHTML: (attributes) => ({
          'data-field-name': attributes.fieldName,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="template-field"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'template-field', class: 'template-field' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `{{${node.attrs.fieldName}}}`,
    ];
  },

  addCommands() {
    return {
      insertTemplateField:
        (fieldName) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { fieldName },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TemplateFieldView);
  },
});
