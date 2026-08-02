import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageCanvas from './PageCanvas';

export default function PaginatedViewport() {
  const { zoom } = useDocStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // For now, render a single virtualized page that contains the full editor
  // TODO: Implement actual content splitting into pages based on overflow
  const pageCount = 1;

  const virtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 1123, // A4 height in px at 96 DPI
    overscan: 2,
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
              </PageCanvas>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
