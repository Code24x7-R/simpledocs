// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import { splitHtmlAtPageBreaks, calculatePageCount } from './autoPageBreak';

describe('autoPageBreak', () => {
  describe('splitHtmlAtPageBreaks', () => {
    it('returns single page when no breaks', () => {
      const html = '<p>Hello World</p>';
      const pages = splitHtmlAtPageBreaks(html);
      expect(pages).toHaveLength(1);
      expect(pages[0]).toBe('<p>Hello World</p>');
    });

    it('splits at page break markers', () => {
      const html =
        '<p>Page 1 content</p>' +
        '<div data-type="page-break"></div>' +
        '<p>Page 2 content</p>';
      const pages = splitHtmlAtPageBreaks(html);
      expect(pages).toHaveLength(2);
      expect(pages[0]).toContain('Page 1 content');
      expect(pages[1]).toContain('Page 2 content');
    });

    it('handles multiple page breaks', () => {
      const html =
        '<p>Page 1</p>' +
        '<div data-type="page-break"></div>' +
        '<p>Page 2</p>' +
        '<div data-type="page-break"></div>' +
        '<p>Page 3</p>';
      const pages = splitHtmlAtPageBreaks(html);
      expect(pages).toHaveLength(3);
    });

    it('filters out empty pages', () => {
      const html =
        '<p>Content</p>' +
        '<div data-type="page-break"></div>' +
        '<div data-type="page-break"></div>' +
        '<p>More content</p>';
      const pages = splitHtmlAtPageBreaks(html);
      expect(pages).toHaveLength(2);
    });

    it('handles page breaks with extra attributes', () => {
      const html =
        '<p>Page 1</p>' +
        '<div data-type="page-break" class="page-break" style="page-break-after: always;"></div>' +
        '<p>Page 2</p>';
      const pages = splitHtmlAtPageBreaks(html);
      expect(pages).toHaveLength(2);
    });
  });

  describe('calculatePageCount', () => {
    it('returns 1 for empty content', () => {
      expect(calculatePageCount(0, 1000)).toBe(1);
    });

    it('returns 1 when content fits', () => {
      expect(calculatePageCount(500, 1000)).toBe(1);
    });

    it('returns 2 when content exceeds one page', () => {
      expect(calculatePageCount(1500, 1000)).toBe(2);
    });

    it('returns exact page count', () => {
      expect(calculatePageCount(2000, 1000)).toBe(2);
      expect(calculatePageCount(2001, 1000)).toBe(3);
    });

    it('handles negative height', () => {
      expect(calculatePageCount(-100, 1000)).toBe(1);
    });

    it('handles exact boundary', () => {
      expect(calculatePageCount(1000, 1000)).toBe(1);
    });
  });
});
