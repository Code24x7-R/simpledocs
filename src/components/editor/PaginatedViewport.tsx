// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useCallback, useEffect, useRef } from 'react';
import { useDocStore } from '../../store/useDocStore';
import MultiPageEditor from './MultiPageEditor';
import {
  PaginationProvider,
  usePaginationContext,
} from './PaginationContext';

/**
 * Paginated Viewport — Vertical Page Stack
 *
 * Architecture:
 * - Each page is a self-contained fixed-height container
 * - One Tiptap editor per page
 * - Natural vertical flow — no overlay alignment needed
 * - Page backgrounds are the page containers themselves
 * - Navigation scrolls to page containers
 */
function PaginatedViewportInner() {
  const {
    zoom,
    currentPage,
    setCurrentPage,
    setTotalPages,
  } = useDocStore();
  const { totalPages, pageHeightPx, pageGapPx } = usePaginationContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);

  // Sync total pages to store
  useEffect(() => {
    if (totalPages > 0) {
      setTotalPages(totalPages);
    }
  }, [totalPages, setTotalPages]);

  // Handle scroll to track current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isNavigatingRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const pageStride = pageHeightPx + pageGapPx;
    const pageIndex = Math.floor(scrollTop / pageStride) + 1;
    const clampedPage = Math.max(1, Math.min(pageIndex, totalPages));

    if (clampedPage !== currentPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, pageHeightPx, pageGapPx, totalPages, setCurrentPage]);

  // Scroll to current page when it changes via navigation controls
  useEffect(() => {
    if (!containerRef.current) return;

    const pageStride = pageHeightPx + pageGapPx;
    const targetScroll = (currentPage - 1) * pageStride;
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
  }, [currentPage, pageHeightPx, pageGapPx]);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    []
  );

  // Handle PgUp/PgDn to move caret between pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'PageDown' && e.key !== 'PageUp') return;

      const focused = document.activeElement;
      if (!focused?.classList.contains('tiptap')) return;

      // Find current page index
      const wrapper = focused.closest('[data-page-editor]');
      const currentIdx = wrapper
        ? parseInt(wrapper.getAttribute('data-page-editor') || '0', 10)
        : 0;

      let targetIdx: number;
      if (e.key === 'PageDown') {
        targetIdx = currentIdx + 1;
      } else {
        targetIdx = currentIdx - 1;
      }

      // Bounds check
      if (targetIdx < 0 || targetIdx >= totalPages) return;

      e.preventDefault();
      e.stopPropagation();

      // Focus target page
      setTimeout(() => {
        const targetEditor = document.querySelector<HTMLElement>(
          `[data-page-editor="${targetIdx}"] .tiptap`
        );
        if (targetEditor) {
          const editor = (targetEditor as any)?.editor;
          if (editor) {
            editor.commands.focus();
            if (e.key === 'PageDown') {
              editor.commands.setTextSelection(1); // Start of page
            } else {
              editor.commands.selectTextblockEnd(); // End of page
            }
          }
        }
      }, 10);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown, true); // Capture phase
      return () => container.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [totalPages]);

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
          <MultiPageEditor />
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
