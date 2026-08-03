// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import {
  PaginationProvider,
  usePaginationContext,
} from './PaginationContext';

/**
 * Paginated Viewport — Google Docs style.
 *
 * Architecture:
 * - Single Tiptap editor renders all content in natural flow
 * - Page backgrounds are visual guides rendered behind the editor
 * - Page boundaries computed from content height / page height
 * - No content splitting, no overflow detection, no redistribution
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
  const [contentHeight, setContentHeight] = useState(0);

  // Compute page count from content height
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.scrollHeight;
      setContentHeight(height);
      const stride = pageHeightPx + pageGapPx;
      const count = Math.max(1, Math.ceil(height / stride));
      setPageCount(count);
    };

    measure();

    // Observe content size changes
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

  // Generate page background elements
  const pages = Array.from({ length: pageCount }, (_, i) => {
    const top = i * (pageHeightPx + pageGapPx);
    return { index: i, top };
  });

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
          {/* Page backgrounds (visual guides) */}
          {docState.settings.showPageBackgrounds && (
            <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: contentHeight }}>
              {pages.map((page) => (
                <div
                  key={page.index}
                  className="page-background absolute left-1/2 -translate-x-1/2"
                  data-testid="page-canvas"
                  style={{
                    top: page.top,
                    width: pageWidthPx,
                    height: pageHeightPx,
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '2px',
                  }}
                >
                  {/* Header area */}
                  {docState.settings.header.enabled && (
                    <div
                      className="page-header absolute"
                      style={{
                        top: marginTopPx,
                        left: marginLeftPx,
                        right: marginRightPx,
                        height: headerHeightPx,
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                        fontSize: '12px',
                        color: '#6b7280',
                        pointerEvents: 'none',
                      }}
                    >
                      {docState.settings.header.content || docState.title}
                    </div>
                  )}

                  {/* Footer area */}
                  {docState.settings.footer.enabled && (
                    <div
                      className="page-footer absolute"
                      style={{
                        bottom: 0,
                        left: marginLeftPx,
                        right: marginRightPx,
                        height: footerHeightPx,
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: docState.settings.footer.showPageNumbers
                          ? 'flex-end'
                          : 'center',
                        paddingRight: '8px',
                        fontSize: '12px',
                        color: '#6b7280',
                        pointerEvents: 'none',
                      }}
                    >
                      {docState.settings.footer.showPageNumbers && (
                        <span>{page.index + 1}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Editor content (renders on top of backgrounds) */}
          <div
            ref={contentRef}
            className="document-content relative"
            style={{
              maxWidth: pageWidthPx,
              margin: '0 auto',
              paddingTop: marginTopPx + headerHeightPx,
              paddingBottom: footerHeightPx,
              paddingLeft: marginLeftPx,
              paddingRight: marginRightPx,
              minHeight: pageHeightPx,
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
