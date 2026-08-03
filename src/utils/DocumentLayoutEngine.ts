// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * DocumentLayoutEngine — Line-Based WYSIWYG Pagination
 *
 * A deterministic pagination engine that treats each page as a fixed grid
 * of lines. The key insight: given a page height, margins, header/footer,
 * and line height, the number of lines per page is FIXED.
 *
 * Algorithm:
 *   1. Compute usable height: H_page - margins - header - footer
 *   2. Compute line height: fontSize × lineSpacing (e.g., 12pt × 1.5 = 18pt)
 *   3. Lines per page = floor(usableHeight / lineHeight)
 *   4. Each paragraph produces wrapped text lines + 1 blank line
 *   5. When accumulated lines exceed linesPerPage, overflow goes to next page
 *
 * Page breaks force a hard flush — all subsequent content starts at the
 * top of the next page.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type MeasurementUnit = 'pt' | 'px' | 'mm' | 'in';
export type FontType = 'proportional' | 'fixed';

export interface PageGeometry {
  unit: MeasurementUnit;
  width: number;
  height: number;
  margins: { top: number; bottom: number; left: number; right: number };
  headerHeight: number;
  footerHeight: number;
}

export interface TypographyDefaults {
  fontFamily: string;
  fontType: FontType;
  fontSize: number;
  lineHeightMultiplier: number;
  fixedCharacterWidth?: number;
}

export interface PaginationRules {
  orphans: number;
  widows: number;
  keepWithNext: boolean;
}

export interface ASTNode {
  id: string;
  type: 'paragraph' | 'manual_page_break' | 'header' | 'footer';
  text?: string;
  /** For page breaks: the sequential index matching the Tiptap node attribute */
  nodeIndex?: number;
  styleOverrides?: {
    fontSize?: number;
    fontType?: FontType;
    lineHeightMultiplier?: number;
    marginTop?: number;
    marginBottom?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
  paginationRules?: Partial<PaginationRules>;
}

export interface LineBox {
  lineIndex: number;
  text: string;
  width: number;
  height: number;
  baselineY: number;
}

export interface RenderedBlock {
  nodeId: string;
  startY: number;
  endY: number;
  lines: LineBox[];
}

export interface PageOutput {
  pageIndex: number;
  usableHeight: number;
  linesPerPage: number;
  linesUsed: number;
  renderedBlocks: RenderedBlock[];
}

/**
 * Records where a page break lands so the renderer can compute spacer height.
 */
export interface PageBreakRecord {
  /** Index of the AST node (for correlation with the DOM) */
  nodeIndex: number;
  /** Page the break flushes to (0-based) */
  pageIndex: number;
  /** Usable height remaining on that page after the break (pt) */
  remainingHeightPt: number;
}

export interface PaginationResult {
  pages: PageOutput[];
  pageBreaks: PageBreakRecord[];
  usableHeightPt: number;
  linesPerPage: number;
  lineHeightPt: number;
  totalPages: number;
}

export type MeasureTextFn = (
  text: string,
  fontStyle: { fontFamily: string; fontSize: number }
) => number;

export interface DocumentConfig {
  pageGeometry: PageGeometry;
  typographyDefaults: TypographyDefaults;
  documentAST: ASTNode[];
  measureText?: MeasureTextFn;
  paginationRules?: PaginationRules;
}

// ─── Unit Conversions ──────────────────────────────────────────────────────

const MM_TO_PT = 2.8346456693;
const IN_TO_PT = 72;

function toPt(value: number, unit: MeasurementUnit): number {
  switch (unit) {
    case 'pt':
      return value;
    case 'mm':
      return value * MM_TO_PT;
    case 'in':
      return value * IN_TO_PT;
    case 'px':
      return value * 0.75;
    default:
      return value;
  }
}

// ─── Engine ────────────────────────────────────────────────────────────────

export class DocumentLayoutEngine {
  private config: DocumentConfig;
  private geom: PageGeometry;
  private typo: TypographyDefaults;
  private measureText: MeasureTextFn;

  /** Usable content height per page in pt */
  private usableHeight: number;

  /** Fixed line height in pt (derived from typography defaults) */
  private lineHeight: number;

  /** Maximum lines per page (fixed grid) */
  private linesPerPage: number;

  constructor(config: DocumentConfig) {
    this.config = config;
    this.geom = { ...config.pageGeometry };
    this.typo = { ...config.typographyDefaults };

    // Convert geometry to pt
    this.geom.width = toPt(this.geom.width, this.geom.unit);
    this.geom.height = toPt(this.geom.height, this.geom.unit);
    this.geom.headerHeight = toPt(this.geom.headerHeight, this.geom.unit);
    this.geom.footerHeight = toPt(this.geom.footerHeight, this.geom.unit);
    this.geom.margins = {
      top: toPt(this.geom.margins.top, this.geom.unit),
      bottom: toPt(this.geom.margins.bottom, this.geom.unit),
      left: toPt(this.geom.margins.left, this.geom.unit),
      right: toPt(this.geom.margins.right, this.geom.unit),
    };

    // Usable height per spec (body area, excluding header/footer)
    this.usableHeight =
      this.geom.height -
      this.geom.margins.top -
      this.geom.margins.bottom -
      this.geom.headerHeight -
      this.geom.footerHeight;

    // Fixed grid: exactly 28 lines per page body.
    // Line height is derived from usable height so the grid is consistent.
    this.linesPerPage = 28;
    this.lineHeight = this.usableHeight / this.linesPerPage;

    // Default measurement function
    this.measureText =
      config.measureText ||
      ((text, _style) => {
        const charWidth = this.typo.fixedCharacterWidth ?? this.typo.fontSize * 0.5;
        return text.length * charWidth;
      });
  }

  // ── Geometry accessors ───────────────────────────────────────────────────

  /** Get the usable body height (excluding header/footer) in pt */
  getUsableHeight(): number {
    return this.usableHeight;
  }

  /** Get lines per page (fixed at 28) */
  getLinesPerPage(): number {
    return this.linesPerPage;
  }

  /** Get the fixed line height in pt */
  getLineHeight(): number {
    return this.lineHeight;
  }

  /** Get content width in pt */
  getContentWidth(): number {
    return this.geom.width - this.geom.margins.left - this.geom.margins.right;
  }

  /** Get header height in pt */
  getHeaderHeight(): number {
    return this.geom.headerHeight;
  }

  /** Get footer height in pt */
  getFooterHeight(): number {
    return this.geom.footerHeight;
  }

  /** Get top margin in pt */
  getMarginTop(): number {
    return this.geom.margins.top;
  }

  /** Get bottom margin in pt */
  getMarginBottom(): number {
    return this.geom.margins.bottom;
  }

  /** Get left margin in pt */
  getMarginLeft(): number {
    return this.geom.margins.left;
  }

  /** Get right margin in pt */
  getMarginRight(): number {
    return this.geom.margins.right;
  }

  /** Get page width in pt (full page) */
  getPageWidth(): number {
    return this.geom.width;
  }

  /** Get page height in pt (full page including margins) */
  getPageHeight(): number {
    return this.geom.height;
  }

  /** Get page gap in pt (10 lines) */
  getPageGapPt(): number {
    return this.lineHeight * 10;
  }

  // ── Line Wrapping ───────────────────────────────────────────────────────

  /**
   * Wrap paragraph text into lines that fit within the content width.
   * Returns an array of line boxes (each line is one grid row).
   */
  private wrapParagraph(node: ASTNode, contentWidth: number): LineBox[] {
    const fontSize = node.styleOverrides?.fontSize ?? this.typo.fontSize;
    const fontType = node.styleOverrides?.fontType ?? this.typo.fontType;

    // Fixed grid: all lines use the same line height (usableHeight / 28)
    const lineHeight = this.lineHeight;

    const fontFamily = this.typo.fontFamily;
    const fontStyle = { fontFamily, fontSize };
    const text = node.text ?? '';
    const lines: LineBox[] = [];

    if (text.length === 0) {
      // Empty paragraph = one blank line
      lines.push({ lineIndex: 0, text: '', width: 0, height: lineHeight, baselineY: lineHeight });
      return lines;
    }

    if (fontType === 'fixed') {
      const charWidth = this.typo.fixedCharacterWidth ?? fontSize * 0.5;
      const charsPerLine = Math.max(1, Math.floor(contentWidth / charWidth));

      let lineIndex = 0;
      for (let i = 0; i < text.length; i += charsPerLine) {
        const lineText = text.slice(i, i + charsPerLine);
        lines.push({
          lineIndex,
          text: lineText,
          width: lineText.length * charWidth,
          height: lineHeight,
          baselineY: lineHeight,
        });
        lineIndex++;
      }
    } else {
      // Proportional word-wrapping
      const words = text.split(' ');
      let currentLine = '';
      let lineIndex = 0;

      for (const word of words) {
        const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
        const candidateWidth = this.measureText(candidate, fontStyle);

        if (candidateWidth <= contentWidth) {
          currentLine = candidate;
        } else {
          if (currentLine.length > 0) {
            lines.push({
              lineIndex,
              text: currentLine,
              width: this.measureText(currentLine, fontStyle),
              height: lineHeight,
              baselineY: lineHeight,
            });
            lineIndex++;
          }
          currentLine = word;

          // Handle words longer than content width (force-break)
          while (this.measureText(currentLine, fontStyle) > contentWidth) {
            let low = 1;
            let high = currentLine.length;
            let splitAt = 1;
            while (low <= high) {
              const mid = Math.floor((low + high) / 2);
              if (this.measureText(currentLine.slice(0, mid), fontStyle) <= contentWidth) {
                splitAt = mid;
                low = mid + 1;
              } else {
                high = mid - 1;
              }
            }
            const lineText = currentLine.slice(0, splitAt);
            lines.push({
              lineIndex,
              text: lineText,
              width: this.measureText(lineText, fontStyle),
              height: lineHeight,
              baselineY: lineHeight,
            });
            lineIndex++;
            currentLine = currentLine.slice(splitAt);
          }
        }
      }

      if (currentLine.length > 0) {
        lines.push({
          lineIndex,
          text: currentLine,
          width: this.measureText(currentLine, fontStyle),
          height: lineHeight,
          baselineY: lineHeight,
        });
      }
    }

    return lines;
  }

  // ── Page Allocation (Line-Based Grid) ───────────────────────────────────

  /**
   * Process the AST and produce paginated output.
   *
   * Model: each page holds a fixed number of lines (linesPerPage).
   * Paragraphs produce wrapped text lines + 1 blank line (spacing).
   * Overflow lines flow to the next page.
   * Page breaks force a flush to the next page.
   *
   * @param pageBreaks — output array that will be populated with page break
   *   records so the renderer can compute spacer heights.
   */
  paginate(pageBreaks?: PageBreakRecord[]): PageOutput[] {
    const pages: PageOutput[] = [];
    if (pageBreaks) pageBreaks.length = 0;

    const contentWidth = this.geom.width - this.geom.margins.left - this.geom.margins.right;

    let currentPage: RenderedBlock[] = [];
    let currentLineCount = 0;
    let pageIndex = 0;
    let currentY = 0;

    const ast = this.config.documentAST;

    for (let i = 0; i < ast.length; i++) {
      const node = ast[i];

      // ── Hard page break ─────────────────────────────────────────────
      if (node.type === 'manual_page_break') {
        // Record remaining height on this page so the renderer can size the spacer.
        // The spacer must bridge from the break position to the top of the next
        // page's body area: remaining body lines + footer + bottom margin + page gap + top margin + header.
        if (pageBreaks) {
          const linesRemaining = this.linesPerPage - currentLineCount;
          const remainingBodyPt = Math.max(0, linesRemaining * this.lineHeight);
          const interPageGapPt =
            this.geom.footerHeight +
            this.geom.margins.bottom +
            this.getPageGapPt() +
            this.geom.margins.top +
            this.geom.headerHeight;
          const remainingHeightPt = remainingBodyPt + interPageGapPt;
          pageBreaks.push({
            nodeIndex: node.nodeIndex ?? i,
            pageIndex,
            remainingHeightPt,
          });
        }

        // Flush current page
        pages.push({
          pageIndex,
          usableHeight: this.usableHeight,
          linesPerPage: this.linesPerPage,
          linesUsed: currentLineCount,
          renderedBlocks: currentPage,
        });
        // Start fresh page
        currentPage = [];
        currentLineCount = 0;
        currentY = 0;
        pageIndex++;
        continue;
      }

      // Skip header/footer nodes
      if (node.type === 'header' || node.type === 'footer') continue;

      // ── Wrap paragraph into lines ───────────────────────────────────
      const blockLines = this.wrapParagraph(node, contentWidth);
      if (blockLines.length === 0) continue;

      // Paragraph spacing: +1 blank line after each paragraph
      const totalLines = blockLines.length + 1; // +1 for blank line after paragraph

      // ── Check if paragraph fits on current page ─────────────────────
      const linesRemaining = this.linesPerPage - currentLineCount;

      if (totalLines <= linesRemaining) {
        // Fits entirely — place it
        const block: RenderedBlock = {
          nodeId: node.id,
          startY: currentY,
          endY: currentY + blockLines.length * this.lineHeight,
          lines: blockLines.map((line, idx) => ({
            ...line,
            lineIndex: currentLineCount + idx,
            baselineY: currentY + (idx + 1) * this.lineHeight,
          })),
        };
        currentPage.push(block);
        currentLineCount += totalLines;
        currentY += blockLines.length * this.lineHeight;
      } else {
        // Doesn't fit — split across pages
        const linesThatFit = Math.max(0, linesRemaining - 1); // reserve 1 for blank line if possible

        if (linesThatFit >= 1) {
          // Place lines that fit on current page
          const fittingLines = blockLines.slice(0, linesThatFit);
          const block: RenderedBlock = {
            nodeId: node.id,
            startY: currentY,
            endY: currentY + fittingLines.length * this.lineHeight,
            lines: fittingLines.map((line, idx) => ({
              ...line,
              lineIndex: currentLineCount + idx,
              baselineY: currentY + (idx + 1) * this.lineHeight,
            })),
          };
          currentPage.push(block);
        }

        // Flush current page
        pages.push({
          pageIndex,
          usableHeight: this.usableHeight,
          linesPerPage: this.linesPerPage,
          linesUsed: currentLineCount,
          renderedBlocks: currentPage,
        });

        // Remaining lines go to next page
        const startIdx = linesThatFit > 0 ? linesThatFit : 0;
        const remainingLines = blockLines.slice(startIdx);
        pageIndex++;
        currentPage = [];
        currentLineCount = 0;
        currentY = 0;

        if (remainingLines.length > 0) {
          // Place remaining lines on fresh page (with blank line after)
          const remainingBlock: RenderedBlock = {
            nodeId: `${node.id}-cont`,
            startY: 0,
            endY: remainingLines.length * this.lineHeight,
            lines: remainingLines.map((line, idx) => ({
              ...line,
              lineIndex: idx,
              baselineY: (idx + 1) * this.lineHeight,
            })),
          };
          currentPage.push(remainingBlock);
          currentLineCount = remainingLines.length + 1; // +1 blank line
          currentY = remainingLines.length * this.lineHeight;
        }
      }
    }

    // Flush last page
    if (currentPage.length > 0) {
      pages.push({
        pageIndex,
        usableHeight: this.usableHeight,
        linesPerPage: this.linesPerPage,
        linesUsed: currentLineCount,
        renderedBlocks: currentPage,
      });
    }

    // Ensure at least one page
    if (pages.length === 0) {
      pages.push({
        pageIndex: 0,
        usableHeight: this.usableHeight,
        linesPerPage: this.linesPerPage,
        linesUsed: 0,
        renderedBlocks: [],
      });
    }

    return pages;
  }

  // ── Full pagination result ───────────────────────────────────────────────

  /**
   * Run pagination and return a complete result suitable for rendering.
   */
  paginateFull(): PaginationResult {
    const pageBreaks: PageBreakRecord[] = [];
    const pages = this.paginate(pageBreaks);
    return {
      pages,
      pageBreaks,
      usableHeightPt: this.usableHeight,
      linesPerPage: this.linesPerPage,
      lineHeightPt: this.lineHeight,
      totalPages: pages.length,
    };
  }
}
