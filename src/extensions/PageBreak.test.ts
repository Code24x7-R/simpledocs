import { describe, it, expect } from 'vitest';
import { PageBreak } from './PageBreak';

describe('PageBreak extension', () => {
  it('has the correct name', () => {
    expect(PageBreak.name).toBe('pageBreak');
  });

  it('is a block-level node', () => {
    expect(PageBreak.config.group).toBe('block');
  });

  it('renders a div with page-break class', () => {
    const renderHTML = PageBreak.config.renderHTML;
    expect(renderHTML).toBeDefined();

    const result = (renderHTML as any).call(
      { options: {} },
      { HTMLAttributes: {} }
    ) as [string, Record<string, unknown>];

    expect(result[0]).toBe('div');
    expect(result[1]['data-type']).toBe('page-break');
    expect(result[1]['class']).toBe('page-break');
  });

  it('has keyboard shortcut Mod-Enter', () => {
    const shortcuts = PageBreak.config.addKeyboardShortcuts;
    expect(shortcuts).toBeDefined();
    const result = (shortcuts as any).call({ editor: {} });
    expect(result).toHaveProperty('Mod-Enter');
  });
});
