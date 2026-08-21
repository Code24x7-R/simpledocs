// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SearchReplaceModal from './SearchReplaceModal';

// Mock the store
const mockUpdateContent = vi.fn();
const mockSetSearchReplaceOpen = vi.fn();
const mockEditor = {
  getText: () => 'The quick brown fox jumps over the lazy dog. The fox is quick.',
  commands: {
    setTextSelection: vi.fn(),
    focus: vi.fn(),
    scrollIntoView: vi.fn(),
  },
  chain: vi.fn().mockReturnThis(),
  state: {
    selection: { from: 0, to: 0, empty: true },
    doc: { textBetween: () => '' },
  },
  view: {
    coordsAtPos: () => ({ top: 0, bottom: 10, left: 0, right: 100 }),
  },
};

const mockBeginProgrammaticScroll = vi.fn();

vi.mock('../../store/useDocStore', () => ({
  useDocStore: () => ({
    editor: mockEditor,
    docState: {
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'The quick brown fox jumps over the lazy dog. The fox is quick.' },
            ],
          },
        ],
      },
    },
    updateContent: mockUpdateContent,
    setSearchReplaceOpen: mockSetSearchReplaceOpen,
    beginProgrammaticScroll: mockBeginProgrammaticScroll,
  }),
}));

// Mock document.getElementById for scroll container
beforeEach(() => {
  const mockScrollContainer = {
    scrollTop: 0,
    getBoundingClientRect: () => ({ top: 0, bottom: 500, left: 0, right: 400 }),
    scrollTo: vi.fn(),
  };
  vi.spyOn(document, 'getElementById').mockReturnValue(mockScrollContainer as unknown as HTMLElement);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  mockUpdateContent.mockClear();
  mockSetSearchReplaceOpen.mockClear();
});

describe('SearchReplaceModal', () => {
  it('renders when isOpen is true', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Find & Replace')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<SearchReplaceModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Find & Replace')).not.toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByPlaceholderText('Search for...')).toBeInTheDocument();
  });

  it('shows replace input', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByPlaceholderText('Replace with...')).toBeInTheDocument();
  });

  it('shows case sensitive checkbox', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Case')).toBeInTheDocument();
  });

  it('shows whole word checkbox', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Word')).toBeInTheDocument();
  });

  it('shows regex checkbox', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Regex')).toBeInTheDocument();
  });

  it('shows Replace and All buttons', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Replace')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('updates search term on input', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('Search for...');
    fireEvent.change(input, { target: { value: 'fox' } });
    expect(input).toHaveValue('fox');
  });

  it('updates replace term on input', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText('Replace with...');
    fireEvent.change(input, { target: { value: 'cat' } });
    expect(input).toHaveValue('cat');
  });

  it('toggles case sensitive', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const checkbox = screen.getByLabelText('Case') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('toggles whole word', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const checkbox = screen.getByLabelText('Word') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('toggles regex', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const checkbox = screen.getByLabelText('Regex') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('shows keyboard shortcut hint', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/F3 Next/)).toBeInTheDocument();
  });

  it('closes on X button click', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    // Find the close button by its title
    const closeButton = screen.getByTitle('Close search panel');
    fireEvent.click(closeButton);
    expect(mockSetSearchReplaceOpen).toHaveBeenCalledWith(false);
  });

  it('collapses and expands on header click', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const header = screen.getByText('Find & Replace');
    fireEvent.click(header);
    // When collapsed, search input should not be visible
    expect(screen.queryByPlaceholderText('Search for...')).not.toBeInTheDocument();
    // Click again to expand
    fireEvent.click(header);
    expect(screen.getByPlaceholderText('Search for...')).toBeInTheDocument();
  });

  it('shows regex placeholder when regex mode is on', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const checkbox = screen.getByLabelText('Regex') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText('Regex pattern...')).toBeInTheDocument();
  });

  it('disables Replace and All buttons when search is empty', () => {
    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);
    const replaceButton = screen.getByText('Replace');
    const allButton = screen.getByText('All');
    expect(replaceButton).toBeDisabled();
    expect(allButton).toBeDisabled();
  });

  it('navigateToMatch uses scrollIntoView in the editor chain', async () => {
    // Set up a chain mock that tracks method calls
    const chainMethods: string[] = [];
    const chainableObj: {
      focus: () => typeof chainableObj;
      setTextSelection: () => typeof chainableObj;
      scrollIntoView: () => typeof chainableObj;
      run: () => void;
    } = {
      focus: () => { chainMethods.push('focus'); return chainableObj; },
      setTextSelection: () => { chainMethods.push('setTextSelection'); return chainableObj; },
      scrollIntoView: () => { chainMethods.push('scrollIntoView'); return chainableObj; },
      run: () => { chainMethods.push('run'); },
    };
    mockEditor.chain = vi.fn().mockReturnValue(chainableObj);

    render(<SearchReplaceModal isOpen={true} onClose={() => {}} />);

    // Type a search term and advance debounce
    const input = screen.getByPlaceholderText('Search for...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'fox' } });
      vi.advanceTimersByTime(200);
    });

    // Click find next to trigger navigateToMatch
    const findNextButton = screen.getByTitle('Next match (F3)');
    await act(async () => {
      fireEvent.click(findNextButton);
    });

    // Verify the chain includes focus, setTextSelection, scrollIntoView, run
    expect(chainMethods).toContain('focus');
    expect(chainMethods).toContain('setTextSelection');
    expect(chainMethods).toContain('scrollIntoView');
    expect(chainMethods).toContain('run');
  });
});
