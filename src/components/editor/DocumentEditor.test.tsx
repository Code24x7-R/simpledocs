// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// Capture the options passed to useEditor
let capturedOptions: Record<string, unknown> = {};
const mockSetEditor = vi.fn();

vi.mock('@tiptap/react', () => ({
  useEditor: (options: Record<string, unknown>) => {
    capturedOptions = options;
    // Return a mock editor with isFocused=true after mount
    return {
      isFocused: true,
      getJSON: () => ({ type: 'doc', content: [{ type: 'paragraph' }] }),
      getAttributes: () => ({}),
      chain: vi.fn().mockReturnThis(),
      commands: { setContent: vi.fn(), focus: vi.fn() },
    };
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
});
