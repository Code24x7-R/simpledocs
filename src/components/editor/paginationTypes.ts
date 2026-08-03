// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { createContext } from 'react';

export interface PaginationContextValue {
  /** Fixed line height in px */
  lineHeightPx: number;
  /** Lines per page (fixed grid) */
  linesPerPage: number;
  /** Usable content height per px (body area only) */
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

export const PaginationContext = createContext<PaginationContextValue | null>(null);
