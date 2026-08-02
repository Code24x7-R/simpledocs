// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
export interface PageContent {
  /** HTML content for this page */
  html: string;
  /** Page number (1-indexed) */
  pageNumber: number;
}

/**
 * Split HTML content into pages based on height constraints.
 * This function takes raw HTML and splits it into chunks that fit
 * within the specified page height.
 *
 * Note: This is a simplified approach. For production, consider using
 * a more sophisticated layout engine or the CSS `columns` property.
 *
 * @param html - Full HTML content
 * @param pageHeightPx - Available height per page in pixels
 * @returns Array of page content objects
 */
export function splitHtmlIntoPages(html: string, pageHeightPx: number): PageContent[] {
  // Create a temporary container to measure content
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '700px'; // Approximate page content width
  container.style.visibility = 'hidden';
  container.innerHTML = html;
  document.body.appendChild(container);

  const pages: PageContent[] = [];
  const childNodes = Array.from(container.childNodes);
  let currentPageContent: Node[] = [];
  let currentPageHeight = 0;
  let pageNumber = 1;

  for (const node of childNodes) {
    // Clone the node to measure without affecting original
    const clone = node.cloneNode(true) as HTMLElement;
    container.appendChild(clone);
    const nodeHeight = clone.scrollHeight || clone.offsetHeight;

    if (currentPageHeight + nodeHeight > pageHeightPx && currentPageContent.length > 0) {
      // Finalize current page
      const pageDiv = document.createElement('div');
      currentPageContent.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));
      pages.push({
        html: pageDiv.innerHTML,
        pageNumber: pageNumber++,
      });
      currentPageContent = [node.cloneNode(true)];
      currentPageHeight = nodeHeight;
    } else {
      currentPageContent.push(node.cloneNode(true));
      currentPageHeight += nodeHeight;
    }

    container.removeChild(clone);
  }

  // Final page
  if (currentPageContent.length > 0) {
    const pageDiv = document.createElement('div');
    currentPageContent.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));
    pages.push({
      html: pageDiv.innerHTML,
      pageNumber: pageNumber++,
    });
  }

  document.body.removeChild(container);

  return pages.length > 0 ? pages : [{ html: '', pageNumber: 1 }];
}

/**
 * Calculate the approximate height of HTML content.
 *
 * @param html - HTML string to measure
 * @param widthPx - Width constraint in pixels
 * @returns Approximate height in pixels
 */
export function measureHtmlHeight(html: string, widthPx: number = 700): number {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = `${widthPx}px`;
  container.style.visibility = 'hidden';
  container.innerHTML = html;
  document.body.appendChild(container);
  const height = container.scrollHeight;
  document.body.removeChild(container);
  return height;
}

/**
 * Check if content needs to be split across multiple pages.
 *
 * @param contentHeight - Measured content height
 * @param pageHeight - Available page height
 * @returns true if content needs splitting
 */
export function needsPagination(contentHeight: number, pageHeight: number): boolean {
  return contentHeight > pageHeight;
}
