// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { type Editor } from '@tiptap/core';
import TableContextMenu from './TableContextMenu';

type PartialEditor = Partial<Editor> & Pick<Editor, 'isActive' | 'can' | 'chain'>;

// Mock editor with table capabilities
const createMockEditor = (overrides: Partial<PartialEditor> = {}): Editor => ({
  isActive: vi.fn().mockReturnValue(true),
  can: vi.fn().mockReturnValue({
    mergeCells: vi.fn().mockReturnValue(true),
    splitCell: vi.fn().mockReturnValue(true),
    addRowBefore: vi.fn().mockReturnValue(true),
    addRowAfter: vi.fn().mockReturnValue(true),
    addColumnBefore: vi.fn().mockReturnValue(true),
    addColumnAfter: vi.fn().mockReturnValue(true),
    deleteRow: vi.fn().mockReturnValue(true),
    deleteColumn: vi.fn().mockReturnValue(true),
    toggleHeaderRow: vi.fn().mockReturnValue(true),
    toggleHeaderColumn: vi.fn().mockReturnValue(true),
    focus: vi.fn().mockReturnThis(),
    run: vi.fn(),
    chain: vi.fn().mockReturnThis(),
  }),
  chain: vi.fn().mockReturnThis(),
  ...overrides,
} as unknown as Editor);

const mockOnClose = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  mockOnClose.mockClear();
});

describe('TableContextMenu', () => {
  it('renders when visible', () => {
    const editor = createMockEditor();
    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );
    expect(screen.getByText('Add Row Above')).toBeInTheDocument();
  });

  it('shows all menu items', () => {
    const editor = createMockEditor();
    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    // Row operations
    expect(screen.getByText('Add Row Above')).toBeInTheDocument();
    expect(screen.getByText('Add Row Below')).toBeInTheDocument();
    expect(screen.getByText('Delete Row')).toBeInTheDocument();

    // Column operations
    expect(screen.getByText('Add Column Left')).toBeInTheDocument();
    expect(screen.getByText('Add Column Right')).toBeInTheDocument();
    expect(screen.getByText('Delete Column')).toBeInTheDocument();

    // Cell operations
    expect(screen.getByText('Merge Cells')).toBeInTheDocument();
    expect(screen.getByText('Split Cell')).toBeInTheDocument();

    // Header toggles
    expect(screen.getByText('Toggle Header Row')).toBeInTheDocument();
    expect(screen.getByText('Toggle Header Column')).toBeInTheDocument();
  });

  it('does not render when not in table', () => {
    const editor = createMockEditor({
      isActive: vi.fn().mockReturnValue(false),
    });
    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );
    expect(screen.queryByText('Add Row Above')).not.toBeInTheDocument();
  });

  it('calls addRowBefore and closes on "Add Row Above" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      addRowBefore: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Add Row Above'));
    expect(mockChain.focus).toHaveBeenCalled();
    expect(mockChain.addRowBefore).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls addRowAfter and closes on "Add Row Below" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      addRowAfter: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Add Row Below'));
    expect(mockChain.addRowAfter).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls addColumnBefore and closes on "Add Column Left" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      addColumnBefore: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Add Column Left'));
    expect(mockChain.addColumnBefore).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls addColumnAfter and closes on "Add Column Right" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      addColumnAfter: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Add Column Right'));
    expect(mockChain.addColumnAfter).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls deleteRow and closes on "Delete Row" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      deleteRow: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Delete Row'));
    expect(mockChain.deleteRow).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls deleteColumn and closes on "Delete Column" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      deleteColumn: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Delete Column'));
    expect(mockChain.deleteColumn).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls mergeCells and closes on "Merge Cells" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      mergeCells: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Merge Cells'));
    expect(mockChain.mergeCells).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls splitCell and closes on "Split Cell" click', () => {
    const editor = createMockEditor();
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      splitCell: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    editor.chain = vi.fn().mockReturnValue(mockChain);

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByText('Split Cell'));
    expect(mockChain.splitCell).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables Merge Cells when cannot merge', () => {
    const editor = createMockEditor();
    editor.can = vi.fn().mockReturnValue({
      mergeCells: vi.fn().mockReturnValue(false),
      splitCell: vi.fn().mockReturnValue(true),
      addRowBefore: vi.fn().mockReturnValue(true),
      addRowAfter: vi.fn().mockReturnValue(true),
      addColumnBefore: vi.fn().mockReturnValue(true),
      addColumnAfter: vi.fn().mockReturnValue(true),
      deleteRow: vi.fn().mockReturnValue(true),
      deleteColumn: vi.fn().mockReturnValue(true),
    });

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    const mergeButton = screen.getByText('Merge Cells').closest('button');
    expect(mergeButton).toBeDisabled();
  });

  it('disables Split Cell when cannot split', () => {
    const editor = createMockEditor();
    editor.can = vi.fn().mockReturnValue({
      mergeCells: vi.fn().mockReturnValue(true),
      splitCell: vi.fn().mockReturnValue(false),
      addRowBefore: vi.fn().mockReturnValue(true),
      addRowAfter: vi.fn().mockReturnValue(true),
      addColumnBefore: vi.fn().mockReturnValue(true),
      addColumnAfter: vi.fn().mockReturnValue(true),
      deleteRow: vi.fn().mockReturnValue(true),
      deleteColumn: vi.fn().mockReturnValue(true),
    });

    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    const splitButton = screen.getByText('Split Cell').closest('button');
    expect(splitButton).toBeDisabled();
  });

  it('closes on Escape key', () => {
    const editor = createMockEditor();
    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on click outside', () => {
    const editor = createMockEditor();
    render(
      <TableContextMenu x={100} y={100} editor={editor} onClose={mockOnClose} />
    );

    // Advance past the initial delay
    vi.advanceTimersByTime(150);

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('positions menu at specified coordinates', () => {
    const editor = createMockEditor();
    render(
      <TableContextMenu x={100} y={200} editor={editor} onClose={mockOnClose} />
    );

    const menu = screen.getByText('Add Row Above').closest('div.fixed') as HTMLElement;
    expect(menu).toHaveStyle({ left: '100px', top: '200px' });
  });
});
