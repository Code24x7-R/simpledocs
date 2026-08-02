import { useRef, useCallback, useEffect, useState } from 'react';
import { useDocStore } from '../../store/useDocStore';
import DocumentEditor from './DocumentEditor';
import PageCanvas from './PageCanvas';
import { calculateAvailableHeight } from '../../utils/pageOverflow';
import { mmToPx } from '../../utils/unitConversion';

/**
 * Paginated Viewport - Microsoft Word/Google Docs Model
 *
 * Architecture:
 * - Single Tiptap editor holds ALL content (one continuous document)
 * - Page 1 renders the live editor
 * - Pages 2+ render read-only HTML extracted from the editor
 * - Clicking on pages 2+ scrolls the editor to that position
 * - Content reflows naturally when typing/pasting
 * - Cursor position is preserved after paste
 */
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

  // Calculate page count and extract content for pages 2+
  useEffect(() => {
    if (!editor) return;

    const updatePages = () => {
      const editorEl = document.querySelector('.tiptap') as HTMLElement;
      if (!editorEl) return;

      const contentHeight = editorEl.scrollHeight;
      const pages = Math.max(1, Math.ceil(contentHeight / availableHeight));
      setPageCount(pages);

      // Extract content for pages 2+
      if (pages > 1) {
        const blocks = Array.from(
          editorEl.querySelectorAll(
            'p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, pre, table'
          )
        ) as HTMLElement[];

        const pageBlocks: HTMLElement[][] = [[]];
        let currentPage = 0;

        for (const block of blocks) {
          const blockTop = block.offsetTop;
          const blockPage = Math.floor(blockTop / availableHeight);

          while (currentPage < blockPage) {
            pageBlocks.push([]);
            currentPage++;
          }

          pageBlocks[currentPage] = pageBlocks[currentPage] || [];
          pageBlocks[currentPage].push(block);
        }

        // Convert blocks to HTML for pages 2+
        const contents: string[] = [];
        for (let i = 1; i < pageBlocks.length; i++) {
          const wrapper = document.createElement('div');
          pageBlocks[i].forEach((block) => {
            wrapper.appendChild(block.cloneNode(true));
          });
          contents.push(wrapper.innerHTML);
        }
        setPageContents(contents);
      } else {
        setPageContents([]);
      }
    };

    const timeout = setTimeout(updatePages, 150);
    return () => clearTimeout(timeout);
  }, [editor, editor?.getHTML, availableHeight]);

  // Handle click on pages 2+ to scroll editor to that position
  const handlePageClick = useCallback(
    (pageIndex: number) => {
      if (!editor) return;

      const editorContainer = document.getElementById('editor-scroll-container');
      if (!editorContainer) return;

      const scrollTarget = pageIndex * availableHeight;
      editorContainer.scrollTop = scrollTarget;

      // Focus the editor and set cursor to approximate position
      editor.commands.focus();

      // Find the text position at this scroll offset
      const pos = findTextPositionAtOffset(editor, scrollTarget);
      if (pos >= 0) {
        editor.commands.setTextSelection(pos);
      }
    },
    [editor, availableHeight]
  );

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
        {/* Render stacked page canvases */}
        {Array.from({ length: Math.max(pageCount, 1) }).map((_, index) => (
          <div
            key={index}
            className="py-6"
            onClick={() => index > 0 && handlePageClick(index)}
            style={{ cursor: index > 0 ? 'text' : 'default' }}
          >
            <PageCanvas
              pageNumber={index + 1}
              totalPages={pageCount}
              isFirstPage={index === 0}
            >
              {index === 0 ? (
                <DocumentEditor />
              ) : pageContents[index - 1] ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: pageContents[index - 1] }}
                />
              ) : (
                <div className="text-gray-400 text-sm">Page {index + 1}</div>
              )}
            </PageCanvas>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Find the text position in the editor at a given scroll offset.
 */
function findTextPositionAtOffset(editor: any, scrollOffset: number): number {
  try {
    const doc = editor.state.doc;
    let foundPos = 0;

    doc.descendants((_node: any, pos: number) => {
      try {
        const dom = editor.view.nodeDOM(pos);
        if (dom instanceof HTMLElement) {
          if (dom.offsetTop >= scrollOffset) {
            return false;
          }
          foundPos = pos + 1;
        }
      } catch {
        // Ignore errors
      }
      return true;
    });

    return foundPos;
  } catch {
    return 0;
  }
}
