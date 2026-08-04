// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import { PaginationProvider } from './PaginationContext';
import { usePaginationContext } from './usePaginationContext';

/**
 * Paginated Viewport — continuous scroll editor.
 *
 * Architecture:
 * - Single Tiptap editor renders all content in natural flow
 * - No visual page backgrounds — pagination happens at print/PDF time
 * - Page count computed from content height for navigation only
 */
function PaginatedViewportInner() {
  const {
    zoom,
    currentPage,
    setCurrentPage,
    setTotalPages,
    docState,
  } = useDocStore();
  const {
    pageHeightPx,
    pageGapPx,
    marginTopPx,
    marginLeftPx,
    marginRightPx,
    headerHeightPx,
    footerHeightPx,
    pageWidthPx,
  } = usePaginationContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);
  const [pageCount, setPageCount] = useState(1);

  // Compute page count from content height and page breaks
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.scrollHeight;
      const stride = pageHeightPx + pageGapPx;
      // Base estimate from content height
      const heightBasedCount = Math.max(1, Math.ceil(height / stride));
      // Count actual page break markers in the content
      const pageBreakCount = el.querySelectorAll('[data-type="page-break"]').length;
      // Actual page count is at least the number of page breaks + 1
      const count = Math.max(heightBasedCount, pageBreakCount + 1);
      setPageCount(count);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageHeightPx, pageGapPx, docState.content]);

  // Sync total pages to store
  useEffect(() => {
    setTotalPages(pageCount);
  }, [pageCount, setTotalPages]);

  // Handle scroll to track current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isNavigatingRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const stride = pageHeightPx + pageGapPx;
    const pageIndex = Math.floor(scrollTop / stride) + 1;
    const clampedPage = Math.max(1, Math.min(pageIndex, pageCount));

    if (clampedPage !== currentPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, pageHeightPx, pageGapPx, pageCount, setCurrentPage]);

  // Scroll to current page when it changes via navigation controls
  useEffect(() => {
    if (!containerRef.current) return;

    const stride = pageHeightPx + pageGapPx;
    const targetScroll = (currentPage - 1) * stride;
    const currentScroll = containerRef.current.scrollTop;

    if (Math.abs(currentScroll - targetScroll) > 5) {
      isNavigatingRef.current = true;
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      const onScrollEnd = () => {
        isNavigatingRef.current = false;
        clearTimeout(scrollTimeout);
        containerRef.current?.removeEventListener('scrollend', onScrollEnd);
      };

      const scrollTimeout: ReturnType<typeof setTimeout> = setTimeout(onScrollEnd, 1500);
      containerRef.current.addEventListener('scrollend', onScrollEnd, { once: true });
    }
  }, [currentPage, pageHeightPx, pageGapPx]);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    []
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-100 min-h-0">
      <div
        id="paginated-viewport"
        ref={handleRef}
        className="flex-1 overflow-y-auto relative min-h-0"
        onScroll={handleScroll}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Editor content */}
          <div
            ref={contentRef}
            className="document-content relative bg-white mx-auto"
            style={{
              maxWidth: pageWidthPx,
              marginTop: '24px',
              marginBottom: '24px',
              paddingTop: marginTopPx + headerHeightPx,
              paddingBottom: footerHeightPx,
              paddingLeft: marginLeftPx,
              paddingRight: marginRightPx,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '2px',
              // CSS custom properties for widow/orphan control
              ['--orphans' as string]: docState.settings.orphans,
              ['--widows' as string]: docState.settings.widows,
            }}
          >
            <DocumentEditor />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaginatedViewport() {
  return (
    <PaginationProvider>
      <PaginatedViewportInner />
    </PaginationProvider>
  );
}
