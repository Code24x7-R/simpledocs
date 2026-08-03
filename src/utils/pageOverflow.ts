// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { Page } from '../types/page';
import { createEmptyPage, createPageFromContent } from '../types/page';
import type { DocSettings } from '../store/useDocStore';

/**
 * Page overflow detection and content redistribution.
 *
 * In the true paginated model, each page has a fixed usable body height.
 * When content exceeds that height, overflow content must be moved to the
 * next page. When content is deleted and space becomes available, content
 * from the next page should be pulled back.
 *
 * This module provides utilities for:
 * 1. Splitting a flat content tree into pages (for migration)
 * 2. Detecting overflow in a page's content
 * 3. Redistributing content between adjacent pages
 */

/**
 * Split a flat Tiptap content tree into multiple pages based on page geometry.
 * Used for migrating old-format documents to the new paginated model.
 *
 * The algorithm walks through top-level blocks, accumulating estimated line
 * counts. When adding a block would exceed `linesPerPage`, a new page starts.
 */
export function splitContentIntoPages(
  content: Record<string, unknown>,
  settings: DocSettings | undefined
): Page[] {
  const blocks = (content as any).content as Record<string, unknown>[] | undefined;
  if (!blocks || blocks.length === 0) {
    return [createEmptyPage()];
  }

  // Estimate lines per page from settings (default A4 = 28 lines)
  const linesPerPage = estimateLinesPerPage(settings);

  const pages: Page[] = [];
  let currentPageBlocks: Record<string, unknown>[] = [];
  let currentLines = 0;

  for (const block of blocks) {
    const blockLines = estimateBlockLines(block);

    if (currentLines + blockLines > linesPerPage && currentPageBlocks.length > 0) {
      // Start a new page
      pages.push(
        createPageFromContent({
          type: 'doc',
          content: currentPageBlocks,
        })
      );
      currentPageBlocks = [block];
      currentLines = blockLines;
    } else {
      currentPageBlocks.push(block);
      currentLines += blockLines;
    }
  }

  // Push the last page
  if (currentPageBlocks.length > 0) {
    pages.push(
      createPageFromContent({
        type: 'doc',
        content: currentPageBlocks,
      })
    );
  }

  return pages.length > 0 ? pages : [createEmptyPage()];
}

/**
 * Estimate the number of lines a block occupies.
 * - Paragraph: 1 line (or more if wrapping is significant)
 * - Heading: 1 line + extra spacing
 * - List item: 1 line each
 * - Table: 1 line per row
 */
function estimateBlockLines(block: Record<string, unknown>): number {
  const type = block.type as string | undefined;

  switch (type) {
    case 'paragraph':
    case 'heading':
      return 1;

    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      const items = (block.content as any[]) ?? [];
      return Math.max(1, items.length);
    }

    case 'table': {
      const rows = (block.content as any[]) ?? [];
      return Math.max(1, rows.length);
    }

    case 'codeBlock':
      // Estimate based on newlines in text content
      const text = extractText(block);
      return Math.max(1, (text.match(/\n/g)?.length ?? 0) + 1);

    default:
      return 1;
  }
}

/**
 * Estimate lines per page from document settings.
 * Default: 28 lines for A4 portrait.
 */
function estimateLinesPerPage(settings: DocSettings | undefined): number {
  if (!settings) return 28;

  const pageHeightMm = settings.pageFormat === 'Letter' ? 279.4 : 297; // A4 height in mm
  const marginTopMm = parseFloat(settings.margins.top) || 20;
  const marginBottomMm = parseFloat(settings.margins.bottom) || 20;
  const headerHeightMm = settings.header.enabled ? 10 : 0;
  const footerHeightMm = settings.footer.enabled ? 10 : 0;

  const usableMm = pageHeightMm - marginTopMm - marginBottomMm - headerHeightMm - footerHeightMm;
  // MM→PT: 1mm = 2.8346456693pt
  const usablePt = usableMm * 2.8346456693;

  // Standard line height ~1.2 × 12pt font = 14.4pt
  const lineHeightPt = 14.4;
  return Math.max(1, Math.floor(usablePt / lineHeightPt));
}

/**
 * Extract all text content from a node recursively.
 */
function extractText(node: Record<string, unknown>): string {
  if (node.text) return node.text as string;
  if (Array.isArray(node.content)) {
    return (node.content as Record<string, unknown>[]).map(extractText).join('\n');
  }
  return '';
}

/**
 * Detect if a page's content exceeds the usable body height.
 * Returns true if overflow exists.
 *
 * Note: This is a lightweight heuristic based on block count and estimated
 * line heights. The actual DOM measurement happens in PageEditor via
 * scrollHeight comparison.
 */
export function detectOverflow(
  pageContent: Record<string, unknown>,
  usableHeightPx: number,
  lineHeightPx: number
): boolean {
  const blocks = (pageContent as any).content as Record<string, unknown>[] | undefined;
  if (!blocks) return false;

  const estimatedHeight = blocks.reduce((sum, block) => {
    return sum + estimateBlockLines(block) * lineHeightPx;
  }, 0);

  return estimatedHeight > usableHeightPx;
}

/**
 * Redistribute content from an overflowing page to the next page.
 * Takes the last blocks that don't fit and moves them to the start of the
 * next page.
 *
 * Returns updated pages array, or null if no redistribution was needed.
 */
export function redistributeOverflow(
  pages: Page[],
  pageIndex: number,
  usableHeightPx: number,
  lineHeightPx: number
): Page[] | null {
  if (pageIndex >= pages.length) return null;

  const page = pages[pageIndex];
  const blocks = (page.content as any).content as Record<string, unknown>[] | undefined;
  if (!blocks || blocks.length === 0) return null;

  // Find how many blocks fit
  let usedHeight = 0;
  let fitCount = 0;
  for (const block of blocks) {
    const blockHeight = estimateBlockLines(block) * lineHeightPx;
    if (usedHeight + blockHeight > usableHeightPx) break;
    usedHeight += blockHeight;
    fitCount++;
  }

  if (fitCount >= blocks.length) return null; // No overflow

  const fitting = blocks.slice(0, fitCount);
  const overflow = blocks.slice(fitCount);

  const newPages = [...pages];

  // Update current page with fitting blocks
  newPages[pageIndex] = {
    ...page,
    content: { type: 'doc', content: fitting },
  };

  // Prepend overflow to next page (or create new page if none exists)
  if (pageIndex + 1 < pages.length) {
    const nextBlocks = (pages[pageIndex + 1].content as any).content as Record<string, unknown>[];
    newPages[pageIndex + 1] = {
      ...pages[pageIndex + 1],
      content: { type: 'doc', content: [...overflow, ...nextBlocks] },
    };
  } else {
    // Create a new page for the overflow
    newPages.push(
      createPageFromContent({
        type: 'doc',
        content: overflow,
      })
    );
  }

  return newPages;
}

/**
 * Pull content from the next page when the current page has space.
 * Used after deletions to keep pages densely packed.
 */
export function pullFromNextPage(
  pages: Page[],
  pageIndex: number,
  usableHeightPx: number,
  lineHeightPx: number
): Page[] | null {
  if (pageIndex >= pages.length - 1) return null; // No next page

  const page = pages[pageIndex];
  const nextPage = pages[pageIndex + 1];
  const blocks = (page.content as any).content as Record<string, unknown>[] | undefined;
  const nextBlocks = (nextPage.content as any).content as Record<string, unknown>[] | undefined;

  if (!blocks || !nextBlocks || nextBlocks.length === 0) return null;

  // Calculate current page height
  let currentHeight = 0;
  for (const block of blocks) {
    currentHeight += estimateBlockLines(block) * lineHeightPx;
  }

  // Pull blocks from next page that fit
  const pulled: Record<string, unknown>[] = [];
  let pulledHeight = 0;
  for (const block of nextBlocks) {
    const blockHeight = estimateBlockLines(block) * lineHeightPx;
    if (currentHeight + pulledHeight + blockHeight > usableHeightPx) break;
    pulled.push(block);
    pulledHeight += blockHeight;
  }

  if (pulled.length === 0) return null;

  const newPages = [...pages];

  // Add pulled blocks to current page
  newPages[pageIndex] = {
    ...page,
    content: { type: 'doc', content: [...blocks, ...pulled] },
  };

  // Remove pulled blocks from next page
  const remaining = nextBlocks.slice(pulled.length);
  if (remaining.length === 0) {
    // Remove empty next page (but always keep at least one page)
    if (newPages.length > 1) {
      newPages.splice(pageIndex + 1, 1);
    } else {
      newPages[pageIndex + 1] = createEmptyPage();
    }
  } else {
    newPages[pageIndex + 1] = {
      ...nextPage,
      content: { type: 'doc', content: remaining },
    };
  }

  return newPages;
}
