import { describe, it, expect } from 'vitest';
import { TemplateField } from './TemplateField';

describe('TemplateField extension', () => {
  it('has the correct name', () => {
    expect(TemplateField.name).toBe('templateField');
  });

  it('is inline and atom', () => {
    const config = TemplateField.config;
    expect(config.group).toBe('inline');
    expect(config.atom).toBe(true);
  });

  it('has a fieldName attribute', () => {
    type AddAttrsFn = () => Record<string, { default: unknown }>;
    const fn = TemplateField.config.addAttributes as AddAttrsFn | undefined;
    const attrs = fn ? fn.call({ name: 'templateField', options: { HTMLAttributes: {} }, storage: {}, parent: undefined } as any) : {};
    expect(attrs).toBeDefined();
    expect(attrs).toHaveProperty('fieldName');
    expect(attrs['fieldName']).toEqual(expect.objectContaining({ default: '' }));
  });

  it('can be created via commands configuration', () => {
    const config = TemplateField.config;
    expect(config.addCommands).toBeDefined();
  });

  it('has a node view defined', () => {
    const config = TemplateField.config;
    expect(config.addNodeView).toBeDefined();
  });

  it('renders HTML with data-field-name attribute', () => {
    const renderHTML = TemplateField.config.renderHTML;
    expect(renderHTML).toBeDefined();

    const mockNode = { attrs: { fieldName: 'client_name' } } as any;
    const HTMLAttributes = { 'data-field-name': 'client_name' };
    const result = (renderHTML as any).call(
      { options: { HTMLAttributes: {} } },
      { node: mockNode, HTMLAttributes }
    ) as [string, Record<string, unknown>, string];

    expect(result[0]).toBe('span');
    expect(result[2]).toBe('{{client_name}}');
    const attrs = result[1];
    expect(attrs['data-type']).toBe('template-field');
    expect(attrs['data-field-name']).toBe('client_name');
  });

  it('parses HTML back to attributes', () => {
    const parseHTML = TemplateField.config.parseHTML;
    expect(parseHTML).toBeDefined();
    const result = (parseHTML as any).call({ options: {} });
    expect(result).toEqual([{ tag: 'span[data-type="template-field"]' }]);
  });
});
