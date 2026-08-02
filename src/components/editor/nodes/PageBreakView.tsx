// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { NodeViewWrapper } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { usePagination } from '../../../hooks/usePagination';

/**
 * PageBreakView — Dynamic spacer that pushes content to the next page.
 *
 * Uses the DocumentLayoutEngine (via usePagination) to get the usable
 * height per page, then calculates its own spacer height based on its
 * DOM position so that content after the break starts at the top of the
 * next page boundary.
 *
 * This follows the standard WYSIWYG pagination pattern: the editor
 * content flows continuously, and page break nodes stretch to fill the
 * remaining space on their current page, creating visual page separation.
 */
export default function PageBreakView() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState<number | null>(null);
  const { usableHeightPx } = usePagination();

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || usableHeightPx <= 0) return;

    // Find the editor content container (.tiptap)
    const editorEl = el.closest('.tiptap') as HTMLElement | null;
    if (!editorEl) return;

    /**
     * Calculate the spacer height:
     * 1. Get this node's offsetTop relative to the editor content
     * 2. Determine position within the current page
     * 3. Fill remaining space to next page boundary
     */
    const calculateHeight = () => {
      const offsetTop = el.offsetTop;
      const positionInPage = offsetTop % usableHeightPx;
      let remaining = usableHeightPx - positionInPage;

      // If we're within 5px of a boundary, snap to a full page
      // (prevents near-zero spacers when break is at/near page edge)
      if (remaining < 5) {
        remaining = usableHeightPx;
      }

      // Clamp to reasonable bounds
      remaining = Math.max(20, Math.min(remaining, usableHeightPx));

      setSpacerHeight((prev) =>
        prev !== Math.round(remaining) ? Math.round(remaining) : prev
      );
    };

    // Calculate after mount (rAF ensures DOM is laid out)
    requestAnimationFrame(calculateHeight);

    // Recalculate when the document structure changes (content added/removed above)
    const observer = new MutationObserver(() => {
      requestAnimationFrame(calculateHeight);
    });

    observer.observe(editorEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [usableHeightPx]);

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className="page-break-wrapper relative"
      style={
        spacerHeight !== null
          ? { height: `${spacerHeight}px`, minHeight: `${spacerHeight}px` }
          : undefined
      }
      data-type="page-break"
    >
      {/* Visual page break indicator at the top of the spacer */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-2 py-1 pointer-events-none">
        <div className="flex-1 border-t border-dashed border-gray-300" />
        <span className="text-[10px] text-gray-400 select-none whitespace-nowrap">
          Page Break
        </span>
        <div className="flex-1 border-t border-dashed border-gray-300" />
      </div>
    </NodeViewWrapper>
  );
}
