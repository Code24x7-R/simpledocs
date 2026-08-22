// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDocStore } from '../../store/useDocStore';
import TableOfContentsModal from './TableOfContentsModal';

const mockDocWithHeadings = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter One' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Some text.' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section A' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section B' }] },
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter Two' }] },
  ],
};

const mockDocWithToc = {
  type: 'doc',
  content: [
    { type: 'tableOfContents', content: [{ type: 'bulletList', content: [] }] },
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter One' }] },
  ],
};

const mockDocNoHeadings = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Just text.' }] }],
};

const mockOnInsert = vi.fn();
const mockOnClose = vi.fn();

vi.mock('../../store/useDocStore', () => ({
  useDocStore: vi.fn(() => ({
    docState: { content: mockDocWithHeadings },
    setTocOpen: vi.fn(),
    normalEditorMode: false,
    setNormalEditorMode: vi.fn(),
  })),
}));

describe('TableOfContentsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderWithDoc(docContent: Record<string, unknown>, normalEditorMode = false) {
    vi.mocked(useDocStore).mockReturnValue({
      docState: { content: docContent },
      setTocOpen: vi.fn(),
      normalEditorMode,
      setNormalEditorMode: vi.fn(),
    } as unknown as ReturnType<typeof useDocStore>);
    render(
      <TableOfContentsModal
        isOpen={true}
        onClose={mockOnClose}
        onInsert={mockOnInsert}
      />
    );
  }

  it('renders when isOpen is true', () => {
    renderWithDoc(mockDocWithHeadings);
    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    vi.mocked(useDocStore).mockReturnValue({
      docState: { content: mockDocWithHeadings },
      setTocOpen: vi.fn(),
      normalEditorMode: false,
      setNormalEditorMode: vi.fn(),
    } as unknown as ReturnType<typeof useDocStore>);
    render(
      <TableOfContentsModal
        isOpen={false}
        onClose={mockOnClose}
        onInsert={mockOnInsert}
      />
    );
    expect(screen.queryByText('Table of Contents')).not.toBeInTheDocument();
  });

  it('shows heading preview with correct items', () => {
    renderWithDoc(mockDocWithHeadings);
    expect(screen.getByText('Chapter One')).toBeInTheDocument();
    expect(screen.getByText('Section A')).toBeInTheDocument();
    expect(screen.getByText('Section B')).toBeInTheDocument();
    expect(screen.getByText('Chapter Two')).toBeInTheDocument();
  });

  it('displays the heading count', () => {
    renderWithDoc(mockDocWithHeadings);
    expect(screen.getByText('4 headings found')).toBeInTheDocument();
  });

  it('shows singular form for one heading', () => {
    const singleDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Only' }] },
      ],
    };
    renderWithDoc(singleDoc);
    expect(screen.getByText('1 heading found')).toBeInTheDocument();
  });

  it('shows warning when TOC already exists', () => {
    renderWithDoc(mockDocWithToc);
    expect(screen.getByText('A Table of Contents already exists')).toBeInTheDocument();
    expect(screen.getByText('Replace TOC')).toBeInTheDocument();
  });

  it('shows Insert TOC button when no existing TOC', () => {
    renderWithDoc(mockDocWithHeadings);
    expect(screen.getByText('Insert TOC')).toBeInTheDocument();
    expect(screen.queryByText('Replace TOC')).not.toBeInTheDocument();
  });

  it('shows empty state when no headings match', () => {
    renderWithDoc(mockDocNoHeadings);
    expect(screen.getByText(/No headings found/)).toBeInTheDocument();
  });

  it('disables Insert button when no headings', () => {
    renderWithDoc(mockDocNoHeadings);
    const insertBtn = screen.getByText('Insert TOC');
    expect(insertBtn).toBeDisabled();
  });

  it('calls onInsert when Insert TOC is clicked', () => {
    renderWithDoc(mockDocWithHeadings);
    fireEvent.click(screen.getByText('Insert TOC'));
    expect(mockOnInsert).toHaveBeenCalledTimes(1);
    expect(mockOnInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tableOfContents' }),
      expect.objectContaining({ type: 'doc' })
    );
  });

  it('calls onInsert when Replace TOC is clicked', () => {
    renderWithDoc(mockDocWithToc);
    fireEvent.click(screen.getByText('Replace TOC'));
    expect(mockOnInsert).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    renderWithDoc(mockDocWithHeadings);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('filters headings by level range', () => {
    renderWithDoc(mockDocWithHeadings);
    // Change max level to 1 (first combo is min, second is max)
    const combos = screen.getAllByRole('combobox');
    fireEvent.change(combos[1], { target: { value: '1' } });
    // Should only show h1 headings
    expect(screen.getByText('2 headings found')).toBeInTheDocument();
  });

  it('shows a notice and disables Insert in Normal Editor mode', () => {
    renderWithDoc(mockDocWithHeadings, /* normalEditorMode */ true);
    expect(screen.getByText('Table of Contents works in the Paginated Editor')).toBeInTheDocument();
    const insertBtn = screen.getByText('Insert TOC') as HTMLButtonElement;
    expect(insertBtn).toBeDisabled();
  });

  it('shows a notice and disables Replace in Normal Editor mode', () => {
    renderWithDoc(mockDocWithToc, /* normalEditorMode */ true);
    expect(screen.getByText('Table of Contents works in the Paginated Editor')).toBeInTheDocument();
    const replaceBtn = screen.getByText('Replace TOC') as HTMLButtonElement;
    expect(replaceBtn).toBeDisabled();
  });

  it('does not show the notice in Paginated Editor mode', () => {
    renderWithDoc(mockDocWithHeadings, /* normalEditorMode */ false);
    expect(
      screen.queryByText('Table of Contents works in the Paginated Editor')
    ).not.toBeInTheDocument();
  });

  it('Switch to Paginated Editor button calls setNormalEditorMode(false)', () => {
    const setNormalEditorMode = vi.fn();
    vi.mocked(useDocStore).mockReturnValue({
      docState: { content: mockDocWithHeadings },
      setTocOpen: vi.fn(),
      normalEditorMode: true,
      setNormalEditorMode,
    } as unknown as ReturnType<typeof useDocStore>);
    render(
      <TableOfContentsModal
        isOpen={true}
        onClose={mockOnClose}
        onInsert={mockOnInsert}
      />
    );
    fireEvent.click(screen.getByText('Switch to Paginated Editor'));
    expect(setNormalEditorMode).toHaveBeenCalledWith(false);
  });
});
