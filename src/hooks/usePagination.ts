// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * usePagination hook — provides page layout data to the editor.
 *
 * Calculates the usable height per page from the DocumentLayoutEngine
 * and provides page context for rendering. Individual page break views
 * calculate their own spacer heights based on their DOM position.
 */

import { useMemo } from 'react';
import { useDocStore } from '../store/useDocStore';
import { buildPageGeometry, buildTypographyDefaults, tiptapToAST } from '../utils/pagination';
import { DocumentLayoutEngine } from '../utils/DocumentLayoutEngine';

export interface PaginationContext {
  /** Usable content height per page in pixels */
  usableHeightPx: number;
  /** Total pages calculated for current content */
  totalPages: number;
  /** Content width in pixels */
  contentWidthPx: number;
}

/**
 * Measure text width using a hidden canvas context.
 */
function createMeasureText(): (
  text: string,
  style: { fontFamily: string; fontSize: number }
) => number {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  try {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  } catch {
    // Canvas unavailable
  }

  return (text, style) => {
    if (ctx) {
      ctx.font = `${style.fontSize}pt ${style.fontFamily}`;
      return ctx.measureText(text).width / 0.75; // px → pt
    }
    return text.length * (style.fontSize * 0.5);
  };
}

let measureTextFn: ReturnType<typeof createMeasureText> | null = null;

function getMeasureText() {
  if (!measureTextFn) {
    measureTextFn = createMeasureText();
  }
  return measureTextFn;
}

/**
 * Hook that provides pagination context derived from current document state.
 * The engine runs on each render (cheap for typical document sizes) to
 * provide accurate page geometry.
 */
export function usePagination(): PaginationContext {
  const { docState } = useDocStore();

  return useMemo(() => {
    const geometry = buildPageGeometry(docState.settings);
    const typography = buildTypographyDefaults();
    const ast = tiptapToAST(docState.content);

    const engine = new DocumentLayoutEngine({
      pageGeometry: geometry,
      typographyDefaults: typography,
      documentAST: ast,
      measureText: getMeasureText(),
    });

    const pages = engine.paginate();
    const usableHeightPt = engine.getUsableHeight();
    const contentWidthPt = engine.getContentWidth();

    // Convert pt to px (1pt = 1.333px at 96dpi)
    const usableHeightPx = usableHeightPt * 1.333;
    const contentWidthPx = contentWidthPt * 1.333;

    return {
      usableHeightPx,
      totalPages: pages.length,
      contentWidthPx,
    };
  }, [docState.content, docState.settings]);
}
