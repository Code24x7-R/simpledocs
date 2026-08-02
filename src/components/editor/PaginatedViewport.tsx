import { useRef, useCallback, useEffect } from 'react';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageBackground from './PageBackground';
import PageNavigation from './PageNavigation';
import { calculateAvailableHeight } from '../../utils/pageOverflow';
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
    editor,
    currentPage,
    totalPages,
    setCurrentPage,
    setTotalPages,
  } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const { settings } = docState;
  const { pageFormat, orientation, margins, header, footer, pageGap } =
    settings;

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

  // Total scroll height = pages * (pageHeight + gap)
  const totalScrollHeight = Math.max(totalPages, 1) * (heightPx + pageGap);

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

  // Handle scroll to track current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const pageIndex = Math.floor(scrollTop / (heightPx + pageGap)) + 1;
    const clampedPage = Math.max(1, Math.min(pageIndex, totalPages));

    if (clampedPage !== currentPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, heightPx, pageGap, totalPages, setCurrentPage]);

  // Scroll to current page when it changes via navigation controls
  useEffect(() => {
    if (!containerRef.current) return;

    const targetScroll = (currentPage - 1) * (heightPx + pageGap);
    if (Math.abs(containerRef.current.scrollTop - targetScroll) > 1) {
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
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
  const pagePositions = Array.from({ length: Math.max(totalPages, 1) }).map(
    (_, i) => ({
      pageNumber: i + 1,
      top: i * (heightPx + pageGap),
      height: heightPx,
    })
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      {/* Page Navigation Controls */}
      <PageNavigation />

      {/* Scrollable Viewport */}
      <div
        ref={handleRef}
        className="flex-1 overflow-y-auto relative"
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
          {/* The continuous editor content */}
          <div className="flex justify-center pt-6">
            <div style={{ width: orientation === 'landscape' ? '1010px' : '794px' }}>
              <DocumentEditor />
            </div>
          </div>

          {/* Visual page backgrounds */}
          {settings.showPageBackgrounds &&
            pagePositions.map((page) => (
              <PageBackground
                key={page.pageNumber}
                pageNumber={page.pageNumber}
                top={page.top + 24} // Account for padding-top: 6
                height={page.height}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
