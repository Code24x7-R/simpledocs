// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Document sanitization — walks a Tiptap JSON document tree and cleans
 * attributes that could be used for injection attacks.
 *
 * Called at document load time (migrateToContent) to ensure externally
 * sourced documents cannot inject malicious CSS or execute scripts.
 */
import {
  sanitizeUrl,
  sanitizeImageSrc,
  sanitizeLineHeight,
  sanitizeFontSize,
  sanitizePixelValue,
  sanitizeColor,
} from './sanitize';

/** A Tiptap JSON node */
interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
  [key: string]: unknown;
}

/**
 * Sanitize a Tiptap document tree. Mutates in place for efficiency.
 * Accepts a loosely-typed record (from DocState.content) and casts
 * internally.
 */
export function sanitizeDocument(doc: Record<string, unknown>): Record<string, unknown> {
  return sanitizeDocumentNode(doc as unknown as TiptapNode) as unknown as Record<string, unknown>;
}

/**
 * Sanitize a Tiptap document tree. Mutates in place for efficiency.
 */
function sanitizeDocumentNode(doc: TiptapNode): TiptapNode {
  if (!doc || typeof doc !== 'object') return doc;

  // Process this node's attributes
  if (doc.attrs) {
    sanitizeNodeAttrs(doc);
  }

  // Process marks
  if (Array.isArray(doc.marks)) {
    for (const mark of doc.marks) {
      if (mark.attrs) {
        sanitizeMarkAttrs(mark);
      }
    }
  }

  // Recurse into children
  if (Array.isArray(doc.content)) {
    for (const child of doc.content) {
      sanitizeDocumentNode(child);
    }
  }

  return doc;
}

/** Sanitize attributes based on node type */
function sanitizeNodeAttrs(node: TiptapNode): void {
  const attrs = node.attrs!;
  const type = node.type;

  // Link href
  if (attrs.href) {
    attrs.href = sanitizeUrl(attrs.href as string);
  }

  // Image src
  if (type === 'image' && attrs.src) {
    attrs.src = sanitizeImageSrc(attrs.src as string);
  }

  // ParagraphStyle attributes (paragraph and heading)
  if (type === 'paragraph' || type === 'heading') {
    if (attrs.lineHeight !== undefined) {
      attrs.lineHeight = sanitizeLineHeight(attrs.lineHeight);
    }
    if (attrs.indent !== undefined) {
      attrs.indent = sanitizePixelValue(attrs.indent);
    }
    if (attrs.paragraphSpacing !== undefined && attrs.paragraphSpacing !== null) {
      const ps = attrs.paragraphSpacing as { before?: unknown; after?: unknown };
      if (typeof ps === 'object') {
        attrs.paragraphSpacing = {
          before: sanitizePixelValue(ps.before),
          after: sanitizePixelValue(ps.after),
        };
      } else {
        attrs.paragraphSpacing = null;
      }
    }
  }
}

/** Sanitize attributes based on mark type */
function sanitizeMarkAttrs(mark: { type: string; attrs?: Record<string, unknown> }): void {
  const attrs = mark.attrs!;

  // Link mark href
  if (mark.type === 'link' && attrs.href) {
    attrs.href = sanitizeUrl(attrs.href as string);
  }

  // textStyle mark: color, fontFamily, fontSize, backgroundColor
  if (mark.type === 'textStyle') {
    if (attrs.color) {
      attrs.color = sanitizeColor(attrs.color);
    }
    if (attrs.backgroundColor) {
      attrs.backgroundColor = sanitizeColor(attrs.backgroundColor);
    }
    if (attrs.fontSize) {
      attrs.fontSize = sanitizeFontSize(attrs.fontSize);
    }
    // fontFamily: allow any string but strip dangerous characters
    if (attrs.fontFamily && typeof attrs.fontFamily === 'string') {
      // Remove characters that could be used for CSS injection
      attrs.fontFamily = attrs.fontFamily.replace(/[<>'"\\;(){}]/g, '');
    }
  }
}
