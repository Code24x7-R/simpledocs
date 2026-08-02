// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
export interface PageBreakPoint {
  /** The position in the document where the break should be inserted */
  pos: number;
  /** The node index in the document content array */
  nodeIndex: number;
}

/**
 * Calculate where page breaks should be inserted based on content height.
 * Returns an array of positions where page breaks should be added.
 *
 * @param contentHeight - Total height of the content in pixels
 * @param pageHeight - Available height per page in pixels (excluding margins)
 * @param margins - Margin values in pixels
 */
export function calculatePageBreaks(
  contentHeight: number,
  pageHeight: number,
  margins: { top: number; bottom: number }
): number {
  if (contentHeight <= pageHeight) return 1;
  const availableHeight = pageHeight - margins.top - margins.bottom;
  return Math.ceil(contentHeight / availableHeight);
}

/**
 * Determine if content overflows the current page.
 *
 * @param contentHeight - Measured content height in pixels
 * @param pageHeight - Available page height in pixels
 * @returns true if content overflows
 */
export function doesContentOverflow(contentHeight: number, pageHeight: number): boolean {
  return contentHeight > pageHeight;
}

/**
 * Calculate the available content area height for a page.
 *
 * @param pageHeightPx - Total page height in pixels
 * @param marginTopPx - Top margin in pixels
 * @param marginBottomPx - Bottom margin in pixels
 * @param headerHeightPx - Header height in pixels (0 if disabled)
 * @param footerHeightPx - Footer height in pixels (0 if disabled)
 */
export function calculateAvailableHeight(
  pageHeightPx: number,
  marginTopPx: number,
  marginBottomPx: number,
  headerHeightPx: number = 0,
  footerHeightPx: number = 0
): number {
  return pageHeightPx - marginTopPx - marginBottomPx - headerHeightPx - footerHeightPx;
}

/**
 * Split content into page-sized chunks.
 * Takes an array of items with heights and returns page assignments.
 *
 * @param items - Array of items with known heights
 * @param maxPageHeight - Maximum height per page
 * @returns Array of arrays, each representing items on a page
 */
export function splitContentIntoPages<T extends { height: number }>(
  items: T[],
  maxPageHeight: number
): T[][] {
  const pages: T[][] = [];
  let currentPage: T[] = [];
  let currentPageHeight = 0;

  for (const item of items) {
    if (currentPageHeight + item.height > maxPageHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentPageHeight = 0;
    }
    currentPage.push(item);
    currentPageHeight += item.height;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}
