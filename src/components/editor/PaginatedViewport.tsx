import { useRef, useCallback, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageCanvas from './PageCanvas';
import { calculateAvailableHeight } from '../../utils/pageOverflow';
import { splitHtmlAtPageBreaks } from '../../utils/autoPageBreak';
import { mmToPx } from '../../utils/unitConversion';

export default function PaginatedViewport() {
  const { docState, zoom, editor } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageContents, setPageContents] = useState<string[]>([]);

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

  // Count pages based on content
  useEffect(() => {
    if (!editor) return;

    const updatePageCount = () => {
      const editorEl = document.querySelector('.tiptap') as HTMLElement;
      if (!editorEl) return;

      const contentHeight = editorEl.scrollHeight;
      const pageBreaks = editorEl.querySelectorAll('[data-type="page-break"]');
      const totalPages = pageBreaks.length + 1;

      // Also check if overflow exists without page breaks
      if (totalPages === 1 && contentHeight > availableHeight) {
        // Content overflows but no page breaks yet - let auto-insert handle it
        // For now, just show 1 page
        setPageCount(1);
        setPageContents([]);
      } else {
        setPageCount(totalPages);

        // Split content at page breaks
        if (totalPages > 1) {
          const html = editorEl.innerHTML;
          const parts = splitHtmlAtPageBreaks(html);
          setPageContents(parts);
        } else {
          setPageContents([]);
        }
      }
    };

    // Delay to let editor render
    const timeout = setTimeout(updatePageCount, 200);
    return () => clearTimeout(timeout);
  }, [editor, editor?.getJSON(), availableHeight]);

  const virtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => heightPx,
    overscan: 1,
  });

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    []
  );

  return (
    <div
      ref={handleRef}
      className="flex-1 overflow-y-auto bg-canvas"
      id="paginated-viewport"
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          minWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="py-6"
            >
              <PageCanvas pageNumber={virtualRow.index + 1} totalPages={pageCount}>
                {virtualRow.index === 0 ? (
                  <DocumentEditor />
                ) : pageContents[virtualRow.index] ? (
                  <div
                    className="page-content-readonly"
                    dangerouslySetInnerHTML={{ __html: pageContents[virtualRow.index] }}
                  />
                ) : (
                  <div className="text-center text-gray-400 text-sm py-4">
                    Page {virtualRow.index + 1}
                  </div>
                )}
              </PageCanvas>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
