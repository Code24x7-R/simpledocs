// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useCallback, useRef, useEffect } from 'react';
import { useDocStore } from '../../store/useDocStore';
import PageEditor from './PageEditor';
import { usePaginationContext } from './PaginationContext';
import { redistributeOverflow, pullFromNextPage } from '../../utils/pageOverflow';

/**
 * Compute the ProseMirror content size of a Tiptap JSON document.
 * Used to calculate the cursor position at the join point after merging pages.
 */
function computeDocSize(json: Record<string, unknown>): number {
  function nodeSize(node: any): number {
    if (!node) return 0;
    if (node.type === 'text') {
      return (node.text as string)?.length ?? 0;
    }
    const content = (node.content as any[]) ?? [];
    let contentSize = 0;
    for (const child of content) {
      contentSize += nodeSize(child);
    }
    return contentSize + 2;
  }
  const content = (json.content as any[]) ?? [];
  let size = 0;
  for (const child of content) {
    size += nodeSize(child);
  }
  return size;
}

/**
 * Multi-Page Editor — renders one Tiptap editor per page.
 *
 * Each page is a self-contained editor with a fixed-height container.
 * Overflow redistribution: when a page's content exceeds the usable height,
 * excess blocks are moved to the next page. When content is deleted and space
 * becomes available, content from the next page is pulled back.
 *
 * Page management:
 * - Empty pages (except the first) are automatically removed
 * - Backspace at the start of a page merges it with the previous page
 * - Ctrl+A + delete collapses the document back to a single page
 */
export default function MultiPageEditor() {
  const { docState, updatePageContent } = useDocStore();
  const {
    usableHeightPx,
    marginTopPx,
    headerHeightPx,
    footerHeightPx,
    lineHeightPx,
    pageHeightPx,
    pageGapPx,
    pageWidthPx,
    marginLeftPx,
    marginRightPx,
  } = usePaginationContext();

  const overflowHandledRef = useRef<Set<number>>(new Set());
  const editorInstancesRef = useRef<Map<number, any>>(new Map());
  const mergeCursorRef = useRef<number | null>(null);

  const handleChange = useCallback(
    (pageIndex: number, content: Record<string, unknown>) => {
      updatePageContent(pageIndex, content);
      checkAndRemoveEmptyPages();
    },
    [updatePageContent]
  );

  // Auto-focus the first editor on mount so caret is immediately active
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstEditor = document.querySelector<HTMLElement>(
        '[data-page-editor="0"] .tiptap'
      );
      if (firstEditor) {
        firstEditor.focus();
      }
    }, 200); // Small delay to ensure editors are mounted
    return () => clearTimeout(timer);
  }, []);

  // Check for and remove empty pages (except the first)
  const checkAndRemoveEmptyPages = useCallback(() => {
    const { docState, loadDocument } = useDocStore.getState();
    const pages = docState.pages;

    // Find empty pages (no content or only empty paragraph)
    const emptyIndices: number[] = [];
    pages.forEach((page, index) => {
      if (index === 0) return; // Never remove the first page
      const blocks = (page.content as any).content as any[] | undefined;
      if (!blocks || blocks.length === 0) {
        emptyIndices.push(index);
      } else if (
        blocks.length === 1 &&
        blocks[0].type === 'paragraph' &&
        (!blocks[0].content || blocks[0].content.length === 0)
      ) {
        emptyIndices.push(index);
      }
    });

    if (emptyIndices.length > 0) {
      const newPages = pages.filter((_, i) => !emptyIndices.includes(i));
      const updated = {
        ...docState,
        pages: newPages,
        updatedAt: new Date().toISOString(),
      };
      loadDocument(updated);
    }
  }, []);

  const handleOverflow = useCallback(
    (pageIndex: number, cursorAtEnd: boolean) => {
      // Prevent infinite loops: only handle overflow once per page per render cycle
      if (overflowHandledRef.current.has(pageIndex)) return;
      overflowHandledRef.current.add(pageIndex);

      const { docState, loadDocument } = useDocStore.getState();
      const result = redistributeOverflow(
        docState.pages,
        pageIndex,
        usableHeightPx,
        lineHeightPx
      );

      if (result) {
        const updated = {
          ...docState,
          pages: result,
          updatedAt: new Date().toISOString(),
        };
        loadDocument(updated);

        // If cursor was at the end, move it to the start of the next page
        if (cursorAtEnd) {
          setTimeout(() => {
            const nextEditorEl = document.querySelector<HTMLElement>(
              `[data-page-editor="${pageIndex + 1}"] .tiptap`
            );
            if (nextEditorEl) {
              const editorInstance = (nextEditorEl as any)?.editor;
              if (editorInstance) {
                editorInstance.commands.focus();
                editorInstance.commands.setTextSelection(1);
              }
            }
          }, 50);
        }
      }

      // Clear the flag after a tick
      setTimeout(() => {
        overflowHandledRef.current.delete(pageIndex);
      }, 100);
    },
    [usableHeightPx, lineHeightPx]
  );

  const handleUnderflow = useCallback(
    (pageIndex: number) => {
      const { docState, loadDocument } = useDocStore.getState();
      const result = pullFromNextPage(
        docState.pages,
        pageIndex,
        usableHeightPx,
        lineHeightPx
      );

      if (result) {
        const updated = {
          ...docState,
          pages: result,
          updatedAt: new Date().toISOString(),
        };
        loadDocument(updated);
      }
    },
    [usableHeightPx, lineHeightPx]
  );

  // Focus the next page at the specified position
  const handleFocusNextPage = useCallback(
    (currentPageIndex: number, cursorAtStart: boolean) => {
      const nextIndex = currentPageIndex + 1;
      const { docState, addPageAfter } = useDocStore.getState();
      const pages = docState.pages;

      // If next page doesn't exist, create one
      if (nextIndex >= pages.length) {
        addPageAfter(currentPageIndex);
      }

      // Focus the next page's editor
      setTimeout(() => {
        const nextEditorEl = document.querySelector<HTMLElement>(
          `[data-page-editor="${nextIndex}"] .tiptap`
        );
        if (nextEditorEl) {
          const editorInstance = (nextEditorEl as any)?.editor;
          if (editorInstance) {
            editorInstance.commands.focus();
            if (cursorAtStart) {
              editorInstance.commands.setTextSelection(1);
            } else {
              editorInstance.commands.selectTextblockEnd();
            }
          }
        }
      }, 50);
    },
    []
  );

  // Focus the end of the previous page
  const handleFocusPrevPage = useCallback(
    (currentPageIndex: number) => {
      const prevIndex = currentPageIndex - 1;
      if (prevIndex < 0) return;

      // Focus the previous page's editor at the end
      setTimeout(() => {
        const prevEditorEl = document.querySelector<HTMLElement>(
          `[data-page-editor="${prevIndex}"] .tiptap`
        );
        if (prevEditorEl) {
          const editorInstance = (prevEditorEl as any)?.editor;
          if (editorInstance) {
            // Use editor API to set cursor to end and focus
            editorInstance.commands.focus();
            editorInstance.commands.selectTextblockEnd();
          }
        }
      }, 50);
    },
    []
  );

  // Merge current page with previous page, then remove current page
  const handleMergeWithPrevPage = useCallback(
    (currentPageIndex: number) => {
      if (currentPageIndex <= 0) return;

      const { docState, loadDocument } = useDocStore.getState();
      const pages = docState.pages;
      const prevPage = pages[currentPageIndex - 1];
      const currentPage = pages[currentPageIndex];

      // Combine content: prev content + current content
      const prevBlocks = (prevPage.content as any).content as any[] || [];
      const currentBlocks = (currentPage.content as any).content as any[] || [];

      // Remove trailing empty paragraph from prev and leading empty paragraph from current
      const cleanedPrevBlocks = [...prevBlocks];
      const cleanedCurrentBlocks = [...currentBlocks];

      // If prev ends with empty paragraph and current starts with content,
      // remove the empty paragraph from prev
      if (
        cleanedPrevBlocks.length > 0 &&
        cleanedPrevBlocks[cleanedPrevBlocks.length - 1].type === 'paragraph' &&
        (!cleanedPrevBlocks[cleanedPrevBlocks.length - 1].content ||
          cleanedPrevBlocks[cleanedPrevBlocks.length - 1].content.length === 0)
      ) {
        cleanedPrevBlocks.pop();
      }

      const mergedBlocks = [...cleanedPrevBlocks, ...cleanedCurrentBlocks];

      const newPages = pages.map((page, index) => {
        if (index === currentPageIndex - 1) {
          return {
            ...page,
            content: {
              type: 'doc',
              content: mergedBlocks.length > 0 ? mergedBlocks : [{ type: 'paragraph' }],
            },
          };
        }
        return page;
      });

      // Remove the current page
      const filteredPages = newPages.filter((_, i) => i !== currentPageIndex);

      // Calculate cursor position for after merge (end of original prev content)
      const endOfPrevContent = computeDocSize({ type: 'doc', content: cleanedPrevBlocks });
      mergeCursorRef.current = endOfPrevContent;

      const updated = {
        ...docState,
        pages: filteredPages.length > 0 ? filteredPages : [docState.pages[0]],
        updatedAt: new Date().toISOString(),
      };
      loadDocument(updated);

      // Directly focus the merged editor after re-render
      setTimeout(() => {
        const targetEditor = document.querySelector<HTMLElement>(
          `[data-page-editor="${currentPageIndex - 1}"] .tiptap`
        );
        if (targetEditor) {
          targetEditor.focus();
        }
      }, 150);
    },
    []
  );

  return (
    <div className="multi-page-editor flex justify-center py-8">
      <div style={{ width: pageWidthPx }} className="space-y-0">
        {docState.pages.map((page, index) => (
          <div
            key={page.id}
            className="page-container"
            data-testid="page-canvas"
            style={{
              width: pageWidthPx,
              height: pageHeightPx,
              marginBottom: pageGapPx,
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Header area */}
            {docState.settings.header.enabled && (
              <div
                className="page-header"
                style={{
                  position: 'absolute',
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

            {/* Page content editor */}
            <PageEditor
              pageIndex={index}
              content={page.content}
              pageHeightPx={pageHeightPx}
              usableHeightPx={usableHeightPx}
              marginTopPx={marginTopPx}
              marginLeftPx={marginLeftPx}
              marginRightPx={marginRightPx}
              headerHeightPx={headerHeightPx}
              footerHeightPx={footerHeightPx}
              lineHeightPx={lineHeightPx}
              onChange={handleChange}
              onOverflow={handleOverflow}
              onUnderflow={handleUnderflow}
              onFocusNextPage={handleFocusNextPage}
              onFocusPrevPage={handleFocusPrevPage}
              onMergeWithPrevPage={handleMergeWithPrevPage}
              onEditorReady={(editorInstance, pageIdx) => {
                editorInstancesRef.current.set(pageIdx, editorInstance);
              }}
              cursorPositionRef={mergeCursorRef}
            />

            {/* Footer area */}
            {docState.settings.footer.enabled && (
              <div
                className="page-footer"
                style={{
                  position: 'absolute',
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
                  <span>{index + 1}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
