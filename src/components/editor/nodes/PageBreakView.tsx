// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

/**
 * PageBreakView — Visual page break indicator.
 *
 * Renders as a horizontal divider. CSS `break-after: page` handles
 * print/PDF pagination. No spacer height calculation needed.
 */
export default function PageBreakView(_props: NodeViewProps) {
  return (
    <NodeViewWrapper
      className="page-break-wrapper"
      data-type="page-break"
      style={{ breakAfter: 'page' }}
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
