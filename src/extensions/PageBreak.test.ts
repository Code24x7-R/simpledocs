// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
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

    type RenderHTMLFn = (args: {
      HTMLAttributes: Record<string, unknown>;
    }) => [string, Record<string, unknown>];
    const result = (renderHTML as RenderHTMLFn).call({ options: {} }, { HTMLAttributes: {} });

    expect(result[0]).toBe('div');
    expect(result[1]['data-type']).toBe('page-break');
    expect(result[1]['class']).toBe('page-break');
  });

  it('has no keyboard shortcut (visual-only in paginated model)', () => {
    const shortcuts = PageBreak.config.addKeyboardShortcuts;
    expect(shortcuts).toBeUndefined();
  });
});
