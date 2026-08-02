import { useRef, useCallback, useEffect, useState } from 'react';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageCanvas from './PageCanvas';
import PageNavigation from './PageNavigation';
import { calculateAvailableHeight } from '../../utils/pageOverflow';
import { mmToPx } from '../../utils/unitConversion';

/**
 * Paginated Viewport - True Fixed-Viewport Experience
 *
 * Architecture:
 * - Fixed viewport area shows ONE page at a time
 * - CSS scroll-snap enforces page-by-page navigation
 * - Navigation controls (prev/next/page jump) for explicit movement
 * - Zoom rescales the page canvas within the viewport
 * - Editor content is one continuous document
 */
export default function PaginatedViewport() {
  const {
    docState,
    zoom,
    editor,
    currentPage,
    totalPages,
    setCurrentPage,
    setTotalPages,
  } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(0);
  const [snapReady, setSnapReady] = useState(false);

  const { settings } = docState;
  const { pageFormat, orientation, margins, header, footer } = settings;

  // Calculate page dimensions
  const { heightPx } = (() => {
    const fmt = pageFormat === 'A4' ? { w: 210, h: 297 } : { w: 215.9, h: 279.4 };
    return orientation === 'landscape'
      ? { heightPx: mmToPx(fmt.w) }
      : { heightPx: mmToPx(fmt.h) };
  })();

  const marginPx = {
    top: mmToPx(parseFloat(margins.top) || 20),
    bottom: mmToPx(parseFloat(margins.bottom) || 20),
    left: mmToPx(parseFloat(margins.left) || 25),
    right: mmToPx(parseFloat(margins.right) || 25),
  };

  const headerHeight = header.enabled ? mmToPx(10) : 0;
  const footerHeight = footer.enabled && footer.showPageNumbers ? mmToPx(10) : 0;

  const availableHeight = calculateAvailableHeight(
    heightPx,
    marginPx.top,
    marginPx.bottom,
    headerHeight,
    footerHeight
  );

  // Set page height for snap scrolling
  useEffect(() => {
    setPageHeight(heightPx);
  }, [heightPx]);

  // Calculate total pages from content height
  useEffect(() => {
    if (!editor) return;

    const updateTotalPages = () => {
      const editorEl = document.querySelector('.tiptap') as HTMLElement;
      if (!editorEl) return;

      const contentHeight = editorEl.scrollHeight;
      const total = Math.max(1, Math.ceil(contentHeight / availableHeight));
      setTotalPages(total);
    };

    const timeout = setTimeout(updateTotalPages, 150);
    return () => clearTimeout(timeout);
  }, [editor, editor?.getHTML, availableHeight, setTotalPages]);

  // Handle scroll with snap-to-page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !snapReady) return;

    const scrollTop = containerRef.current.scrollTop;
    const pageIndex = Math.round(scrollTop / pageHeight) + 1;

    if (pageIndex !== currentPage && pageIndex >= 1) {
      setCurrentPage(pageIndex);
    }
  }, [currentPage, pageHeight, setCurrentPage, snapReady]);

  // Scroll to current page when it changes via navigation controls
  useEffect(() => {
    if (!containerRef.current || !snapReady) return;

    const targetScroll = (currentPage - 1) * pageHeight;
    if (Math.abs(containerRef.current.scrollTop - targetScroll) > 1) {
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [currentPage, pageHeight, snapReady]);

  // Enable snap after initial render
  useEffect(() => {
    const timer = setTimeout(() => setSnapReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    []
  );

  return (
    <div className="flex-1 flex flex-col bg-canvas">
      {/* Page Navigation Controls */}
      <PageNavigation />

      {/* Fixed Viewport Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Scrollable container with snap */}
        <div
          ref={handleRef}
          className="h-full overflow-y-auto"
          onScroll={handleScroll}
          style={{
            scrollSnapType: snapReady ? 'y mandatory' : 'none',
            scrollBehavior: 'smooth',
          }}
        >
          {/* Content area - tall enough for all pages */}
          <div
            style={{
              height: `${pageHeight * Math.max(totalPages, 1)}px`,
              minHeight: `${pageHeight}px`,
            }}
          >
            {/* Page Canvas - shows one page at a time */}
            <div
              style={{
                height: `${pageHeight}px`,
                scrollSnapAlign: 'start',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                paddingTop: '24px',
              }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <PageCanvas
                  pageNumber={currentPage}
                  totalPages={totalPages}
                  isFirstPage={currentPage === 1}
                >
                  <DocumentEditor />
                </PageCanvas>
              </div>
            </div>

            {/* Additional snap points for pages 2+ */}
            {Array.from({ length: Math.max(0, totalPages - 1) }).map(
              (_, i) => (
                <div
                  key={`snap-${i}`}
                  style={{
                    height: `${pageHeight}px`,
                    scrollSnapAlign: 'start',
                  }}
                />
              )
            )}
          </div>
        </div>

        {/* Page break visual indicator */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '50%',
            height: '1px',
            background:
              'linear-gradient(to right, transparent, #ccc, transparent)',
          }}
        />
      </div>
    </div>
  );
}
