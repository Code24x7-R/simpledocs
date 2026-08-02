/**
 * Auto Page Break Utilities
 *
 * These utilities handle automatic insertion of page breaks when content
 * exceeds the available page height. The approach:
 *
 * 1. Measure the rendered content height
 * 2. If it overflows, find block-level elements that cross the page boundary
 * 3. Insert page breaks before the last block that fits within the page
 */

/**
 * Find the optimal position to insert a page break.
 * Walks through block-level elements and finds the last one that
 * fits within the available height.
 *
 * @param container - The container element holding the content
 * @param availableHeight - Available height per page in pixels
 * @returns The node index where the page break should be inserted, or -1 if no break needed
 */
export function findPageBreakPosition(
  container: HTMLElement,
  availableHeight: number
): number {
  const blocks = container.querySelectorAll(
    'p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, pre, table, hr, div[data-type="page-break"]'
  );

  if (blocks.length === 0) return -1;

  let lastFittingIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i] as HTMLElement;
    const blockBottom = block.offsetTop + block.offsetHeight;

    // Check if this block fits within the available height
    if (blockBottom <= availableHeight) {
      lastFittingIndex = i;
    } else {
      // This block overflows - we need a break before it
      break;
    }
  }

  return lastFittingIndex;
}

/**
 * Check if content in a container exceeds the available height.
 *
 * @param container - The container element
 * @param availableHeight - Available height in pixels
 * @returns true if content overflows
 */
export function containerOverflows(
  container: HTMLElement,
  availableHeight: number
): boolean {
  return container.scrollHeight > availableHeight;
}

/**
 * Get the total content height from an HTML string.
 * Creates a temporary hidden element to measure.
 *
 * @param html - HTML string to measure
 * @param width - Width constraint in pixels
 * @returns Height in pixels
 */
export function measureHtmlContentHeight(html: string, width: number): number {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  div.style.width = `${width}px`;
  div.style.visibility = 'hidden';
  div.style.padding = '0';
  div.style.margin = '0';
  div.innerHTML = html;
  document.body.appendChild(div);
  const height = div.scrollHeight;
  document.body.removeChild(div);
  return height;
}

/**
 * Split HTML content at page break markers.
 * Returns an array of HTML strings, one per page.
 *
 * @param html - Full HTML content with page break markers
 * @returns Array of HTML strings per page
 */
export function splitHtmlAtPageBreaks(html: string): string[] {
  // Split on page break divs
  const parts = html.split(/<div[^>]*data-type="page-break"[^>]*>[^<]*<\/div>/i);

  // Filter out empty parts
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Calculate the number of pages needed for given content.
 *
 * @param contentHeight - Total content height in pixels
 * @param pageHeight - Available height per page in pixels
 * @returns Number of pages needed
 */
export function calculatePageCount(contentHeight: number, pageHeight: number): number {
  if (contentHeight <= 0) return 1;
  return Math.max(1, Math.ceil(contentHeight / pageHeight));
}
