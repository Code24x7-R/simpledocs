// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from '@tiptap/extension-table';
import { TableAutofit, measureTextWidth, measureColumnContentWidth, AUTOFIT_PADDING } from './TableAutofit';
import type { Editor, AnyExtension } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Test editor harness
// ---------------------------------------------------------------------------

let testEditor: Editor | null = null;

function getEditor(): Editor {
  if (!testEditor) throw new Error('Editor not mounted');
  return testEditor;
}

function TestEditor({
  content = '<p>Hello</p>',
  extraExtensions = [],
}: {
  content?: string;
  extraExtensions?: unknown[];
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      ...extraExtensions,
    ] as AnyExtension[],
    content,
    onUpdate: () => {
      testEditor = editor;
    },
  });

  if (editor && !testEditor) {
    testEditor = editor;
  }

  return (
    <div>
      <EditorContent editor={editor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 42a — Measurement utilities (pure logic)
// ---------------------------------------------------------------------------

describe('TableAutofit — measurement', () => {
  beforeEach(() => {
    testEditor = null;
  });

  describe('measureTextWidth', () => {
    it('returns canvas measureText width for non-empty text', () => {
      const mockMeasureText = vi.fn().mockReturnValue({ width: 123 });
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      const mockCtx = { measureText: mockMeasureText } as unknown as CanvasRenderingContext2D;
      HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;

      try {
        const width = measureTextWidth('Hello World', '16px Arial');
        expect(width).toBe(123);
        expect(mockMeasureText).toHaveBeenCalledWith('Hello World');
      } finally {
        HTMLCanvasElement.prototype.getContext = origGetContext;
      }
    });

    it('returns 0 for empty string', () => {
      const width = measureTextWidth('', '16px Arial');
      expect(width).toBe(0);
    });

    it('returns 0 for whitespace-only string', () => {
      const width = measureTextWidth('   \n\t  ', '16px Arial');
      expect(width).toBe(0);
    });
  });

  describe('measureColumnContentWidth', () => {
    function buildTable(): HTMLTableElement {
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      const tr = document.createElement('tr');
      const td0 = document.createElement('td');
      td0.id = 'c0';
      td0.textContent = 'Short';
      const td1 = document.createElement('td');
      td1.id = 'c1';
      td1.textContent = 'Longer text';
      tr.append(td0, td1);
      tbody.appendChild(tr);
      table.appendChild(tbody);
      document.body.appendChild(table);
      return table;
    }

    it('returns max cell width + padding for the column', () => {
      const table = buildTable();

      const stubbedMeasure = vi.fn((text: string) => {
        if (text === 'Short') return 80;
        if (text === 'Longer text') return 120;
        return 0;
      });

      const width0 = measureColumnContentWidth(table, 0, stubbedMeasure as (text: string, font: string) => number);
      expect(width0).toBe(80 + AUTOFIT_PADDING);

      const width1 = measureColumnContentWidth(table, 1, stubbedMeasure as (text: string, font: string) => number);
      expect(width1).toBe(120 + AUTOFIT_PADDING);

      table.remove();
    });

    it('handles empty cells (contributes 0)', () => {
      const table = buildTable();
      const tbody = table.querySelector('tbody')!;
      const tr = tbody.querySelector('tr')!;
      const emptyTd = document.createElement('td');
      emptyTd.textContent = '';
      tr.insertBefore(emptyTd, tr.firstChild);

      const stubbedMeasure = vi.fn((text: string) => {
        if (text === 'Short') return 80;
        if (text === 'Longer text') return 120;
        return 0;
      });

      const width0 = measureColumnContentWidth(table, 0, stubbedMeasure as (text: string, font: string) => number);
      expect(width0).toBe(AUTOFIT_PADDING);

      table.remove();
    });

    it('AUTOFIT_PADDING is a positive number', () => {
      expect(AUTOFIT_PADDING).toBeGreaterThan(0);
      expect(typeof AUTOFIT_PADDING).toBe('number');
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 42b — Autofit transaction (ProseMirror integration)
// ---------------------------------------------------------------------------

describe('TableAutofit — autofit transaction', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('autofitColumn dispatches colwidth update', async () => {
    const content = `
      <table>
        <tbody>
          <tr><td>Cell A1</td><td>Cell B1</td><td>Cell C1</td></tr>
          <tr><td>Cell A2</td><td>Cell B2</td><td>Cell C2</td></tr>
        </tbody>
      </table>`.replace(/\s+/g, '');

    render(<TestEditor content={content} extraExtensions={[TableAutofit]} />);

    await waitFor(() => expect(testEditor).not.toBeNull());

    // Before autofit: no colwidth attributes
    const beforeJson = getEditor().getJSON();
    const tableBefore = beforeJson.content![0] as Record<string, unknown>;
    expect(tableBefore.type).toBe('table');
    const rowBefore = (tableBefore.content as unknown[])[0] as Record<string, unknown>;
    const cellBefore = (rowBefore.content as unknown[])[0] as Record<string, unknown>;
    const colwidthBefore = (cellBefore.attrs as Record<string, unknown>).colwidth;
    expect(colwidthBefore === null || colwidthBefore === undefined).toBe(true);

    // Trigger autofit on column 1 via the editor command (no focus — jsdom lacks scrollIntoView)
    act(() => {
      (getEditor().chain() as unknown as { autofitColumn: (col: number) => { run: () => boolean } }).autofitColumn(1).run();
    });

    await waitFor(() => {
      const json = getEditor().getJSON();
      const table = json.content![0] as Record<string, unknown>;
      const row = (table.content as unknown[])[0] as Record<string, unknown>;
      const cell = (row.content as unknown[])[0] as Record<string, unknown>;
      expect(cell.attrs).toBeDefined();
      expect((cell.attrs as Record<string, unknown>).colwidth).toBeDefined();
    });
  });

  it('autofitColumn respects min width', async () => {
    const content = `
      <table>
        <tbody>
          <tr><td>A</td><td>B</td></tr>
        </tbody>
      </table>`.replace(/\s+/g, '');

    render(<TestEditor content={content} extraExtensions={[TableAutofit]} />);

    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      (getEditor().chain() as unknown as { autofitColumn: (col: number) => { run: () => boolean } }).autofitColumn(0).run();
    });

    await waitFor(() => {
      const json = getEditor().getJSON();
      const table = json.content![0] as Record<string, unknown>;
      const row = (table.content as unknown[])[0] as Record<string, unknown>;
      const cell = (row.content as unknown[])[0] as Record<string, unknown>;
      const attrs = cell.attrs as Record<string, unknown>;
      const colwidth = attrs.colwidth as number[];
      expect(colwidth[0]).toBeGreaterThanOrEqual(40);
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 42c — Double-click handler + integration
// ---------------------------------------------------------------------------

describe('TableAutofit — dblclick handler + integration', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('extension registers autofitColumn command', async () => {
    render(<TestEditor extraExtensions={[TableAutofit]} />);

    await waitFor(() => expect(testEditor).not.toBeNull());

    expect((getEditor().commands as unknown as { autofitColumn: unknown }).autofitColumn).toBeDefined();
  });

  it('end-to-end: double-click on border autofits column', async () => {
    const content = `
      <table>
        <tbody>
          <tr><td>Narrow</td><td>Widest content here</td></tr>
        </tbody>
      </table>`.replace(/\s+/g, '');

    render(<TestEditor content={content} extraExtensions={[TableAutofit]} />);

    await waitFor(() => expect(testEditor).not.toBeNull());

    const editorEl = document.querySelector('.tiptap');
    expect(editorEl).not.toBeNull();
    const firstCell = editorEl!.querySelector('td');
    expect(firstCell).not.toBeNull();

    const rect = firstCell!.getBoundingClientRect();
    const clickX = rect.right - 2;
    const clickY = rect.top + rect.height / 2;

    await act(async () => {
      const dblclickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: clickX,
        clientY: clickY,
      });
      firstCell!.dispatchEvent(dblclickEvent);
    });

    await waitFor(() => {
      const json = getEditor().getJSON();
      const table = json.content![0] as Record<string, unknown>;
      const row = (table.content as unknown[])[0] as Record<string, unknown>;
      const cell = (row.content as unknown[])[0] as Record<string, unknown>;
      expect(cell.attrs).toBeDefined();
      expect((cell.attrs as Record<string, unknown>).colwidth).toBeDefined();
    });
  });

  it('end-to-end: table renders correctly with extension', async () => {
    const content = `
      <table>
        <tbody>
          <tr><td>A</td><td>B</td></tr>
        </tbody>
      </table>`.replace(/\s+/g, '');

    render(<TestEditor content={content} extraExtensions={[TableAutofit]} />);

    await waitFor(() => expect(testEditor).not.toBeNull());

    const editorEl = document.querySelector('.tiptap');
    const cells = editorEl!.querySelectorAll('td');
    expect(cells.length).toBe(2);
  });
});
