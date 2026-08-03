// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
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
    const mockThis = { name: 'templateField', options: { HTMLAttributes: {} }, storage: {}, parent: undefined };
    const attrs = fn ? fn.call(mockThis) : {};
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

    const mockNode = { attrs: { fieldName: 'client_name' } };
    const HTMLAttributes = { 'data-field-name': 'client_name' };
    const renderFn = renderHTML as unknown as (args: {
      node: { attrs: { fieldName: string } };
      HTMLAttributes: Record<string, string>;
    }) => [string, Record<string, unknown>, string];
    const result = renderFn.call({ options: { HTMLAttributes: {} } }, { node: mockNode, HTMLAttributes });

    expect(result[0]).toBe('span');
    expect(result[2]).toBe('{{client_name}}');
    const attrs = result[1];
    expect(attrs['data-type']).toBe('template-field');
    expect(attrs['data-field-name']).toBe('client_name');
  });

  it('parses HTML back to attributes', () => {
    const parseHTML = TemplateField.config.parseHTML;
    expect(parseHTML).toBeDefined();
    const result = (parseHTML as () => Array<{ tag: string }>).call({ options: {} });
    expect(result).toEqual([{ tag: 'span[data-type="template-field"]' }]);
  });
});
