// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  calculatePageBreaks,
  doesContentOverflow,
  calculateAvailableHeight,
  splitContentIntoPages,
} from './pageOverflow';

describe('pageOverflow', () => {
  describe('calculatePageBreaks', () => {
    it('returns 1 page when content fits', () => {
      expect(calculatePageBreaks(500, 1000, { top: 20, bottom: 20 })).toBe(1);
    });

    it('returns 2 pages when content exceeds one page', () => {
      // Content height 1500, available height 960 (1000 - 20 - 20)
      expect(calculatePageBreaks(1500, 1000, { top: 20, bottom: 20 })).toBe(2);
    });

    it('returns correct page count for large content', () => {
      // Content height 3000, available height 960
      expect(calculatePageBreaks(3000, 1000, { top: 20, bottom: 20 })).toBe(4);
    });

    it('handles exact page boundary', () => {
      // Content exactly fills 2 pages
      const available = 1000 - 20 - 20; // 960
      expect(calculatePageBreaks(available * 2, 1000, { top: 20, bottom: 20 })).toBe(2);
    });
  });

  describe('doesContentOverflow', () => {
    it('returns false when content fits', () => {
      expect(doesContentOverflow(500, 1000)).toBe(false);
    });

    it('returns true when content overflows', () => {
      expect(doesContentOverflow(1200, 1000)).toBe(true);
    });

    it('returns false at exact boundary', () => {
      expect(doesContentOverflow(1000, 1000)).toBe(false);
    });

    it('returns true just over boundary', () => {
      expect(doesContentOverflow(1001, 1000)).toBe(true);
    });
  });

  describe('calculateAvailableHeight', () => {
    it('subtracts margins from page height', () => {
      expect(calculateAvailableHeight(1000, 50, 50)).toBe(900);
    });

    it('subtracts header and footer heights', () => {
      expect(calculateAvailableHeight(1000, 50, 50, 30, 30)).toBe(840);
    });

    it('handles zero margins', () => {
      expect(calculateAvailableHeight(1000, 0, 0)).toBe(1000);
    });

    it('handles all parameters', () => {
      expect(calculateAvailableHeight(1122, 75, 75, 40, 40)).toBe(892);
    });
  });

  describe('splitContentIntoPages', () => {
    it('returns single page when all items fit', () => {
      const items = [
        { height: 100 },
        { height: 200 },
        { height: 300 },
      ];
      const pages = splitContentIntoPages(items, 1000);
      expect(pages).toHaveLength(1);
      expect(pages[0]).toHaveLength(3);
    });

    it('splits into multiple pages when items overflow', () => {
      const items = [
        { height: 400 },
        { height: 400 },
        { height: 400 },
      ];
      const pages = splitContentIntoPages(items, 500);
      expect(pages.length).toBeGreaterThan(1);
    });

    it('starts new page when item would exceed limit', () => {
      const items = [
        { height: 200 },
        { height: 200 },
        { height: 200 },
        { height: 200 },
      ];
      const pages = splitContentIntoPages(items, 500);
      // First page: [200, 200] = 400 <= 500, next would be 600 > 500
      expect(pages[0]).toHaveLength(2);
      expect(pages[1]).toHaveLength(2);
    });

    it('puts each large item on its own page', () => {
      const items = [
        { height: 300 },
        { height: 300 },
        { height: 300 },
        { height: 300 },
      ];
      const pages = splitContentIntoPages(items, 500);
      // Each pair 300+300=600 > 500, so each gets its own page
      expect(pages).toHaveLength(4);
      expect(pages[0]).toHaveLength(1);
      expect(pages[1]).toHaveLength(1);
    });

    it('handles empty items array', () => {
      const pages = splitContentIntoPages([], 500);
      expect(pages).toHaveLength(0);
    });

    it('handles single item larger than page', () => {
      const items = [{ height: 1000 }];
      const pages = splitContentIntoPages(items, 500);
      expect(pages).toHaveLength(1);
      expect(pages[0]).toHaveLength(1);
    });

    it('preserves item order across pages', () => {
      const items = [
        { height: 100, id: 'a' },
        { height: 200, id: 'b' },
        { height: 300, id: 'c' },
        { height: 400, id: 'd' },
      ];
      const pages = splitContentIntoPages(items, 500);
      // Verify all items are present in order
      const allItems = pages.flat();
      expect(allItems.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    });
  });
});
