// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { NodeViewWrapper } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { useDocStore } from '../../../store/useDocStore';
import { calculatePageGeometry } from '../../../utils/pageGeometry';

/**
 * PageBreakView — Dynamic spacer that pushes content to the next page.
 *
 * Uses the shared page geometry utility to calculate the correct spacer
 * height so that content after the break starts at the top of the next
 * page boundary. The spacer fills from the current position to the next
 * page stride boundary.
 */
export default function PageBreakView() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState<number | null>(null);
  const { docState } = useDocStore();

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const calculateHeight = () => {
      // Get page geometry from settings
      const { pageStridePx } = calculatePageGeometry(docState.settings);

      // offsetTop is relative to the .tiptap container
      const offsetTop = el.offsetTop;

      // Find the next page boundary
      const pageIndex = Math.floor(offsetTop / pageStridePx);
      const nextPageStart = (pageIndex + 1) * pageStridePx;

      // Spacer fills from current position to next page boundary
      let remaining = nextPageStart - offsetTop;

      // If we're within 5px of a boundary, snap to a full page
      if (remaining < 5) {
        remaining = pageStridePx;
      }

      // Clamp to reasonable bounds
      remaining = Math.max(20, Math.min(remaining, pageStridePx));

      setSpacerHeight((prev) =>
        prev !== Math.round(remaining) ? Math.round(remaining) : prev
      );
    };

    // Calculate after mount
    requestAnimationFrame(calculateHeight);

    // Recalculate when document structure changes
    const editorEl = el.closest('.tiptap') as HTMLElement | null;
    if (editorEl) {
      const observer = new MutationObserver(() => {
        requestAnimationFrame(calculateHeight);
      });
      observer.observe(editorEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return () => observer.disconnect();
    }
  }, [docState.settings]);

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
