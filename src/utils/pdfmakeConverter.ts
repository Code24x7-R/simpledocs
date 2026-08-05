// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * TipTap JSON → pdfmake document converter.
 *
 * Recursively walks a TipTap JSON content tree and produces a pdfmake
 * document definition. All text is preserved as real text (not images),
 * so the resulting PDF is fully searchable and selectable.
 */

export interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/** Pixel-to-mm conversion at 96 DPI (screen resolution). */
export const PX_TO_MM = 25.4 / 96;

export interface PdfText {
  text?: string | PdfText[];
  fontSize?: number;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  background?: string;
  font?: string;
  decoration?: string;
  decorationColor?: string;
  link?: string;
  style?: string;
  image?: string;
  width?: number;
  height?: number;
}

/**
 * Calculate display dimensions matching the TipTap editor's CSS behavior.
 * See calculateDisplayDimensions below for full documentation.
 */
export function calculateDisplayDimensions(
  naturalWidthPx: number,
  naturalHeightPx: number,
  maxWidthMm: number,
  maxHeightMm: number
): { width: number; height: number } {
  if (naturalWidthPx <= 0 || naturalHeightPx <= 0) {
    return { width: Math.min(800 * PX_TO_MM, maxWidthMm), height: Math.min(400 * PX_TO_MM, maxHeightMm) };
  }

  // Convert natural pixel dimensions to mm (how the browser displays them)
  let width = naturalWidthPx * PX_TO_MM;
  let height = naturalHeightPx * PX_TO_MM;

  // Apply max-width: 100% — only scale DOWN, never up
  if (width > maxWidthMm) {
    height = height * (maxWidthMm / width);
    width = maxWidthMm;
  }

  // Apply max-height constraint — only scale DOWN, never up
  if (height > maxHeightMm) {
    width = width * (maxHeightMm / height);
    height = maxHeightMm;
  }

  return { width: Math.round(width * 100) / 100, height: Math.round(height * 100) / 100 };
}

export interface PdfBlock {
  text?: string | PdfText[] | Array<{ text: PdfText[] }>;
  table?: {
    body: unknown[][];
    widths?: (number | string)[];
  };
  image?: string;
  ul?: unknown[];
  ol?: unknown[];
  style?: string;
  margin?: [number, number, number, number];
  pageBreak?: string;
  canvas?: unknown[];
  [key: string]: unknown;
}

export interface PdfDocument {
  content: unknown[];
  styles?: Record<string, unknown>;
  pageOrientation?: string;
  pageSize?: string;
  pageMargins?: [number, number, number, number];
  header?: unknown;
  footer?: (currentPage: number, pageCount: number) => unknown;
  defaultStyle?: {
    font?: string;
  };
}

const FONT_SIZE = {
  h1: 24,
  h2: 20,
  h3: 16,
} as const;

const MM_PER_INCH = 25.4;

// Module-level variable holding the current content area (available width/height in mm).
// Set at the start of convertToPdfmake so image nodes can constrain themselves.
let currentContentArea: { width: number; height: number } = { width: 160, height: 250 };

// Map of image src → natural dimensions (in pixels), loaded before PDF generation.
// Used to calculate accurate scaling that fits within the content area.
let imageDimensions: Record<string, { width: number; height: number }> = {};

/**
 * Recursively scan a TipTap document for image nodes and collect their src values.
 */
export function collectImageSources(node: TiptapNode, sources: Set<string> = new Set()): Set<string> {
  if (node.type === 'image' && node.attrs?.src) {
    sources.add(String(node.attrs.src));
  }
  if (node.content) {
    for (const child of node.content) {
      collectImageSources(child, sources);
    }
  }
  return sources;
}

/**
 * Set the natural dimensions for images (loaded before PDF generation).
 * Map of image src → { width, height } in pixels.
 */
export function setImageDimensions(dimensions: Record<string, { width: number; height: number }>): void {
  imageDimensions = dimensions;
}

// Standard page dimensions in mm (portrait)
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

/**
 * Calculate the available content area (in mm) after subtracting margins.
 * Accounts for orientation (landscape swaps width/height).
 */
function getContentArea(
  pageFormat: string,
  orientation: string,
  margins: { top: string; bottom: string; left: string; right: string }
): { width: number; height: number } {
  const size = PAGE_SIZES[pageFormat.toUpperCase() as keyof typeof PAGE_SIZES] || PAGE_SIZES.A4;
  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? size.height : size.width;
  const pageHeight = isLandscape ? size.width : size.height;

  const left = toMm(margins.left);
  const right = toMm(margins.right);
  const top = toMm(margins.top);
  const bottom = toMm(margins.bottom);

  return {
    width: Math.max(pageWidth - left - right, 50),
    height: Math.max(pageHeight - top - bottom, 50),
  };
}

export interface PageSetup {
  pageFormat: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  header: {
    enabled: boolean;
    content: string;
  };
  footer: {
    enabled: boolean;
    showPageNumbers: boolean;
  };
  title: string;
}

function toMm(value: string): number {
  const match = value.match(/^([\d.]+)\s*(mm|in)$/i);
  if (!match) return parseFloat(value) || 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  return unit === 'in' ? num * MM_PER_INCH : num;
}

/**
 * Converts hex color (#rgb, #rrggbb) to a pdfmake-compatible color string.
 * pdfmake accepts hex without the # prefix.
 */
function normalizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  // Remove leading #
  if (color.startsWith('#')) return color.slice(1);
  // rgb(r,g,b) → hex
  const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `${r}${g}${b}`;
  }
  return color;
}

/**
 * Applies TipTap marks to a pdfmake text run.
 */
function applyMarks(text: string, marks: TiptapMark[] | undefined): PdfText {
  const run: PdfText = { text };

  if (!marks) return run;

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        run.bold = true;
        break;
      case 'italic':
        run.italics = true;
        break;
      case 'underline':
        run.underline = true;
        break;
      case 'strike':
        run.strike = true;
        break;
      case 'code':
        run.font = 'Courier New';
        run.color = '222222';
        run.background = 'F5F5F5';
        break;
      case 'textStyle': {
        const attrs = mark.attrs || {};
        if (attrs.fontSize) {
          const size = parseFloat(String(attrs.fontSize));
          if (!isNaN(size)) {
            // Editor uses px, pdfmake uses pt. Convert: 1px = 0.75pt (96 DPI → 72 DPI)
            run.fontSize = size * 0.75;
          }
        }
        if (attrs.fontFamily) run.font = String(attrs.fontFamily);
        if (attrs.color) run.color = normalizeColor(String(attrs.color));
        break;
      }
      case 'backgroundColor':
        run.background = normalizeColor(String(mark.attrs?.color));
        break;
      case 'color':
        run.color = normalizeColor(String(mark.attrs?.color));
        break;
      case 'link':
        run.link = String(mark.attrs?.href || '');
        run.color = '1E40AF';
        run.decoration = 'underline';
        break;
      default:
        break;
    }
  }

  return run;
}

/**
 * Converts a single TipTap node to a pdfmake content block.
 */
function convertNode(node: TiptapNode): unknown {
  switch (node.type) {
    case 'paragraph': {
      const content = node.content || [];
      const runs: PdfText[] = [];
      for (const child of content) {
        if (child.type === 'text') {
          runs.push(applyMarks(child.text || '', child.marks));
        } else if (child.type === 'image') {
          // Inline image inside paragraph
          const src = String(child.attrs?.src || '');
          if (src) {
            // Inline image — use same display logic as block images
            const natural = imageDimensions[src];
            const intrinsicWidth = natural && natural.width > 0 ? natural.width : 800;
            const intrinsicHeight = natural && natural.height > 0 ? natural.height : 400;
            const { width, height } = calculateDisplayDimensions(
              intrinsicWidth,
              intrinsicHeight,
              currentContentArea.width,
              currentContentArea.height
            );
            runs.push({ image: src, width, height });
          }
        } else if (child.type === 'templateField') {
          // Inline template field — render as bracketed placeholder
          const label = String(child.attrs?.label || child.attrs?.id || 'Field');
          runs.push({ text: `{{${label}}}`, color: '6B7280', italics: true });
        } else if (child.type === 'hardBreak') {
          runs.push({ text: '\n' });
        }
      }
      // Empty paragraph → empty text for spacing
      if (runs.length === 0) return { text: '', margin: [0, 0, 0, 4] };
      return { text: runs, margin: [0, 0, 0, 4] };
    }

    case 'heading': {
      const level = (node.attrs?.level as number) || 1;
      const content = node.content || [];
      const runs: PdfText[] = [];
      for (const child of content) {
        if (child.type === 'text') {
          runs.push(applyMarks(child.text || '', child.marks));
        }
      }
      const fontSize = FONT_SIZE[`h${level}` as keyof typeof FONT_SIZE] || 16;
      return {
        text: runs,
        fontSize,
        bold: true,
        margin: [0, 8, 0, 4],
      };
    }

    case 'bulletList': {
      const items = node.content || [];
      return {
        ul: items.map((item) => convertListItem(item)),
      };
    }

    case 'orderedList': {
      const items = node.content || [];
      return {
        ol: items.map((item) => convertListItem(item)),
      };
    }

    case 'taskList': {
      const items = node.content || [];
      return {
        ul: items.map((item) => convertTaskItem(item)),
      };
    }

    case 'table': {
      const rows = node.content || [];
      const body: unknown[][] = [];
      for (const row of rows) {
        if (row.type !== 'tableRow') continue;
        const cells = row.content || [];
        const rowContent: unknown[] = [];
        for (const cell of cells) {
          const cellContent = cell.content || [];
          const cellBlocks: unknown[] = [];
          for (const block of cellContent) {
            cellBlocks.push(convertNode(block));
          }
          rowContent.push(cellBlocks.length > 0 ? cellBlocks : '');
        }
        body.push(rowContent);
      }
      return {
        table: { body },
        margin: [0, 4, 0, 8],
      };
    }

    case 'image': {
      const src = String(node.attrs?.src || '');
      const nodeWidth = node.attrs?.width ? Number(node.attrs.width) : undefined;
      const nodeHeight = node.attrs?.height ? Number(node.attrs.height) : undefined;

      // Get the natural dimensions of the image (loaded before PDF generation)
      const natural = imageDimensions[src];
      const naturalWidth = natural && natural.width > 0 ? natural.width : undefined;
      const naturalHeight = natural && natural.height > 0 ? natural.height : undefined;

      // Determine the intrinsic dimensions in pixels — what the browser would
      // render BEFORE CSS max-width: 100% kicks in.
      //
      // Cases (matching how the browser resolves <img width=... height=...>):
      // 1. Both explicit → use both as-is
      // 2. Only width explicit → width as-is, height from natural aspect ratio
      // 3. Only height explicit → height as-is, width from natural aspect ratio
      // 4. Neither explicit → use natural dimensions (or 800x400 default)
      let intrinsicWidth: number;
      let intrinsicHeight: number;

      if (nodeWidth && nodeWidth > 0 && nodeHeight && nodeHeight > 0) {
        // Both explicit
        intrinsicWidth = nodeWidth;
        intrinsicHeight = nodeHeight;
      } else if (nodeWidth && nodeWidth > 0 && naturalWidth && naturalHeight) {
        // Only width explicit — height follows natural aspect ratio
        intrinsicWidth = nodeWidth;
        intrinsicHeight = Math.round(naturalHeight * (nodeWidth / naturalWidth));
      } else if (nodeHeight && nodeHeight > 0 && naturalWidth && naturalHeight) {
        // Only height explicit — width follows natural aspect ratio
        intrinsicHeight = nodeHeight;
        intrinsicWidth = Math.round(naturalWidth * (nodeHeight / naturalHeight));
      } else if (naturalWidth && naturalHeight) {
        // Neither explicit — use natural dimensions
        intrinsicWidth = naturalWidth;
        intrinsicHeight = naturalHeight;
      } else {
        // Fallback default (matches TipTap's default)
        intrinsicWidth = 800;
        intrinsicHeight = 400;
      }

      // Calculate display dimensions matching the editor's CSS behavior:
      // Images render at intrinsic pixel size, with max-width: 100% scaling down
      // only when wider than the container (maintaining aspect ratio).
      const { width, height } = calculateDisplayDimensions(
        intrinsicWidth,
        intrinsicHeight,
        currentContentArea.width,
        currentContentArea.height
      );

      return {
        image: src,
        width,
        height,
        margin: [0, 4, 0, 8],
      };
    }

    case 'blockquote': {
      const content = node.content || [];
      const blocks: PdfBlock[] = [];
      for (const child of content) {
        blocks.push(convertNode(child) as PdfBlock);
      }
      return {
        text: blocks.flatMap((b) => {
          const t = b.text;
          if (!t) return [] as PdfText[];
          if (typeof t === 'string') return [{ text: t }] as PdfText[];
          if (Array.isArray(t) && t.length > 0 && typeof t[0] === 'object' && 'text' in (t[0] as object)) {
            return (t as Array<{ text: PdfText[] }>).flatMap((item) => item.text);
          }
          return t as PdfText[];
        }),
        margin: [12, 4, 0, 8],
        color: '6B7280',
      };
    }

    case 'codeBlock': {
      const content = node.content || [];
      const text = content
        .filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join('');
      return {
        text,
        font: 'Courier',
        background: 'F5F5F5',
        margin: [0, 4, 0, 8],
      };
    }

    case 'horizontalRule':
      return {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 190,
            y2: 0,
            lineWidth: 1,
            lineColor: 'CCCCCC',
          },
        ],
        margin: [0, 8, 0, 8],
      };

    case 'pageBreak':
      return { pageBreak: 'after', text: '' };

    case 'templateField': {
      const label = String(node.attrs?.label || node.attrs?.id || 'Field');
      return { text: `{{${label}}}`, color: '6B7280', italics: true };
    }

    case 'text':
      return applyMarks(node.text || '', node.marks);

    case 'hardBreak':
      return { text: '\n' };

    default: {
      // Fallback: recurse into content
      const content = node.content || [];
      if (content.length > 0) {
        return content.map((child) => convertNode(child));
      }
      return { text: '' };
    }
  }
}

/**
 * Converts a list item (bullet/ordered) to pdfmake format.
 */
function convertListItem(node: TiptapNode): unknown {
  if (node.type !== 'listItem') return '';
  const content = node.content || [];
  const blocks: unknown[] = [];
  for (const child of content) {
    if (child.type === 'paragraph') {
      const paraContent = child.content || [];
      const runs: PdfText[] = [];
      for (const c of paraContent) {
        if (c.type === 'text') {
          runs.push(applyMarks(c.text || '', c.marks));
        } else if (c.type === 'templateField') {
          const label = String(c.attrs?.label || c.attrs?.id || 'Field');
          runs.push({ text: `{{${label}}}`, color: '6B7280', italics: true });
        }
      }
      if (runs.length > 0) blocks.push(runs);
    } else if (child.type === 'bulletList' || child.type === 'orderedList') {
      // Nested list
      const nested = child.content || [];
      const listType = child.type === 'bulletList' ? 'ul' : 'ol';
      blocks.push({
        [listType]: nested.map((item) => convertListItem(item)),
      });
    } else {
      blocks.push(convertNode(child));
    }
  }
  return blocks.length === 1 ? blocks[0] : blocks;
}

/**
 * Converts a task item to pdfmake format with checkbox symbols.
 */
function convertTaskItem(node: TiptapNode): unknown {
  if (node.type !== 'taskItem') return '';
  const checked = node.attrs?.checked === true;
  const content = node.content || [];
  const blocks: unknown[] = [];
  for (const child of content) {
    if (child.type === 'paragraph') {
      const paraContent = child.content || [];
      const runs: PdfText[] = [];
      for (const c of paraContent) {
        if (c.type === 'text') {
          runs.push(applyMarks(c.text || '', c.marks));
        }
      }
      const checkbox = checked ? '☑' : '☐';
      runs.unshift({ text: `${checkbox} ` });
      if (runs.length > 0) blocks.push(runs);
    } else {
      blocks.push(convertNode(child));
    }
  }
  return blocks.length === 1 ? blocks[0] : blocks;
}

/**
 * Main entry point: converts a TipTap JSON document to a pdfmake document definition.
 */
export function convertToPdfmake(
  content: TiptapNode,
  pageSetup: PageSetup
): PdfDocument {
  const doc: PdfDocument = {
    content: [],
    pageOrientation: pageSetup.orientation,
    // Use Arial as default — it's always embedded (Roboto is not bundled
    // to keep the font file small).
    defaultStyle: { font: 'Arial' },
  };

  // Page size
  doc.pageSize = pageSetup.pageFormat.toUpperCase();

  // Margins: [left, top, right, bottom] in mm
  doc.pageMargins = [
    toMm(pageSetup.margins.left),
    toMm(pageSetup.margins.top),
    toMm(pageSetup.margins.right),
    toMm(pageSetup.margins.bottom),
  ];

  // Calculate available content area for image constraining
  currentContentArea = getContentArea(
    pageSetup.pageFormat,
    pageSetup.orientation,
    pageSetup.margins
  );

  // Convert content nodes
  if (content.content) {
    for (const node of content.content) {
      doc.content.push(convertNode(node));
    }
  }

  // Header
  if (pageSetup.header.enabled && pageSetup.header.content) {
    doc.header = () => ({
      text: pageSetup.header.content.replace('{title}', pageSetup.title),
      alignment: 'center',
      margin: [0, 10, 0, 0],
      fontSize: 9,
      color: '666666',
    });
  }

  // Footer
  if (pageSetup.footer.enabled) {
    doc.footer = (currentPage: number, pageCount: number) => {
      const parts: string[] = [];
      if (pageSetup.footer.showPageNumbers) {
        parts.push(`Page ${currentPage} of ${pageCount}`);
      }
      return {
        text: parts.join(' | '),
        alignment: 'center',
        margin: [0, 0, 0, 10],
        fontSize: 9,
        color: '666666',
      };
    };
  }

  return doc;
}
