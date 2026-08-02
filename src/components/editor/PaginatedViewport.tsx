// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useRef, useCallback, useEffect, useState } from 'react';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageBackground from './PageBackground';
import { calculatePageGeometry } from '../../utils/pageGeometry';

/**
 * Paginated Viewport — Continuous Scroll with Visual Pages
 *
 * Architecture:
 * - Single Tiptap editor holds ALL content (one continuous document)
 * - Visual page backgrounds rendered at calculated Y positions
 * - Page gaps between backgrounds for clear visual separation
 * - Headers/Footers shown on each page
 * - Navigation scrolls viewport by page increments
 *
 * Page geometry is calculated once via calculatePageGeometry and shared
 * with PageBreakView to ensure perfect alignment.
 */
export default function PaginatedViewport() {
  const {
    docState,
    zoom,
    currentPage,
    totalPages,
    setCurrentPage,
    setTotalPages,
  } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);

  const { settings } = docState;
  const { showPageBackgrounds = true } = settings;

  // Calculate page geometry (shared with PageBreakView)
  const geo = calculatePageGeometry(settings);
  const { pageHeightPx, pageStridePx, marginLeftPx, marginRightPx } = geo;

  // Measure actual content height via ResizeObserver — ensures the scroll
  // container is always tall enough to fit all content.
  const [measuredTotalPages, setMeasuredTotalPages] = useState(1);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const contentWrapper = container.firstElementChild as HTMLElement | null;
    if (!contentWrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight = entry.contentRect.height;
        const pages = Math.max(1, Math.ceil(contentHeight / pageStridePx));
        setMeasuredTotalPages(pages);
      }
    });

    observer.observe(contentWrapper);
    return () => observer.disconnect();
  }, [pageStridePx]);

  // Use the MAXIMUM of store value and actual measured content height.
  const effectiveTotalPages = Math.max(totalPages, measuredTotalPages, 1);

  // Total scroll height = pages * pageStride
  const totalScrollHeight = effectiveTotalPages * pageStridePx;

  // Sync total pages to store
  useEffect(() => {
    if (effectiveTotalPages !== totalPages) {
      setTotalPages(effectiveTotalPages);
    }
  }, [effectiveTotalPages, totalPages, setTotalPages]);

  // Handle scroll to track current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isNavigatingRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const pageIndex = Math.floor(scrollTop / pageStridePx) + 1;
    const clampedPage = Math.max(1, Math.min(pageIndex, effectiveTotalPages));

    if (clampedPage !== currentPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, pageStridePx, effectiveTotalPages, setCurrentPage]);

  // Scroll to current page when it changes via navigation controls
  useEffect(() => {
    if (!containerRef.current) return;

    const targetScroll = (currentPage - 1) * pageStridePx;
    const currentScroll = containerRef.current.scrollTop;

    if (Math.abs(currentScroll - targetScroll) > 5) {
      isNavigatingRef.current = true;
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      let scrollTimeout: ReturnType<typeof setTimeout>;
      const onScrollEnd = () => {
        isNavigatingRef.current = false;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        containerRef.current?.removeEventListener('scrollend', onScrollEnd);
      };

      containerRef.current.addEventListener('scrollend', onScrollEnd, { once: true });
      scrollTimeout = setTimeout(onScrollEnd, 1500);
    }
  }, [currentPage, pageStridePx]);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    []
  );

  // Calculate page positions
  const pagePositions = Array.from({ length: effectiveTotalPages }).map((_, i) => ({
    pageNumber: i + 1,
    top: i * pageStridePx,
    height: pageHeightPx,
  }));

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
            minHeight: `${totalScrollHeight}px`,
            position: 'relative',
          }}
        >
          {/* Visual page backgrounds */}
          {showPageBackgrounds &&
            pagePositions.map((page) => (
              <PageBackground
                key={page.pageNumber}
                pageNumber={page.pageNumber}
                top={page.top + 24}
                height={page.height}
              />
            ))}

          {/* Editor content with margins */}
          <div className="flex justify-center pt-6" style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                width: geo.pageWidthPx,
                paddingLeft: `${marginLeftPx}px`,
                paddingRight: `${marginRightPx}px`,
              }}
            >
              <DocumentEditor />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
