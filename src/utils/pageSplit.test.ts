import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { measureHtmlHeight, needsPagination } from './pageSplit';

describe('pageSplit', () => {
  describe('measureHtmlHeight', () => {
    it('returns a number for non-empty HTML', () => {
      const height = measureHtmlHeight('<p>Hello World</p>', 700);
      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThanOrEqual(0);
    });

    it('returns 0 or near-0 for empty HTML', () => {
      const height = measureHtmlHeight('', 700);
      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBeLessThan(10);
    });

    it('returns consistent measurements', () => {
      const height1 = measureHtmlHeight('<p>Test</p>', 700);
      const height2 = measureHtmlHeight('<p>Test</p>', 700);
      expect(height1).toBe(height2);
    });

    it('handles complex HTML', () => {
      const html = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text</p><ul><li>Item 1</li><li>Item 2</li></ul>';
      const height = measureHtmlHeight(html, 700);
      expect(height).toBeGreaterThanOrEqual(0);
    });
  });

  describe('needsPagination', () => {
    it('returns false when content fits', () => {
      expect(needsPagination(500, 1000)).toBe(false);
    });

    it('returns true when content overflows', () => {
      expect(needsPagination(1500, 1000)).toBe(true);
    });

    it('returns false at exact boundary', () => {
      expect(needsPagination(1000, 1000)).toBe(false);
    });

    it('returns true just over boundary', () => {
      expect(needsPagination(1001, 1000)).toBe(true);
    });
  });
});
