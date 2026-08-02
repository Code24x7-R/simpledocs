// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useRef, useCallback, useEffect, useState } from 'react';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageBackground from './PageBackground';
import { usePagination } from '../../hooks/usePagination';
import { mmToPx } from '../../utils/unitConversion';

/**
 * Paginated Viewport - Approach A: Continuous Scroll with Visual Pages
 *
 * Architecture:
 * - Single Tiptap editor holds ALL content (one continuous document)
 * - Visual page backgrounds rendered at calculated Y positions
 * - Page gaps between backgrounds for clear visual separation
 * - Headers/Footers shown on each page
 * - Navigation scrolls viewport by page increments
 * - Zoom rescales the entire view
 *
 * This matches Microsoft Word's Print Layout experience.
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

  // Use the DocumentLayoutEngine for page geometry calculations
  const { totalPages: engineTotalPages } = usePagination();

  const { settings } = docState;
  const { pageFormat, orientation, margins, pageGap = 24 } = settings;
  const { showPageBackgrounds = true } = settings;

  // Calculate page dimensions
  const { heightPx } = (() => {
    const fmt = pageFormat === 'A4' ? { w: 210, h: 297 } : { w: 215.9, h: 279.4 };
    return orientation === 'landscape'
      ? { heightPx: mmToPx(fmt.w) }
      : { heightPx: mmToPx(fmt.h) };
  })();

  // Left/right margins in px — must match PageBackground padding
  const marginPx = {
    left: mmToPx(parseFloat(margins.left) || 25),
    right: mmToPx(parseFloat(margins.right) || 25),
  };

  // Measure actual content height via ResizeObserver — this is the source
  // of truth for total pages. Engine estimates can be off due to complex
  // formatting, so we use the real rendered height to ensure the scroll
  // container is always tall enough to fit all content.
  const [measuredTotalPages, setMeasuredTotalPages] = useState(1);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // The scaled content wrapper is the first child of the scroll container
    const contentWrapper = container.firstElementChild as HTMLElement | null;
    if (!contentWrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight = entry.contentRect.height;
        const pageStride = heightPx + pageGap;
        const pages = Math.max(1, Math.ceil(contentHeight / pageStride));
        setMeasuredTotalPages(pages);
      }
    });

    observer.observe(contentWrapper);
    return () => observer.disconnect();
  }, [heightPx, pageGap]);

  // Use the MAXIMUM of engine estimate, store value, and actual measured
  // content height. This ensures the scroll container is always tall enough
  // to fit all content, even if the engine underestimates.
  const effectiveTotalPages = Math.max(
    engineTotalPages,
    totalPages,
    measuredTotalPages,
    1
  );

  // Total scroll height = pages * (pageHeight + gap)
  const totalScrollHeight = effectiveTotalPages * (heightPx + pageGap);

  // Sync engine-calculated total pages to store
  useEffect(() => {
    if (engineTotalPages > 0 && engineTotalPages !== totalPages) {
      setTotalPages(engineTotalPages);
    }
  }, [engineTotalPages, totalPages, setTotalPages]);

  // Handle scroll to track current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isNavigatingRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const pageIndex = Math.floor(scrollTop / (heightPx + pageGap)) + 1;
    const clampedPage = Math.max(1, Math.min(pageIndex, effectiveTotalPages));

    if (clampedPage !== currentPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, heightPx, pageGap, effectiveTotalPages, setCurrentPage]);

  // Scroll to current page when it changes via navigation controls
  useEffect(() => {
    if (!containerRef.current) return;

    const targetScroll = (currentPage - 1) * (heightPx + pageGap);
    const currentScroll = containerRef.current.scrollTop;

    // Only scroll if not already at target (prevents fighting with user scroll)
    if (Math.abs(currentScroll - targetScroll) > 5) {
      isNavigatingRef.current = true;
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      // Reset navigation flag only when the scroll animation actually ends.
      // Using scrollend event (with setTimeout fallback for older browsers)
      // instead of a fixed timeout that may fire mid-scroll.
      let scrollTimeout: ReturnType<typeof setTimeout>;
      const onScrollEnd = () => {
        isNavigatingRef.current = false;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        containerRef.current?.removeEventListener('scrollend', onScrollEnd);
      };

      containerRef.current.addEventListener('scrollend', onScrollEnd, { once: true });
      // Fallback: if scrollend doesn't fire within 1.5s, reset anyway
      scrollTimeout = setTimeout(onScrollEnd, 1500);
    }
  }, [currentPage, heightPx, pageGap]);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    []
  );

  // Calculate page positions
  const pagePositions = Array.from({ length: effectiveTotalPages }).map(
    (_, i) => ({
      pageNumber: i + 1,
      top: i * (heightPx + pageGap),
      height: heightPx,
    })
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-100 min-h-0">
      {/* Scrollable Viewport */}
      <div
        id="paginated-viewport"
        ref={handleRef}
        className="flex-1 overflow-y-auto relative min-h-0"
        onScroll={handleScroll}
      >
        {/* Content area with zoom transform */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            minHeight: `${totalScrollHeight}px`,
            position: 'relative',
          }}
        >
          {/* Visual page backgrounds (rendered first = behind editor) */}
          {showPageBackgrounds &&
            pagePositions.map((page) => (
              <PageBackground
                key={page.pageNumber}
                pageNumber={page.pageNumber}
                top={page.top + 24} // Account for padding-top: 6
                height={page.height}
              />
            ))}

          {/* The continuous editor content (on top of page backgrounds).
              Padding matches the page background margins so text aligns
              with the visible content area. */}
          <div className="flex justify-center pt-6" style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                width: orientation === 'landscape' ? '1010px' : '794px',
                paddingLeft: `${marginPx.left}px`,
                paddingRight: `${marginPx.right}px`,
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
