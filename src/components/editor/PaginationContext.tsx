// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * PaginationContext — shares per-page geometry data with rendering components.
 *
 * In the true paginated model, each page is a self-contained fixed-height
 * container. The context computes geometry directly from document settings
 * (no layout engine needed for rendering).
 *
 * Geometry:
 *   usableHeightPx = pageHeightPx - marginTop - marginBottom - headerHeight - footerHeight
 *   lineHeightPx   = fixed grid line height (derived from usableHeight / linesPerPage)
 */

import { createContext, useContext, useMemo } from 'react';
import { useDocStore } from '../../store/useDocStore';
import { buildPageGeometry } from '../../utils/pagination';
import { mmToPx } from '../../utils/unitConversion';

export interface PaginationContextValue {
  /** Total number of pages (derived from pages array length) */
  totalPages: number;
  /** Fixed line height in px */
  lineHeightPx: number;
  /** Lines per page (fixed grid) */
  linesPerPage: number;
  /** Usable content height per page in px (body area only) */
  usableHeightPx: number;
  /** Full page height in px (including margins, header, footer) */
  pageHeightPx: number;
  /** Left margin in px */
  marginLeftPx: number;
  /** Right margin in px */
  marginRightPx: number;
  /** Top margin in px */
  marginTopPx: number;
  /** Bottom margin in px */
  marginBottomPx: number;
  /** Header height in px (0 if disabled) */
  headerHeightPx: number;
  /** Footer height in px (0 if disabled) */
  footerHeightPx: number;
  /** Content width in px (page width minus side margins) */
  contentWidthPx: number;
  /** Page width in px */
  pageWidthPx: number;
  /** Page gap in px (vertical space between pages) */
  pageGapPx: number;
}

const PaginationContext = createContext<PaginationContextValue | null>(null);

export function PaginationProvider({ children }: { children: React.ReactNode }) {
  const { docState } = useDocStore();

  const value = useMemo<PaginationContextValue>(() => {
    const geometry = buildPageGeometry(docState.settings);

    // Convert MM geometry to PX (single conversion)
    const pageHeightPx = mmToPx(geometry.height);
    const marginTopPx = mmToPx(geometry.margins.top);
    const marginBottomPx = mmToPx(geometry.margins.bottom);
    const marginLeftPx = mmToPx(geometry.margins.left);
    const marginRightPx = mmToPx(geometry.margins.right);
    const headerHeightPx = mmToPx(geometry.headerHeight);
    const footerHeightPx = mmToPx(geometry.footerHeight);
    const pageWidthPx = mmToPx(geometry.width);

    // Fixed grid: 28 lines per page
    const linesPerPage = 28;
    const usableHeightPx =
      pageHeightPx - marginTopPx - marginBottomPx - headerHeightPx - footerHeightPx;
    const lineHeightPx = usableHeightPx / linesPerPage;

    // Page gap = 10 lines of spacing
    const pageGapPx = lineHeightPx * 10;

    const contentWidthPx = pageWidthPx - marginLeftPx - marginRightPx;

    return {
      totalPages: docState.pages.length,
      lineHeightPx,
      linesPerPage,
      usableHeightPx,
      pageHeightPx,
      marginLeftPx,
      marginRightPx,
      marginTopPx,
      marginBottomPx,
      headerHeightPx,
      footerHeightPx,
      contentWidthPx,
      pageWidthPx,
      pageGapPx,
    };
  }, [docState.settings, docState.pages.length]);

  return <PaginationContext.Provider value={value}>{children}</PaginationContext.Provider>;
}

export function usePaginationContext(): PaginationContextValue {
  const ctx = useContext(PaginationContext);
  if (!ctx) {
    throw new Error('usePaginationContext must be used within PaginationProvider');
  }
  return ctx;
}
