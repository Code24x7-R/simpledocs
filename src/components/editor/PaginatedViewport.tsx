import { useRef, useCallback, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageCanvas from './PageCanvas';
import { calculateAvailableHeight, doesContentOverflow } from '../../utils/pageOverflow';
import { mmToPx } from '../../utils/unitConversion';

export default function PaginatedViewport() {
  const { docState, zoom, editor } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

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

  // Measure content and calculate pages
  useEffect(() => {
    if (!editor) return;

    const measureContent = () => {
      const editorEl = document.querySelector('.tiptap');
      if (editorEl) {
        const height = editorEl.scrollHeight;
        const overflows = doesContentOverflow(height, availableHeight);
        const pages = overflows ? Math.ceil(height / availableHeight) : 1;
        setPageCount(pages);
      }
    };

    // Measure after editor updates
    const timeout = setTimeout(measureContent, 100);
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
                {virtualRow.index === 0 && <DocumentEditor />}
                {virtualRow.index > 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">
                    Page {virtualRow.index + 1} (auto-continued)
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
