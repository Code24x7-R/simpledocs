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

/**
 * Create a chainable mock where every method returns the same object,
 * so `chain().focus().setLink(...).run()` works. Individual methods
 * can be spied on for assertions.
 */
function createChainableMock(methods: Record<string, ReturnType<typeof vi.fn>> = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    focus: vi.fn().mockReturnThis(),
    run: vi.fn(),
    ...methods,
  };
  // Ensure all methods return the chain object for fluent chaining
  for (const key of Object.keys(chain)) {
    if (key !== 'focus' && key !== 'run') {
      chain[key].mockReturnThis();
    }
  }
  return chain;
}

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
    it('prompts for URL when no link is active', () => {
      const setLink = vi.fn();
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(false),
        chain: vi.fn().mockReturnValue(createChainableMock({ setLink })),
      });
      render(<BubbleMenu editor={editor} />);

      vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(window.prompt).toHaveBeenCalledWith('Enter URL:', 'https://');
      expect(setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
    });

    it('does not set link when prompt is cancelled', () => {
      const setLink = vi.fn();
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(false),
        chain: vi.fn().mockReturnValue(createChainableMock({ setLink })),
      });
      render(<BubbleMenu editor={editor} />);

      vi.spyOn(window, 'prompt').mockReturnValue(null);
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(setLink).not.toHaveBeenCalled();
    });

    it('prompts to edit URL when cursor is on a link', () => {
      const setLink = vi.fn();
      const unsetLink = vi.fn();
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(true),
        getAttributes: vi.fn().mockReturnValue({ href: 'https://old.com' }),
        chain: vi.fn().mockReturnValue(createChainableMock({ setLink, unsetLink })),
      });
      render(<BubbleMenu editor={editor} />);

      vi.spyOn(window, 'prompt').mockReturnValue('https://new.com');
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(window.prompt).toHaveBeenCalledWith('Edit URL (leave empty to remove):', 'https://old.com');
      expect(setLink).toHaveBeenCalledWith({ href: 'https://new.com' });
      expect(unsetLink).not.toHaveBeenCalled();
    });

    it('removes link when prompt returns empty string', () => {
      const setLink = vi.fn();
      const unsetLink = vi.fn();
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(true),
        getAttributes: vi.fn().mockReturnValue({ href: 'https://old.com' }),
        chain: vi.fn().mockReturnValue(createChainableMock({ setLink, unsetLink })),
      });
      render(<BubbleMenu editor={editor} />);

      vi.spyOn(window, 'prompt').mockReturnValue('');
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(unsetLink).toHaveBeenCalled();
    });

    it('keeps existing link when prompt is cancelled', () => {
      const setLink = vi.fn();
      const unsetLink = vi.fn();
      const editor = createMockEditor({
        isActive: vi.fn().mockReturnValue(true),
        getAttributes: vi.fn().mockReturnValue({ href: 'https://old.com' }),
        chain: vi.fn().mockReturnValue(createChainableMock({ setLink, unsetLink })),
      });
      render(<BubbleMenu editor={editor} />);

      vi.spyOn(window, 'prompt').mockReturnValue(null);
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(setLink).not.toHaveBeenCalled();
      expect(unsetLink).not.toHaveBeenCalled();
    });
  });
});
