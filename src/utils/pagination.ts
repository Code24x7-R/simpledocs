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
  type ASTNode,
  type PageGeometry,
  type TypographyDefaults,
} from './DocumentLayoutEngine';

// ─── Tiptap JSON → AST ────────────────────────────────────────────────────

/**
 * Convert a Tiptap document JSON tree into a flat AST node array.
 * Extracts text content and style information from marks.
 */
export function tiptapToAST(tiptapDoc: Record<string, unknown>): ASTNode[] {
  const nodes: ASTNode[] = [];
  const content = (tiptapDoc.content as Record<string, unknown>[]) ?? [];
  let pbCounter = 0;

  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    const type = node.type as string;

    if (type === 'pageBreak') {
      const attrs = (node.attrs as Record<string, unknown>) || {};
      nodes.push({
        id: `pb-${i}`,
        type: 'manual_page_break',
        nodeIndex: (attrs.nodeIndex as number) ?? pbCounter,
      });
      pbCounter++;
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
export function extractText(node: Record<string, unknown>): string {
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
