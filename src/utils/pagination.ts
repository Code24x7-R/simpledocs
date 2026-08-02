// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Pagination integration utilities.
 *
 * Bridges the Tiptap editor document model with the DocumentLayoutEngine.
 * Converts Tiptap JSON ↔ AST, calculates page layouts, and determines
 * spacer heights for page break nodes.
 */

import type { DocState } from '../store/useDocStore';
import {
  DocumentLayoutEngine,
  type ASTNode,
  type PageOutput,
  type PageGeometry,
  type TypographyDefaults,
} from './DocumentLayoutEngine';
import { mmToPx } from './unitConversion';

// ─── Tiptap JSON → AST ────────────────────────────────────────────────────

/**
 * Convert a Tiptap document JSON tree into a flat AST node array.
 * Extracts text content and style information from marks.
 */
export function tiptapToAST(tiptapDoc: Record<string, unknown>): ASTNode[] {
  const nodes: ASTNode[] = [];
  const content = (tiptapDoc.content as Record<string, unknown>[]) ?? [];

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    const type = node.type as string;

    if (type === 'pageBreak') {
      nodes.push({
        id: `pb-${i}`,
        type: 'manual_page_break',
      });
      continue;
    }

    if (type === 'paragraph' || type === 'heading') {
      const text = extractText(node);
      const level = (node.attrs as Record<string, unknown>)?.level as number | undefined;

      // Extract style from marks
      const style = extractStyle(node);
      const isHeading = type === 'heading' && level !== undefined;

      nodes.push({
        id: `${type}-${i}`,
        type: 'paragraph',
        text,
        styleOverrides: {
          ...style,
          ...(isHeading ? { fontSize: getHeadingFontSize(level) } : {}),
        },
        paginationRules: isHeading ? { keepWithNext: true } : undefined,
      });
      continue;
    }

    // For other block types (blockquote, list, table, etc.),
    // treat as a paragraph with estimated text
    if (node.content) {
      const text = extractText(node);
      if (text.length > 0) {
        nodes.push({
          id: `block-${i}`,
          type: 'paragraph',
          text,
        });
      }
    }
  }

  return nodes;
}

/** Recursively extract all text content from a Tiptap node */
function extractText(node: Record<string, unknown>): string {
  if (node.text) return node.text as string;

  const content = node.content as Record<string, unknown>[] | undefined;
  if (!content) return '';

  return content.map((child) => extractText(child)).join(' ');
}

/** Extract style information from Tiptap marks */
function extractStyle(
  node: Record<string, unknown>
): ASTNode['styleOverrides'] {
  const content = node.content as Record<string, unknown>[] | undefined;
  if (!content) return undefined;

  // Find the first text node with marks
  for (const child of content) {
    const marks = child.marks as Record<string, unknown>[] | undefined;
    if (marks && marks.length > 0) {
      const style: ASTNode['styleOverrides'] = {};
      for (const mark of marks) {
        if (mark.type === 'textStyle' && mark.attrs) {
          const attrs = mark.attrs as Record<string, unknown>;
          if (attrs.fontSize) {
            const sizeStr = attrs.fontSize as string;
            const parsed = parseFloat(sizeStr);
            if (!isNaN(parsed)) style.fontSize = parsed;
          }
        }
      }
      return Object.keys(style).length > 0 ? style : undefined;
    }
  }

  return undefined;
}

/** Get font size for heading level */
function getHeadingFontSize(level: number): number {
  switch (level) {
    case 1:
      return 32;
    case 2:
      return 24;
    case 3:
      return 18.72;
    default:
      return 16;
  }
}

// ─── Page Geometry from DocSettings ────────────────────────────────────────

/**
 * Build page geometry from document settings (in pixels, converted to pt internally).
 */
export function buildPageGeometry(
  settings: DocState['settings']
): PageGeometry {
  const fmt = settings.pageFormat === 'A4' ? { w: 210, h: 297 } : { w: 215.9, h: 279.4 };
  const pageWidth = settings.orientation === 'landscape' ? fmt.h : fmt.w;
  const pageHeight = settings.orientation === 'landscape' ? fmt.w : fmt.h;

  return {
    unit: 'mm',
    width: pageWidth,
    height: pageHeight,
    margins: {
      top: parseFloat(settings.margins.top) || 20,
      bottom: parseFloat(settings.margins.bottom) || 20,
      left: parseFloat(settings.margins.left) || 25,
      right: parseFloat(settings.margins.right) || 25,
    },
    headerHeight: settings.header.enabled ? 10 : 0,
    footerHeight: settings.footer.enabled && settings.footer.showPageNumbers ? 10 : 0,
  };
}

/**
 * Build typography defaults from editor state.
 */
export function buildTypographyDefaults(): TypographyDefaults {
  return {
    fontFamily: 'Arial, sans-serif',
    fontType: 'proportional',
    fontSize: 11, // Default 11pt
    lineHeightMultiplier: 1.2,
  };
}

// ─── Pagination Hook Result ────────────────────────────────────────────────

export interface PaginationResult {
  pages: PageOutput[];
  totalPages: number;
  /** Map of page break node ID → calculated spacer height in px */
  spacerHeights: Map<string, number>;
  /** Usable height per page in px */
  usableHeightPx: number;
}

/**
 * Run the full pagination engine on a document.
 * Returns page layout data and spacer heights for page breaks.
 */
export function calculatePagination(
  docState: DocState,
  measureText?: (text: string, style: { fontFamily: string; fontSize: number }) => number
): PaginationResult {
  const geometry = buildPageGeometry(docState.settings);
  const typography = buildTypographyDefaults();
  const ast = tiptapToAST(docState.content);

  const engine = new DocumentLayoutEngine({
    pageGeometry: geometry,
    typographyDefaults: typography,
    documentAST: ast,
    measureText,
  });

  const pages = engine.paginate();
  const usableHeightPx = mmToPx(engine.getUsableHeight() / 2.8346456693); // pt → mm → px

  // Calculate spacer heights for each page break
  const spacerHeights = new Map<string, number>();

  // For each page break node, calculate how much space remains on the current page
  let currentPageIndex = 0;
  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    if (node.type === 'manual_page_break') {
      // The spacer height fills the remaining space on the current page
      if (currentPageIndex < pages.length) {
        const page = pages[currentPageIndex];
        let usedHeight = 0;
        for (const block of page.renderedBlocks) {
          usedHeight += block.endY - block.startY;
        }
        // Convert remaining height from pt to px
        const remainingPt = engine.getUsableHeight() - usedHeight;
        const remainingPx = mmToPx(remainingPt / 2.8346456693);
        spacerHeights.set(node.id, Math.max(0, remainingPx));
      }
      currentPageIndex++;
    }
  }

  return {
    pages,
    totalPages: pages.length,
    spacerHeights,
    usableHeightPx,
  };
}
