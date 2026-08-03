// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * PaginationContext — shares page geometry data with rendering components.
 *
 * In the single-editor model, pages are visual guides. Geometry is computed
 * directly from document settings. Page count is derived from content height.
 */

import { createContext, useContext, useMemo } from 'react';
import { useDocStore } from '../../store/useDocStore';
import { buildPageGeometry } from '../../utils/pagination';
import { mmToPx } from '../../utils/unitConversion';

export interface PaginationContextValue {
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
  /** Page gap in px (vertical space between page visuals) */
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

    // Page gap = 24px (visual spacing between page cards)
    const pageGapPx = docState.settings.pageGap || 24;

    const contentWidthPx = pageWidthPx - marginLeftPx - marginRightPx;

    return {
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
  }, [docState.settings]);

  return <PaginationContext.Provider value={value}>{children}</PaginationContext.Provider>;
}

export function usePaginationContext(): PaginationContextValue {
  const ctx = useContext(PaginationContext);
  if (!ctx) {
    throw new Error('usePaginationContext must be used within PaginationProvider');
  }
  return ctx;
}
