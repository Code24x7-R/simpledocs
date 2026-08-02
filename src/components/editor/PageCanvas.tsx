import { useDocStore } from '../../store/useDocStore';
import { mmToPx } from '../../utils/unitConversion';

interface PageCanvasProps {
  pageNumber: number;
  totalPages: number;
  children: React.ReactNode;
  isFirstPage?: boolean;
  onClick?: () => void;
}

export default function PageCanvas({ pageNumber, totalPages, children, onClick }: PageCanvasProps) {
  const { docState } = useDocStore();
  const { settings } = docState;
  const { pageFormat, orientation, margins } = settings;

  const { widthPx, heightPx } = (() => {
    const fmt = pageFormat === 'A4' ? { w: 210, h: 297 } : { w: 215.9, h: 279.4 };
    return orientation === 'landscape'
      ? { widthPx: mmToPx(fmt.h), heightPx: mmToPx(fmt.w) }
      : { widthPx: mmToPx(fmt.w), heightPx: mmToPx(fmt.h) };
  })();

  const marginPx = {
    top: mmToPx(parseFloat(margins.top) || 20),
    bottom: mmToPx(parseFloat(margins.bottom) || 20),
    left: mmToPx(parseFloat(margins.left) || 25),
    right: mmToPx(parseFloat(margins.right) || 25),
  };

  return (
    <div
      className="page-canvas mx-auto relative shrink-0"
      onClick={onClick}
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        paddingTop: `${marginPx.top}px`,
        paddingBottom: `${marginPx.bottom}px`,
        paddingLeft: `${marginPx.left}px`,
        paddingRight: `${marginPx.right}px`,
      }}
      data-page-number={pageNumber}
      data-testid="page-canvas"
    >
      {/* Header */}
      {settings.header.enabled && (
        <div className="absolute top-0 left-0 right-0 text-xs text-gray-500 border-b border-gray-200 pb-1"
          style={{ marginLeft: `${marginPx.left}px`, marginRight: `${marginPx.right}px`, marginTop: `${marginPx.top / 2}px` }}
        >
          {settings.header.content || docState.title}
        </div>
      )}

      {/* Content Area */}
      <div className="h-full overflow-hidden" style={{ height: `calc(100% - ${marginPx.top + marginPx.bottom}px)` }}>
        {children}
      </div>

      {/* Footer */}
      {settings.footer.enabled && settings.footer.showPageNumbers && (
        <div
          className="absolute bottom-0 left-0 right-0 text-xs text-gray-500 text-center border-t border-gray-200 pt-1"
          style={{ marginBottom: `${marginPx.bottom / 2}px` }}
        >
          Page {pageNumber} of {totalPages}
        </div>
      )}
    </div>
  );
}
