import { NodeViewWrapper } from '@tiptap/react';

export default function PageBreakView() {
  return (
    <NodeViewWrapper>
      <div className="page-break" data-type="page-break">
        <span className="text-xs text-gray-400 select-none">
          ── Page Break ──
        </span>
      </div>
    </NodeViewWrapper>
  );
}
