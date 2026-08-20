// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { type Editor } from '@tiptap/core';
import BubbleMenu from './BubbleMenu';

type PartialEditor = Partial<Editor> & Pick<Editor, 'isActive' | 'can' | 'chain' | 'getAttributes'>;

const createMockEditor = (overrides: Partial<PartialEditor> = {}): Editor => {
  const chainMock = vi.fn().mockReturnThis();
  return {
    isActive: vi.fn().mockReturnValue(false),
    can: vi.fn().mockReturnValue({ focus: vi.fn().mockReturnThis(), run: vi.fn(), chain: vi.fn().mockReturnThis() }),
    chain: chainMock,
    getAttributes: vi.fn().mockReturnValue({}),
    ...overrides,
  } as unknown as Editor;
};

// Mock the Tiptap BubbleMenu to capture shouldShow and render children
vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({
    children,
    shouldShow,
  }: {
    children: React.ReactNode;
    shouldShow: (args: { from: number; to: number; state: unknown; editor: Editor }) => boolean;
  }) => {
    // Store shouldShow on window for tests to call
    (window as unknown as { __bubbleShouldShow: typeof shouldShow }).__bubbleShouldShow = shouldShow;
    return <div data-testid="bubble-menu">{children}</div>;
  },
}));

describe('BubbleMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldShow', () => {
    it('shows when there is a text selection', () => {
      const editor = createMockEditor();
      render(<BubbleMenu editor={editor} />);
      const shouldShow = (window as unknown as { __bubbleShouldShow: (args: { from: number; to: number; state: unknown; editor: Editor }) => boolean }).__bubbleShouldShow;
      expect(shouldShow({ from: 0, to: 5, state: { selection: {} }, editor })).toBe(true);
    });

    it('hides when there is no selection and cursor is not on a link', () => {
      const editor = createMockEditor({ isActive: vi.fn().mockReturnValue(false) });
      render(<BubbleMenu editor={editor} />);
      const shouldShow = (window as unknown as { __bubbleShouldShow: (args: { from: number; to: number; state: unknown; editor: Editor }) => boolean }).__bubbleShouldShow;
      expect(shouldShow({ from: 3, to: 3, state: { selection: {} }, editor })).toBe(false);
    });

    it('shows when cursor is on a link (no selection)', () => {
      const editor = createMockEditor({ isActive: vi.fn().mockReturnValue(true) });
      render(<BubbleMenu editor={editor} />);
      const shouldShow = (window as unknown as { __bubbleShouldShow: (args: { from: number; to: number; state: unknown; editor: Editor }) => boolean }).__bubbleShouldShow;
      expect(shouldShow({ from: 3, to: 3, state: { selection: {} }, editor })).toBe(true);
    });
  });

  describe('link button', () => {
    it('dispatches open-link event when clicked', () => {
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(false),
        chain: vi.fn().mockReturnThis(),
      });
      render(<BubbleMenu editor={editor} />);

      const handler = vi.fn();
      window.addEventListener('simpledocs:open-link', handler);

      const linkBtn = screen.getByTitle('Link (Ctrl+K)');
      fireEvent.click(linkBtn);

      expect(handler).toHaveBeenCalled();

      window.removeEventListener('simpledocs:open-link', handler);
    });

    it('dispatches open-link event when cursor is on existing link', () => {
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(true),
        getAttributes: vi.fn().mockReturnValue({ href: 'https://example.com' }),
        chain: vi.fn().mockReturnThis(),
      });
      render(<BubbleMenu editor={editor} />);

      const handler = vi.fn();
      window.addEventListener('simpledocs:open-link', handler);

      const linkBtn = screen.getByTitle('Link (Ctrl+K)');
      fireEvent.click(linkBtn);

      expect(handler).toHaveBeenCalled();

      window.removeEventListener('simpledocs:open-link', handler);
    });

    it('does not call window.prompt (uses modal instead)', () => {
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(false),
        chain: vi.fn().mockReturnThis(),
      });
      render(<BubbleMenu editor={editor} />);

      const promptSpy = vi.spyOn(window, 'prompt');
      const linkBtn = screen.getByTitle('Link (Ctrl+K)');
      fireEvent.click(linkBtn);

      expect(promptSpy).not.toHaveBeenCalled();
      promptSpy.mockRestore();
    });
  });
});
