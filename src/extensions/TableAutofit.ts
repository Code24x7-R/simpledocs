// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { cellAround, TableMap } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';
import type { CommandProps } from '@tiptap/core';

/**
 * TableAutofit — double-click a column border to autofit that column to its
 * widest text content (+ padding).
 *
 * Drag-to-resize is handled by Tiptap's built-in `columnResizing` plugin
 * (activated via `Table.configure({ resizable: true })`). This extension only
 * adds the missing autofit-on-double-click behavior.
 *
 * Two entry points, one core function:
 *  - `dblclick` DOM handler: has the real ProseMirror view, builds + dispatches
 *    its own transaction directly.
 *  - `autofitColumn` command: receives a shared `tr` from Tiptap's command
 *    system, mutates it in place (Tiptap dispatches after the chain runs).
 */

export const AUTOFIT_PADDING = 16; // px added to measured text width
export const MIN_COLUMN_WIDTH = 40; // px floor when autofitting
const HANDLE_ZONE = 6; // px either side of a border that counts as "on the handle"

// ---------------------------------------------------------------------------
// Phase 42a — Measurement utilities (pure logic)
// ---------------------------------------------------------------------------

/**
 * Measure the rendered width of a text string using a canvas context.
 * Returns 0 for empty/whitespace-only text. Injectable for testing.
 */
export function measureTextWidth(text: string, font: string): number {
  if (!text.trim()) return 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * Measure the widest text content in a column of a table DOM element.
 * Returns the max cell text width + AUTOFIT_PADDING.
 *
 * @param tableDom  - the <table> HTMLElement
 * @param colIndex  - zero-based column index
 * @param measureFn - injectable text measurer (text, font) => px
 */
export function measureColumnContentWidth(
  tableDom: HTMLElement,
  colIndex: number,
  measureFn: (text: string, font: string) => number
): number {
  const rows = tableDom.querySelectorAll(':scope > tbody > tr');
  let maxWidth = 0;

  rows.forEach((row) => {
    const cells = row.querySelectorAll(':scope > td, :scope > th');
    let col = 0;
    for (const cell of Array.from(cells)) {
      const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
      // This cell spans columns [col, col + colspan)
      if (col <= colIndex && colIndex < col + colspan) {
        const font = window.getComputedStyle(cell).font;
        const text = cell.textContent || '';
        const w = measureFn(text, font);
        if (w > maxWidth) maxWidth = w;
        break; // found the cell covering this column
      }
      col += colspan;
    }
  });

  return maxWidth + AUTOFIT_PADDING;
}

// ---------------------------------------------------------------------------
// Phase 42b — Autofit core logic
// ---------------------------------------------------------------------------

/**
 * Autofit a column to its content. Mutates the given transaction to set the
 * `colwidth` attribute on every cell in the column.
 *
 * Shared by both the dblclick handler and the command. The caller is
 * responsible for dispatching the transaction (dblclick dispatches directly;
 * the command lets Tiptap dispatch the shared chain tr).
 *
 * @param props     - object with { state, tr, view }
 * @param colIndex  - zero-based column index to autofit
 * @param measureFn - injectable text measurer
 * @returns true if the transaction was mutated
 */
function autofitColumn(
  props: { state: EditorState; tr: import('@tiptap/pm/state').Transaction; view: EditorView },
  colIndex: number,
  measureFn: (text: string, font: string) => number
): boolean {
  const { state, tr, view } = props;
  const tablePos = findTablePos(state);
  if (tablePos === null) return false;

  const tableNode = state.doc.nodeAt(tablePos);
  if (!tableNode) return false;

  // Find the table DOM element for measurement
  const tableDom = findTableDom(view, tablePos);
  if (!tableDom) return false;

  const contentWidth = measureColumnContentWidth(tableDom, colIndex, measureFn);
  const targetWidth = Math.max(MIN_COLUMN_WIDTH, contentWidth);

  // Mutate the transaction: set colwidth on all cells in the column
  const map = TableMap.get(tableNode);
  let changed = false;

  for (let row = 0; row < map.height; row++) {
    const mapIndex = row * map.width + colIndex;
    // Skip if this is a continuation of a rowspan from above
    if (row > 0 && map.map[mapIndex] === map.map[mapIndex - map.width]) continue;

    const cellPos = map.map[mapIndex];
    const absPos = tablePos + 1 + cellPos;
    const cellNode = state.doc.nodeAt(absPos);
    if (!cellNode) continue;

    const attrs = cellNode.attrs;
    const colspan = attrs.colspan || 1;
    // Which index in the colwidth array applies to this column?
    const colOffset = colIndex - map.colCount(cellPos);
    // Build colwidth array: copy existing or seed with 0s (schema rejects null inside array)
    const existing = attrs.colwidth
      ? attrs.colwidth.slice()
      : Array.from({ length: colspan }, () => 0);
    if (existing[colOffset] === targetWidth) continue;
    existing[colOffset] = targetWidth;

    tr.setNodeMarkup(absPos, null, { ...attrs, colwidth: existing });
    changed = true;
  }

  return changed;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the position of the first table node in the document. */
function findTablePos(state: EditorState): number | null {
  let tablePos: number | null = null;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      tablePos = pos;
      return false; // take the first table
    }
    return true;
  });
  return tablePos;
}

/** Find the DOM element for a table at a given document position. */
function findTableDom(view: EditorView, tablePos: number): HTMLTableElement | null {
  const dom = view.domAtPos(tablePos + 1);
  let node: Node | null = dom.node;
  while (node && node.nodeName !== 'TABLE') {
    node = node.parentNode;
  }
  return node as HTMLTableElement | null;
}

/** Get the column index for a cell DOM element. */
function getColumnIndex(cellDom: HTMLElement): number {
  let col = 0;
  const siblings = cellDom.parentElement?.children;
  if (!siblings) return 0;
  for (const sibling of Array.from(siblings)) {
    if (sibling === cellDom) break;
    col += parseInt((sibling as HTMLElement).getAttribute('colspan') || '1', 10);
  }
  return col;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export const TableAutofit = Extension.create({
  name: 'tableAutofit',

  addCommands() {
    return {
      autofitColumn: (colIndex: number) =>
        (props: CommandProps) =>
          autofitColumn(
            { state: props.state, tr: props.tr, view: props.view },
            colIndex,
            measureTextWidth
          ),
    } as Partial<import('@tiptap/core').RawCommands>;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableAutofit'),
        props: {
          handleDOMEvents: {
            dblclick(view, event) {
              const target = event.target as HTMLElement;
              // Resolve the click position to a cell
              const pos = view.posAtDOM(target, 0);
              const $cell = cellAround(view.state.doc.resolve(pos));
              if (!$cell) return false;

              // Walk up to the actual TD/TH element
              let el: HTMLElement | null = view.domAtPos($cell.pos).node as HTMLElement;
              while (el && el.nodeName !== 'TD' && el.nodeName !== 'TH') {
                el = el.parentElement;
              }
              if (!el) return false;

              const rect = el.getBoundingClientRect();
              const x = event.clientX;

              // Determine which column border (if any) was clicked
              let colIndex: number;
              if (rect.right - x <= HANDLE_ZONE) {
                // Right border → this cell's column
                colIndex = getColumnIndex(el);
              } else if (x - rect.left <= HANDLE_ZONE) {
                // Left border → previous column
                colIndex = getColumnIndex(el) - 1;
                if (colIndex < 0) return false;
              } else {
                return false; // click in cell middle → ignore
              }

              event.preventDefault();
              // Build + dispatch our own transaction (we have the real view here)
              const tr = view.state.tr;
              const changed = autofitColumn(
                { state: view.state, tr, view },
                colIndex,
                measureTextWidth
              );
              if (changed) view.dispatch(tr);
              return changed;
            },
          },
        },
      }),
    ];
  },
});
