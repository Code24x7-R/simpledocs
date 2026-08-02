// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * DocumentLayoutEngine
 *
 * A deterministic WYSIWYG pagination engine that processes a document AST,
 * geometry, and typography defaults to produce calculated page layouts.
 *
 * Two-phase rendering:
 *   Phase 1 — Line Wrapping: break paragraph text into line boxes
 *   Phase 2 — Page Allocation: sequentially place lines onto pages
 *
 * Supports hard page breaks, widow/orphan suppression, and keep-with-next.
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
  renderedBlocks: RenderedBlock[];
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
      return value * 0.75; // CSS px → pt at 96dpi
    default:
      return value;
  }
}

// ─── Engine ────────────────────────────────────────────────────────────────

export class DocumentLayoutEngine {
  private config: DocumentConfig;
  private geom: PageGeometry;
  private typo: TypographyDefaults;
  private defaultRules: PaginationRules;
  private measureText: MeasureTextFn;

  /** Usable content height per page in pt */
  private usableHeight: number;

  constructor(config: DocumentConfig) {
    this.config = config;
    this.geom = { ...config.pageGeometry };
    this.typo = { ...config.typographyDefaults };
    this.defaultRules = {
      orphans: 2,
      widows: 2,
      keepWithNext: false,
      ...config.paginationRules,
    };

    // Convert geometry to pt for internal calculations
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

    // Compute usable height per spec:
    // H_usable = Height_page - Margin_top - Margin_bottom - Header - Footer
    this.usableHeight =
      this.geom.height -
      this.geom.margins.top -
      this.geom.margins.bottom -
      this.geom.headerHeight -
      this.geom.footerHeight;

    // Default measurement function (monospace approximation)
    this.measureText =
      config.measureText ||
      ((text, _style) => {
        const charWidth =
          this.typo.fixedCharacterWidth ?? this.typo.fontSize * 0.5;
        return text.length * charWidth;
      });
  }

  // ── Phase 1: Line Wrapping ──────────────────────────────────────────────

  /**
   * Wrap a paragraph's text into lines that fit within the content width.
   * Supports fixed-width (character count) and proportional (measureText) fonts.
   */
  private wrapParagraph(
    node: ASTNode,
    contentWidth: number
  ): LineBox[] {
    const fontSize = node.styleOverrides?.fontSize ?? this.typo.fontSize;
    const fontType = node.styleOverrides?.fontType ?? this.typo.fontType;
    const lineHeightMult =
      node.styleOverrides?.lineHeightMultiplier ?? this.typo.lineHeightMultiplier;
    const paddingTop = node.styleOverrides?.paddingTop ?? 0;
    const paddingBottom = node.styleOverrides?.paddingBottom ?? 0;

    // Line height per spec:
    // Height_line = (Font Size × Line Spacing Multiplier) + Padding_top + Padding_bottom
    const lineHeight =
      fontSize * lineHeightMult + toPt(paddingTop, 'pt') + toPt(paddingBottom, 'pt');

    const fontFamily = this.typo.fontFamily;
    const fontStyle = { fontFamily, fontSize };

    const text = node.text ?? '';
    const lines: LineBox[] = [];

    if (text.length === 0) {
      // Empty paragraph still occupies one line of height
      lines.push({
        lineIndex: 0,
        text: '',
        width: 0,
        height: lineHeight,
        baselineY: lineHeight,
      });
      return lines;
    }

    if (fontType === 'fixed') {
      // Fixed-width: characters per line = floor(contentWidth / charWidth)
      const charWidth =
        this.typo.fixedCharacterWidth ?? fontSize * 0.5;
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
      // Proportional: word-wrapping using measureText
      const words = text.split(' ');
      let currentLine = '';
      let lineIndex = 0;

      for (const word of words) {
        const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
        const candidateWidth = this.measureText(candidate, fontStyle);

        if (candidateWidth <= contentWidth) {
          currentLine = candidate;
        } else {
          // Flush current line
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

          // Handle single words longer than content width (force-break)
          while (this.measureText(currentLine, fontStyle) > contentWidth) {
            // Binary search for the longest substring that fits
            let low = 1;
            let high = currentLine.length;
            let splitAt = 1;
            while (low <= high) {
              const mid = Math.floor((low + high) / 2);
              if (
                this.measureText(currentLine.slice(0, mid), fontStyle) <=
                contentWidth
              ) {
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

      // Flush remaining text
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

  // ── Phase 2: Page Allocation ────────────────────────────────────────────

  /**
   * Process the full document AST and produce paginated output.
   * Handles hard page breaks, widow/orphan control, and keep-with-next.
   */
  paginate(): PageOutput[] {
    const pages: PageOutput[] = [];
    const contentWidth =
      this.geom.width - this.geom.margins.left - this.geom.margins.right;

    let currentPage: RenderedBlock[] = [];
    let currentY = 0;
    let pageIndex = 0;

    const ast = this.config.documentAST;

    for (let i = 0; i < ast.length; i++) {
      const node = ast[i];

      // ── Hard page break ─────────────────────────────────────────────
      if (node.type === 'manual_page_break') {
        // Flush current page
        if (currentPage.length > 0 || pages.length === 0) {
          pages.push({
            pageIndex,
            usableHeight: this.usableHeight,
            renderedBlocks: currentPage,
          });
        }
        // Start fresh page
        currentPage = [];
        currentY = 0;
        pageIndex++;
        continue;
      }

      // Skip header/footer nodes (handled by page chrome)
      if (node.type === 'header' || node.type === 'footer') {
        continue;
      }

      // ── Wrap paragraph into lines ───────────────────────────────────
      const nodeRules = { ...this.defaultRules, ...node.paginationRules };
      const marginTop = toPt(node.styleOverrides?.marginTop ?? 0, 'pt');
      const marginBottom = toPt(node.styleOverrides?.marginBottom ?? 0, 'pt');

      const blockLines = this.wrapParagraph(node, contentWidth);
      if (blockLines.length === 0) continue;

      const blockHeight =
        marginTop +
        blockLines.reduce((sum, l) => sum + l.height, 0) +
        marginBottom;

      // ── Check if block fits on current page ─────────────────────────
      const spaceOnPage = this.usableHeight - currentY;

      if (blockHeight <= spaceOnPage) {
        // Fits entirely — place it
        const block: RenderedBlock = {
          nodeId: node.id,
          startY: currentY + marginTop,
          endY: currentY + blockHeight - marginBottom,
          lines: blockLines.map((line) => ({
            ...line,
            baselineY: currentY + marginTop + line.baselineY,
          })),
        };
        currentPage.push(block);
        currentY += blockHeight;
      } else {
        // Doesn't fit — need to split or push
        const linesThatFit = Math.floor(
          (spaceOnPage - marginTop) /
            (blockLines[0]?.height ?? this.typo.fontSize * this.typo.lineHeightMultiplier)
        );

        if (linesThatFit >= nodeRules.orphans) {
          // Place lines that fit on current page
          const fittingLines = blockLines.slice(0, linesThatFit);
          if (fittingLines.length > 0) {
            const block: RenderedBlock = {
              nodeId: node.id,
              startY: currentY + marginTop,
              endY: currentY + marginTop + fittingLines.reduce((s, l) => s + l.height, 0),
              lines: fittingLines.map((line) => ({
                ...line,
                baselineY: currentY + marginTop + line.baselineY,
              })),
            };
            currentPage.push(block);
          }

          // Flush current page
          pages.push({
            pageIndex,
            usableHeight: this.usableHeight,
            renderedBlocks: currentPage,
          });

          // Remaining lines go to next page
          const remainingLines = blockLines.slice(linesThatFit);
          pageIndex++;
          currentPage = [];
          currentY = 0;

          if (remainingLines.length > 0) {
            const remainingBlock: RenderedBlock = {
              nodeId: `${node.id}-cont`,
              startY: 0,
              endY: remainingLines.reduce((s, l) => s + l.height, 0),
              lines: remainingLines.map((line) => ({
                ...line,
                baselineY: line.baselineY,
              })),
            };
            currentPage.push(remainingBlock);
            currentY = remainingBlock.endY + marginBottom;
          }
        } else {
          // Orphan control: push entire block to next page
          // But first check keepWithNext: if previous block has keepWithNext,
          // we should also push that block
          if (nodeRules.keepWithNext && currentPage.length > 0) {
            const prevBlock = currentPage[currentPage.length - 1];
            currentPage.pop();
            currentY = prevBlock.startY - marginTop;
          }

          // Flush current page
          if (currentPage.length > 0 || pages.length === 0) {
            pages.push({
              pageIndex,
              usableHeight: this.usableHeight,
              renderedBlocks: currentPage,
            });
          }

          // Start new page with this block
          pageIndex++;
          currentPage = [];
          currentY = 0;

          // Re-check if block fits on fresh page (it should unless block > page height)
          if (blockHeight <= this.usableHeight) {
            const block: RenderedBlock = {
              nodeId: node.id,
              startY: currentY + marginTop,
              endY: currentY + blockHeight - marginBottom,
              lines: blockLines.map((line) => ({
                ...line,
                baselineY: currentY + marginTop + line.baselineY,
              })),
            };
            currentPage.push(block);
            currentY += blockHeight;
          } else {
            // Block is taller than entire page — force split anyway
            const linesPerPage = Math.floor(
              (this.usableHeight - marginTop) /
                (blockLines[0]?.height ?? this.typo.fontSize * this.typo.lineHeightMultiplier)
            );
            const fittingLines = blockLines.slice(0, linesPerPage);
            if (fittingLines.length > 0) {
              const block: RenderedBlock = {
                nodeId: node.id,
                startY: currentY + marginTop,
                endY: currentY + marginTop + fittingLines.reduce((s, l) => s + l.height, 0),
                lines: fittingLines.map((line) => ({
                  ...line,
                  baselineY: currentY + marginTop + line.baselineY,
                })),
              };
              currentPage.push(block);
              currentY = block.endY + marginBottom;
            }
          }
        }
      }
    }

    // Flush last page
    if (currentPage.length > 0) {
      pages.push({
        pageIndex,
        usableHeight: this.usableHeight,
        renderedBlocks: currentPage,
      });
    }

    // Ensure at least one page is returned
    if (pages.length === 0) {
      pages.push({
        pageIndex: 0,
        usableHeight: this.usableHeight,
        renderedBlocks: [],
      });
    }

    return pages;
  }

  // ── Convenience accessors ────────────────────────────────────────────────

  getUsableHeight(): number {
    return this.usableHeight;
  }

  getContentWidth(): number {
    return this.geom.width - this.geom.margins.left - this.geom.margins.right;
  }
}
