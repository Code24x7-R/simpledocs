// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

export default function TemplateFieldView({ node }: NodeViewProps) {
  const { fieldName } = node.attrs;

  return (
    <NodeViewWrapper className="template-field" data-type="template-field">
      <span className="template-field">{`{{${fieldName}}}`}</span>
    </NodeViewWrapper>
  );
}
