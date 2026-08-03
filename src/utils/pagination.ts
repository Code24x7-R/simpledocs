// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Pagination integration utilities.
 *
 * Bridges document settings with page geometry for the single-editor model.
 */

import type { DocState } from '../store/useDocStore';
import type { PageGeometry, TypographyDefaults } from './pagination-types';

// ─── Page Geometry from DocSettings ────────────────────────────────────────

/**
 * Build page geometry from document settings (in mm, converted internally).
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

// ─── Text extraction ──────────────────────────────────────────────────────

/** Recursively extract all text content from a Tiptap node */
export function extractText(node: Record<string, unknown>): string {
  if (node.text) return node.text as string;

  const content = node.content as Record<string, unknown>[] | undefined;
  if (!content) return '';

  return content.map((child) => extractText(child)).join(' ');
}
