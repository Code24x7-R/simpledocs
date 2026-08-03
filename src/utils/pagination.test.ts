// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import { buildPageGeometry, buildTypographyDefaults, extractText } from './pagination';
import type { DocState } from '../store/useDocStore';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const mockDocState: DocState = {
  id: 'test',
  title: 'Test Doc',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  totalPages: 1,
  settings: {
    pageFormat: 'A4',
    orientation: 'portrait',
    margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
    header: { enabled: true, content: '' },
    footer: { enabled: true, showPageNumbers: true },
    pageGap: 24,
    showPageBackgrounds: true,
  },
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello world' }],
      },
    ],
  },
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('pagination utils', () => {
  describe('extractText', () => {
    it('extracts text from a simple paragraph', () => {
      const text = extractText(mockDocState.content);
      expect(text).toBe('Hello world');
    });

    it('extracts text from nested nodes', () => {
      const node = {
        type: 'heading',
        content: [{ type: 'text', text: 'Title' }],
      };
      const text = extractText(node);
      expect(text).toBe('Title');
    });

    it('returns empty string for empty content', () => {
      const node = { type: 'paragraph' };
      const text = extractText(node);
      expect(text).toBe('');
    });
  });

  describe('buildPageGeometry', () => {
    it('builds geometry from A4 settings', () => {
      const geometry = buildPageGeometry(mockDocState.settings);

      expect(geometry.unit).toBe('mm');
      expect(geometry.width).toBe(210);
      expect(geometry.height).toBe(297);
      expect(geometry.margins.top).toBe(20);
      expect(geometry.margins.bottom).toBe(20);
      expect(geometry.headerHeight).toBe(10);
      expect(geometry.footerHeight).toBe(10);
    });

    it('builds geometry for Letter format', () => {
      const letterSettings = {
        ...mockDocState.settings,
        pageFormat: 'Letter' as const,
      };
      const geometry = buildPageGeometry(letterSettings);

      expect(geometry.width).toBeCloseTo(215.9);
      expect(geometry.height).toBeCloseTo(279.4);
    });

    it('handles landscape orientation', () => {
      const landscapeSettings = {
        ...mockDocState.settings,
        orientation: 'landscape' as const,
      };
      const geometry = buildPageGeometry(landscapeSettings);

      // Width and height should be swapped
      expect(geometry.width).toBe(297);
      expect(geometry.height).toBe(210);
    });

    it('returns 0 for disabled header/footer', () => {
      const noHeaderFooterSettings = {
        ...mockDocState.settings,
        header: { enabled: false, content: '' },
        footer: { enabled: false, showPageNumbers: false },
      };
      const geometry = buildPageGeometry(noHeaderFooterSettings);

      expect(geometry.headerHeight).toBe(0);
      expect(geometry.footerHeight).toBe(0);
    });
  });

  describe('buildTypographyDefaults', () => {
    it('returns sensible defaults', () => {
      const typo = buildTypographyDefaults();

      expect(typo.fontFamily).toBeTruthy();
      expect(typo.fontSize).toBeGreaterThan(0);
      expect(typo.lineHeightMultiplier).toBeGreaterThan(0);
      expect(typo.fontType).toBe('proportional');
    });
  });
});
