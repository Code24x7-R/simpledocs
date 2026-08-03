// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { Page } from '../types/page';
import { createEmptyPage, createPageFromContent } from '../types/page';
import type { DocSettings } from '../store/useDocStore';
import { extractText } from './pagination';

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
 * 2. Redistributing overflow content to the next page
 * 3. Pulling content back from the next page when space is available
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
 * Estimate the number of lines a block occupies, accounting for text
 * wrapping within the page content width.
 */
function estimateBlockLines(block: Record<string, unknown>): number {
  const type = block.type as string | undefined;

  switch (type) {
    case 'paragraph':
    case 'heading': {
      // Estimate wrapped lines based on text length and page width
      const text = extractText(block);
      return estimateTextLines(text);
    }

    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      const items = (block.content as any[]) ?? [];
      // Each list item can wrap to multiple lines
      let totalLines = 0;
      for (const item of items) {
        const itemText = extractText(item);
        totalLines += estimateTextLines(itemText);
      }
      return Math.max(1, totalLines);
    }

    case 'table': {
      const rows = (block.content as any[]) ?? [];
      return Math.max(1, rows.length);
    }

    case 'codeBlock': {
      const text = extractText(block);
      return Math.max(1, (text.match(/\n/g)?.length ?? 0) + 1);
    }

    default:
      return 1;
  }
}

/**
 * Estimate how many visual lines a text will occupy when wrapped to the
 * page content width. Based on average character width and line length.
 */
function estimateTextLines(text: string): number {
  if (!text || text.length === 0) return 1;
  // Average chars per line for A4 with default margins (~80-90 chars)
  // This matches typical content width of ~500-550px at ~6-7px per char
  const charsPerLine = 80;
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

/**
 * Lines per page. Must match PaginationContext.tsx which uses a fixed
 * 28-line grid. Keeping these in sync ensures content is split at the
 * same boundaries where it will actually overflow during rendering.
 */
function estimateLinesPerPage(_settings: DocSettings | undefined): number {
  return 28;
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
