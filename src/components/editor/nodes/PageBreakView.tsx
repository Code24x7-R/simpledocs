// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

/**
 * PageBreakView — Visual page break indicator.
 *
 * In the true paginated model, pages are implicit (fixed-height containers).
 * This renders as a simple horizontal divider. It does NOT reserve vertical
 * space or affect pagination — content flows automatically based on overflow.
 */
export default function PageBreakView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper
      className="page-break-wrapper"
      data-type="page-break"
      data-node-index={node.attrs.nodeIndex}
    >
      <div className="flex items-center gap-2 py-2 pointer-events-none">
        <div className="flex-1 border-t border-dashed border-gray-300" />
        <span className="text-[10px] text-gray-400 select-none whitespace-nowrap">
          Page Break
        </span>
        <div className="flex-1 border-t border-dashed border-gray-300" />
      </div>
    </NodeViewWrapper>
  );
}
