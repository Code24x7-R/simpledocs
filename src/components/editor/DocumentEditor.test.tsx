// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// Capture the options passed to useEditor
let capturedOptions: Record<string, unknown> & { editorProps?: Record<string, unknown> } = {};
let mockEditorInstance: Record<string, unknown> = {};
const mockSetEditor = vi.fn();

vi.mock('@tiptap/react', () => ({
  useEditor: (options: Record<string, unknown>) => {
    capturedOptions = options;
    // Return a mock editor with isFocused=true after mount
    mockEditorInstance = {
      isFocused: true,
      getJSON: () => ({ type: 'doc', content: [{ type: 'paragraph' }] }),
      getAttributes: () => ({}),
      chain: vi.fn().mockReturnThis(),
      commands: { setContent: vi.fn(), focus: vi.fn() },
      view: { posAtDOM: vi.fn().mockReturnValue(42) },
    };
    return mockEditorInstance;
  },
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock('../../extensions', () => ({
  createExtensions: () => [],
}));

vi.mock('../../store/useDocStore', () => ({
  useDocStore: () => ({
    docState: {
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      settings: {
        orphans: 2,
        widows: 2,
        defaultFullBleedMode: false,
      },
    },
    updateContent: vi.fn(),
    setEditor: mockSetEditor,
  }),
}));

vi.mock('./TableContextMenu', () => ({
  default: () => null,
}));

vi.mock('./BubbleMenu', () => ({
  default: () => null,
}));

vi.mock('./useLinkPreview', () => ({
  useLinkPreview: () => ({
    preview: { visible: false, x: 0, y: 0, href: '' },
    linkHandlers: {},
  }),
}));

import DocumentEditor from './DocumentEditor';

describe('DocumentEditor', () => {
  beforeEach(() => {
    capturedOptions = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes autofocus option to useEditor so the editor has focus on page load', () => {
    render(<DocumentEditor />);
    expect(capturedOptions.autofocus).toBe('end');
  });

  it('editor reports isFocused after mount', async () => {
    const { getByTestId } = render(<DocumentEditor />);
    await waitFor(() => {
      expect(getByTestId('editor-content')).toBeTruthy();
    });
  });

  it('handleClick intercepts internal anchor links', async () => {
    render(<DocumentEditor />);
    await waitFor(() => expect(capturedOptions).toBeTruthy());

    const handleClick = (capturedOptions.editorProps as { handleClick: (_view: unknown, _pos: number, event: MouseEvent) => boolean })?.handleClick;

    expect(handleClick).toBeDefined();

    // Create a mock anchor element with href="#my-heading"
    const mockAnchor = document.createElement('a');
    mockAnchor.setAttribute('href', '#my-heading');

    const mockEvent = {
      target: mockAnchor,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;

    const result = handleClick({}, 0, mockEvent);

    // Should intercept the click (return true) and prevent default navigation
    expect(result).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('handleClick does not intercept non-anchor clicks', async () => {
    render(<DocumentEditor />);
    await waitFor(() => expect(capturedOptions).toBeTruthy());

    const handleClick = (capturedOptions.editorProps as { handleClick: (_view: unknown, _pos: number, event: MouseEvent) => boolean })?.handleClick;

    // Create a mock non-anchor element
    const mockDiv = document.createElement('div');

    const mockEvent = {
      target: mockDiv,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;

    const result = handleClick({}, 0, mockEvent);

    // Should not intercept (return false)
    expect(result).toBe(false);
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('handleClick places cursor at the heading when clicking a TOC link', async () => {
    // Reset captured options from previous tests
    capturedOptions = {};
    render(<DocumentEditor />);
    await waitFor(() => expect(capturedOptions).toBeTruthy());

    const handleClick = (capturedOptions.editorProps as { handleClick: (_view: unknown, _pos: number, event: MouseEvent) => boolean })?.handleClick;
    expect(handleClick).toBeDefined();

    // Create a mock target element representing the heading
    const mockTargetEl = document.createElement('h2');
    mockTargetEl.setAttribute('id', 'my-heading');
    document.body.appendChild(mockTargetEl);

    // Create a mock anchor wrapping the heading link
    const mockAnchor = document.createElement('a');
    mockAnchor.setAttribute('href', '#my-heading');

    const mockEvent = {
      target: mockAnchor,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;

    // Set up mock chain for cursor placement verification
    const mockPosAtDOM = vi.fn().mockReturnValue(42);
    const mockRun = vi.fn();
    const mockSetTextSelection = vi.fn().mockReturnValue({ run: mockRun });
    const mockFocus = vi.fn().mockReturnValue({ setTextSelection: mockSetTextSelection });
    const mockChain = vi.fn().mockReturnValue({ focus: mockFocus });

    // Inject the mock chain and posAtDOM into the captured editor instance
    mockEditorInstance.chain = mockChain;
    mockEditorInstance.view = { posAtDOM: mockPosAtDOM };

    // Patch the editorRef to return our target element via querySelector
    const container = document.querySelector('.document-editor');
    if (container) {
      Object.defineProperty(container, 'querySelector', {
        value: vi.fn().mockReturnValue(mockTargetEl),
        writable: true,
        configurable: true,
      });
    }

    const result = handleClick({}, 0, mockEvent);

    // Should intercept the click
    expect(result).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();

    // Verify cursor was placed at the heading
    expect(mockPosAtDOM).toHaveBeenCalledWith(mockTargetEl, 0);
    expect(mockFocus).toHaveBeenCalled();
    expect(mockSetTextSelection).toHaveBeenCalledWith(42);
    expect(mockRun).toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(mockTargetEl);
  });
});
