// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Shared page geometry calculations for WYSIWYG pagination.
 *
 * Both PaginatedViewport and PageBreakView use these to ensure
 * the visual page backgrounds and the editor's spacer calculations
 * are perfectly aligned.
 */

import { mmToPx } from './unitConversion';

export interface PageGeometryConfig {
  pageFormat: string;
  orientation: string;
  margins: { top: string; bottom: string; left: string; right: string };
  header: { enabled: boolean; content: string };
  footer: { enabled: boolean; showPageNumbers: boolean };
  pageGap: number;
}

export interface PageGeometryResult {
  /** Full page height in px (including margins, header, footer) */
  pageHeightPx: number;
  /** Distance between consecutive page tops in px */
  pageStridePx: number;
  /** Usable content height per page in px (inside margins) */
  usableHeightPx: number;
  /** Left margin in px */
  marginLeftPx: number;
  /** Right margin in px */
  marginRightPx: number;
  /** Top margin in px */
  marginTopPx: number;
  /** Bottom margin in px */
  marginBottomPx: number;
  /** Header height in px */
  headerHeightPx: number;
  /** Footer height in px */
  footerHeightPx: number;
  /** Content width in px (page width minus left/right margins) */
  contentWidthPx: number;
  /** Page width in px */
  pageWidthPx: number;
}

/**
 * Calculate page geometry from document settings.
 * Used by both PaginatedViewport (for backgrounds) and PageBreakView (for spacers).
 */
export function calculatePageGeometry(config: PageGeometryConfig): PageGeometryResult {
  const { pageFormat, orientation, margins, header, footer, pageGap } = config;

  // Page dimensions in mm
  const fmt = pageFormat === 'A4' ? { w: 210, h: 297 } : { w: 215.9, h: 279.4 };

  // Convert to px
  const pageWidthPx = orientation === 'landscape' ? mmToPx(fmt.h) : mmToPx(fmt.w);
  const pageHeightPx = orientation === 'landscape' ? mmToPx(fmt.w) : mmToPx(fmt.h);

  // Margins in px
  const marginTopPx = mmToPx(parseFloat(margins.top) || 20);
  const marginBottomPx = mmToPx(parseFloat(margins.bottom) || 20);
  const marginLeftPx = mmToPx(parseFloat(margins.left) || 25);
  const marginRightPx = mmToPx(parseFloat(margins.right) || 25);

  // Header/footer height (approx 10mm each if enabled)
  const headerHeightPx = header.enabled ? mmToPx(10) : 0;
  const footerHeightPx = footer.enabled ? mmToPx(10) : 0;

  // Usable content height
  const usableHeightPx = pageHeightPx - marginTopPx - marginBottomPx - headerHeightPx - footerHeightPx;

  // Page stride = full page height + gap between pages
  const pageStridePx = pageHeightPx + pageGap;

  // Content width
  const contentWidthPx = pageWidthPx - marginLeftPx - marginRightPx;

  return {
    pageHeightPx,
    pageStridePx,
    usableHeightPx,
    marginLeftPx,
    marginRightPx,
    marginTopPx,
    marginBottomPx,
    headerHeightPx,
    footerHeightPx,
    contentWidthPx,
    pageWidthPx,
  };
}
