import { describe, it, expect } from 'vitest';
import { DocumentLayoutEngine } from './DocumentLayoutEngine';
import type { PageGeometry, TypographyDefaults, ASTNode } from './DocumentLayoutEngine';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const baseGeometry: PageGeometry = {
  unit: 'pt',
  width: 612, // 8.5in
  height: 792, // 11in
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  headerHeight: 36,
  footerHeight: 36,
};

const baseTypography: TypographyDefaults = {
  fontFamily: 'Arial',
  fontType: 'fixed',
  fontSize: 12,
  lineHeightMultiplier: 1.2,
  fixedCharacterWidth: 7.2,
};

function createParagraph(id: string, text: string, overrides?: ASTNode['styleOverrides']): ASTNode {
  return { id, type: 'paragraph', text, styleOverrides: overrides };
}

function createPageBreak(id: string): ASTNode {
  return { id, type: 'manual_page_break' };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('DocumentLayoutEngine', () => {
  describe('usable height calculation', () => {
    it('computes usable height per spec', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [],
      });

      // H_usable = 792 - 72 - 72 - 36 - 36 = 576
      expect(engine.getUsableHeight()).toBe(576);
    });

    it('computes lines per page from line height', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [],
      });

      // lineHeight = 12 * 1.2 = 14.4pt
      // linesPerPage = floor(576 / 14.4) = 40
      expect(engine.getLineHeight()).toBeCloseTo(14.4, 1);
      expect(engine.getLinesPerPage()).toBe(40);
    });
  });

  describe('Phase 1: Line Wrapping (fixed width)', () => {
    it('wraps text into lines based on character width', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [createParagraph('p1', 'Hello World Test')],
      });

      const pages = engine.paginate();
      expect(pages.length).toBe(1);

      const block = pages[0].renderedBlocks[0];
      expect(block).toBeDefined();
      expect(block.lines.length).toBeGreaterThanOrEqual(1);
    });

    it('creates empty line for empty paragraph', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [createParagraph('p1', '')],
      });

      const pages = engine.paginate();
      expect(pages[0].renderedBlocks[0].lines.length).toBe(1);
      expect(pages[0].renderedBlocks[0].lines[0].text).toBe('');
    });
  });

  describe('Phase 2: Page Allocation', () => {
    it('places single paragraph on one page', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [createParagraph('p1', 'Short text')],
      });

      const pages = engine.paginate();
      expect(pages.length).toBe(1);
      expect(pages[0].renderedBlocks.length).toBe(1);
      expect(pages[0].pageIndex).toBe(0);
    });

    it('returns at least one page for empty document', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [],
      });

      const pages = engine.paginate();
      expect(pages.length).toBe(1);
      expect(pages[0].renderedBlocks).toEqual([]);
    });

    it('creates new page when content exceeds lines per page', () => {
      // Create many paragraphs that exceed one page (40 lines)
      const paragraphs: ASTNode[] = [];
      for (let i = 0; i < 100; i++) {
        paragraphs.push(createParagraph(`p${i}`, `Paragraph ${i} with some text content`));
      }

      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: paragraphs,
      });

      const pages = engine.paginate();
      expect(pages.length).toBeGreaterThan(1);
    });

    it('includes blank line spacing after each paragraph', () => {
      // Each paragraph takes 1 line + 1 blank line = 2 lines
      // With 40 lines per page, 20 paragraphs should fill one page
      const paragraphs: ASTNode[] = [];
      for (let i = 0; i < 20; i++) {
        paragraphs.push(createParagraph(`p${i}`, `Line ${i}`));
      }

      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: paragraphs,
      });

      const pages = engine.paginate();
      expect(pages.length).toBe(1);
    });
  });

  describe('Hard page breaks', () => {
    it('inserts page break between content', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [
          createParagraph('p1', 'Before break'),
          createPageBreak('pb1'),
          createParagraph('p2', 'After break'),
        ],
      });

      const pages = engine.paginate();
      expect(pages.length).toBe(2);
      expect(pages[0].renderedBlocks[0].nodeId).toBe('p1');
      expect(pages[1].renderedBlocks[0].nodeId).toBe('p2');
    });

    it('handles multiple page breaks', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [
          createParagraph('p1', 'Page 1'),
          createPageBreak('pb1'),
          createParagraph('p2', 'Page 2'),
          createPageBreak('pb2'),
          createParagraph('p3', 'Page 3'),
        ],
      });

      const pages = engine.paginate();
      expect(pages.length).toBe(3);
    });
  });

  describe('Unit conversions', () => {
    it('correctly converts mm to pt', () => {
      const mmGeometry: PageGeometry = {
        ...baseGeometry,
        unit: 'mm',
        width: 210,
        height: 297,
      };

      const engine = new DocumentLayoutEngine({
        pageGeometry: mmGeometry,
        typographyDefaults: baseTypography,
        documentAST: [],
      });

      // 297mm * 2.8346 ≈ 841.9pt
      const usable = engine.getUsableHeight();
      expect(usable).toBeGreaterThan(0);
      expect(engine.getLinesPerPage()).toBeGreaterThan(0);
    });

    it('correctly converts inches to pt', () => {
      const inGeometry: PageGeometry = {
        unit: 'in',
        width: 8.5,
        height: 11,
        margins: { top: 1, bottom: 1, left: 1, right: 1 },
        headerHeight: 0.5,
        footerHeight: 0.5,
      };

      const engine = new DocumentLayoutEngine({
        pageGeometry: inGeometry,
        typographyDefaults: baseTypography,
        documentAST: [],
      });

      // 11in * 72 = 792pt, minus margins (1*72*2 = 144), minus header/footer (0.5*72*2 = 72)
      // = 792 - 144 - 72 = 576pt
      const usable = engine.getUsableHeight();
      expect(usable).toBe(576);
    });
  });

  describe('Page output structure', () => {
    it('includes pageIndex, usableHeight, linesPerPage, and renderedBlocks', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [createParagraph('p1', 'Test')],
      });

      const pages = engine.paginate();

      expect(pages[0]).toHaveProperty('pageIndex');
      expect(pages[0]).toHaveProperty('usableHeight');
      expect(pages[0]).toHaveProperty('linesPerPage');
      expect(pages[0]).toHaveProperty('renderedBlocks');
      expect(pages[0].usableHeight).toBe(576);
      expect(pages[0].linesPerPage).toBe(40);
    });

    it('renderedBlocks include startY, endY, and lines', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [createParagraph('p1', 'Test content')],
      });

      const pages = engine.paginate();
      const block = pages[0].renderedBlocks[0];

      expect(block).toHaveProperty('startY');
      expect(block).toHaveProperty('endY');
      expect(block).toHaveProperty('lines');
      expect(block.lines[0]).toHaveProperty('lineIndex');
      expect(block.lines[0]).toHaveProperty('text');
      expect(block.lines[0]).toHaveProperty('width');
      expect(block.lines[0]).toHaveProperty('height');
      expect(block.lines[0]).toHaveProperty('baselineY');
    });
  });
});
