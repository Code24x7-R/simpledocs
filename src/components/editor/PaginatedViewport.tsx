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
    editor,
    zoom,
    currentPage,
    setCurrentPage,
    setTotalPages,
    docState,
    fullBleedMode,
    programmaticScrollUntil,
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
  /** True during programmatic scrolls (page nav, search) — suppresses page tracking */
  const programmaticScrollRef = useRef(false);
  const [pageCount, setPageCount] = useState(1);

  /**
   * Scroll to a Y offset (layout px, unscaled) and optionally move the
   * editor caret there. Used by page navigation.
   */
  const scrollToOffset = useCallback((targetScroll: number, moveCursor = false) => {
    const container = containerRef.current;
    if (!container) return;

    programmaticScrollRef.current = true;
    container.scrollTo({ top: targetScroll, behavior: 'smooth' });

    if (moveCursor && editor && contentRef.current) {
      // Position the caret at the visual top of the target page
      requestAnimationFrame(() => {
        const contentTop = contentRef.current!.getBoundingClientRect().top;
        const viewportTop = container.getBoundingClientRect().top;
        // Detect zoom scale
        const contentWrapper = container.querySelector('[style*="transform"]') as HTMLElement | null;
        const transform = contentWrapper?.style.transform || '';
        const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
        const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
        // Place caret 20px (scaled) below the content top
        const caretY = (viewportTop - contentTop) / scale + 20;
        const pos = editor.view.posAtCoords({ left: 80, top: caretY });
        if (pos) {
          editor.chain().focus().setTextSelection(pos.pos).run();
        }
      });
    }

    // Release the lock after scroll settles (or timeout as fallback)
    const releaseLock = () => {
      programmaticScrollRef.current = false;
    };
    container.addEventListener('scrollend', releaseLock, { once: true });
    setTimeout(releaseLock, 1500);
  }, [editor]);

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
    if (!containerRef.current) return;
    // Suppress page tracking during programmatic scrolls (page nav, search)
    if (programmaticScrollRef.current) return;
    if (Date.now() < programmaticScrollUntil) return;

    const scrollTop = containerRef.current.scrollTop;
    const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
    const stride = pageHeightPx + pageGapPx;

    // When at the bottom of the buffer, always report the last page
    // (scroll position may not reach the exact last-page target)
    let pageIndex: number;
    if (maxScroll > 0 && scrollTop >= maxScroll - 1) {
      pageIndex = pageCount;
    } else {
      pageIndex = Math.floor(scrollTop / stride) + 1;
    }
    const clampedPage = Math.max(1, Math.min(pageIndex, pageCount));

    if (clampedPage !== currentPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, pageHeightPx, pageGapPx, pageCount, setCurrentPage, programmaticScrollUntil]);

  // Scroll to current page when it changes via navigation controls.
  // Also moves the editor caret to the top of the target page so typing
  // doesn't snap the view back to the old cursor position.
  useEffect(() => {
    if (!containerRef.current) return;

    const stride = pageHeightPx + pageGapPx;
    const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
    const targetScroll = Math.min((currentPage - 1) * stride, maxScroll);
    const currentScroll = containerRef.current.scrollTop;

    if (Math.abs(currentScroll - targetScroll) > 5) {
      scrollToOffset(targetScroll, true);
    }
  }, [currentPage, pageHeightPx, pageGapPx, scrollToOffset]);

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
        className={`flex-1 overflow-y-auto relative min-h-0 ${fullBleedMode ? 'overflow-x-hidden' : ''}`}
        onScroll={handleScroll}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: fullBleedMode ? 'top left' : 'top center',
          }}
        >
          {/* Editor content */}
          <div
            ref={contentRef}
            className={`document-content relative bg-white ${fullBleedMode ? '' : 'mx-auto'}`}
            style={
              fullBleedMode
                ? {
                    // Full-bleed: fill viewport width, no page margins, no shadow
                    paddingLeft: '80px',
                    paddingRight: '80px',
                    paddingTop: '40px',
                    paddingBottom: '40px',
                  }
                : {
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
                  }
            }
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
