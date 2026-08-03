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

    it('uses a fixed 28-line grid with derived line height', () => {
      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: [],
      });

      // Fixed grid: 28 lines per page
      // lineHeight = usableHeight / 28 = 576 / 28 ≈ 20.57pt
      expect(engine.getLinesPerPage()).toBe(28);
      expect(engine.getLineHeight()).toBeCloseTo(576 / 28, 5);
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
      // Create many paragraphs that exceed one page (28 lines)
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
      // With 28 lines per page, 14 paragraphs fill one page
      const paragraphs: ASTNode[] = [];
      for (let i = 0; i < 14; i++) {
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

    it('overflows to second page when exceeding 28 lines', () => {
      // 15 paragraphs × 2 lines = 30 lines > 28 → 2 pages
      const paragraphs: ASTNode[] = [];
      for (let i = 0; i < 15; i++) {
        paragraphs.push(createParagraph(`p${i}`, `Line ${i}`));
      }

      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: paragraphs,
      });

      const pages = engine.paginate();
      expect(pages.length).toBe(2);
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
      expect(pages[0].linesPerPage).toBe(28);
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

  describe('10-page alignment', () => {
    it('page break spacers align content to next page body top', () => {
      // Build a 10-page document with a page break after each page
      const pageBreaks: ASTNode[] = [];
      for (let page = 0; page < 10; page++) {
        // Fill each page with enough paragraphs to reach the page break
        for (let i = 0; i < 14; i++) {
          pageBreaks.push(createParagraph(`p-${page}-${i}`, `Page ${page} line ${i}`));
        }
        if (page < 9) {
          pageBreaks.push(createPageBreak(`pb-${page}`));
        }
      }

      const engine = new DocumentLayoutEngine({
        pageGeometry: baseGeometry,
        typographyDefaults: baseTypography,
        documentAST: pageBreaks,
      });

      const result = engine.paginateFull();

      // Should produce exactly 10 pages
      expect(result.totalPages).toBe(10);
      expect(result.pages.length).toBe(10);

      // Each page (except the last) should have exactly one page break record
      expect(result.pageBreaks.length).toBe(9);

      const lineHeight = engine.getLineHeight();
      const usableHeight = engine.getUsableHeight();
      const headerHeight = engine.getHeaderHeight();
      const footerHeight = engine.getFooterHeight();
      const marginTop = engine.getMarginTop();
      const marginBottom = 72; // matches baseGeometry

      // Page gap = 10 lines
      const pageGapPt = lineHeight * 10;

      // Inter-page distance = footer + bottomMargin + gap + topMargin + header
      // This is the distance from bottom of one page's body to top of next page's body
      const interPageGap =
        footerHeight + marginBottom + pageGapPt + marginTop + headerHeight;

      // For each page break, the total spacer should be:
      //   remainingBodyLines * lineHeight + interPageGap
      // This ensures content after the break lands at the top of the next page body
      for (let i = 0; i < result.pageBreaks.length; i++) {
        const br = result.pageBreaks[i];
        const page = result.pages[br.pageIndex];

        // Lines used on this page before the break
        const linesUsed = page.linesUsed;
        const linesRemaining = 28 - linesUsed;
        const remainingBodyHeight = linesRemaining * lineHeight;

        // Expected spacer = remaining body height + inter-page gap
        const expectedSpacerPt = remainingBodyHeight + interPageGap;

        // The remainingHeightPt should equal the expected spacer
        expect(br.remainingHeightPt).toBeCloseTo(expectedSpacerPt, 5);
      }

      // Verify page-to-page content alignment:
      // After a break on page N, the first content on page N+1 should start
      // at Y=0 within that page's body (startY = 0 for the first block)
      for (let i = 1; i < result.pages.length; i++) {
        const nextPage = result.pages[i];
        if (nextPage.renderedBlocks.length > 0) {
          // The first block on each page after a break should start at Y=0
          expect(nextPage.renderedBlocks[0].startY).toBe(0);
        }
      }

      // Each page's usable content area should be exactly 28 lines
      for (const page of result.pages) {
        const contentHeight = page.renderedBlocks.reduce(
          (sum, b) => sum + (b.endY - b.startY),
          0
        );
        // Content should not exceed usable height
        expect(contentHeight).toBeLessThanOrEqual(usableHeight + 0.001);
      }

      // ── Zero drift verification ──
      // The cumulative spacer distances must exactly match the page stride.
      // Any rounding discrepancy in PT→PX conversion would accumulate across
      // pages, causing misalignment. With single-source-of-truth geometry
      // (all values derived from engine PT, converted once), drift is zero.
      const pageStride = engine.getPageHeight() + pageGapPt;

      // Simulate the content flow and verify alignment at each page boundary.
      // linesUsed counts both text lines and blank spacing lines.
      let contentY = marginTop + headerHeight; // initial padding offset
      for (let i = 0; i < result.pageBreaks.length; i++) {
        const br = result.pageBreaks[i];
        const page = result.pages[br.pageIndex];

        // Add content height (linesUsed × lineHeight, includes blank spacing)
        contentY += page.linesUsed * lineHeight;

        // Add the spacer
        contentY += br.remainingHeightPt;

        // The next page's body should start exactly here
        const expectedNextBodyTop = (br.pageIndex + 1) * pageStride + marginTop + headerHeight;

        // Zero drift: content position must match expected page body top
        expect(contentY).toBeCloseTo(expectedNextBodyTop, 10);
      }
    });
  });
});
