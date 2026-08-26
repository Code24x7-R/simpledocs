// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Toolbar from './Toolbar';
import { useDocStore } from '../../../store/useDocStore';
import type { Editor } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Mock useEditorClipboard — avoid real clipboard utils (jsdom lacks execCommand)
// ---------------------------------------------------------------------------
vi.mock('../../../hooks/useEditorClipboard', () => ({
  useEditorClipboard: () => ({
    handleCopy: vi.fn(),
    handleCut: vi.fn(),
    handlePaste: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Build a chainable editor mock whose per-mark active state is configurable.
// ---------------------------------------------------------------------------
function createMockEditor(
  activeMarks: Record<string, boolean> = {},
  activeHeadingLevel: number | null = null,
): Partial<Editor> {
  const chainObj: Record<string, ReturnType<typeof vi.fn>> = {};
  // Every chainable command returns the chain object itself.
  [
    'focus',
    'toggleBold',
    'toggleItalic',
    'toggleUnderline',
    'toggleStrike',
    'unsetAllMarks',
    'setColor',
    'unsetColor',
    'setBackgroundColor',
    'unsetBackgroundColor',
    'setFontFamily',
    'unsetFontFamily',
    'setFontSize',
    'unsetFontSize',
    'setParagraph',
    'toggleHeading',
    'setTextAlign',
    'toggleBulletList',
    'toggleOrderedList',
    'toggleList',
    'toggleBlockquote',
    'toggleCodeBlock',
    'setHorizontalRule',
    'setPageBreak',
    'setLineHeight',
    'unsetLineHeight',
    'increaseIndent',
    'decreaseIndent',
    'setParagraphSpacing',
    'unsetParagraphSpacing',
    'undo',
    'redo',
  ].forEach((m) => {
    chainObj[m] = vi.fn().mockReturnValue(chainObj);
  });
  chainObj.run = vi.fn();
  chainObj.chain = vi.fn().mockReturnValue(chainObj);

  return {
    getHTML: () => '<p>Hello</p>',
    isActive: vi.fn((mark: string, attrs?: unknown) => {
      if (attrs !== undefined) {
        // Support heading level checks: isActive('heading', { level: N }).
        if (mark === 'heading' && typeof (attrs as { level?: number })?.level === 'number') {
          return (attrs as { level: number }).level === activeHeadingLevel;
        }
        return false;
      }
      return activeMarks[mark] ?? false;
    }),
    getAttributes: vi.fn(() => ({})),
    can: vi.fn(() => ({ undo: () => true, redo: () => true })),
    chain: vi.fn().mockReturnValue(chainObj),
    ...chainObj,
  } as unknown as Partial<Editor>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useDocStore.setState({
    editor: createMockEditor() as Editor,
    searchReplaceOpen: false,
    chatOpen: false,
    setSearchReplaceOpen: useDocStore.getState().setSearchReplaceOpen,
    setChatOpen: useDocStore.getState().setChatOpen,
    setTtsOpen: useDocStore.getState().setTtsOpen,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Toolbar', () => {
  it('renders Bold, Italic and Underline as toolbar buttons', () => {
    render(<Toolbar />);

    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
    expect(screen.getByTitle('Underline (Ctrl+U)')).toBeInTheDocument();
  });

  it('fires toggleBold when the Bold button is clicked', () => {
    const editor = createMockEditor() as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('Bold (Ctrl+B)'));

    expect(editor.chain().focus().toggleBold).toHaveBeenCalledTimes(1);
    expect(editor.chain().focus().toggleBold().run).toHaveBeenCalledTimes(1);
  });

  it('fires toggleItalic when the Italic button is clicked', () => {
    const editor = createMockEditor() as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('Italic (Ctrl+I)'));

    expect(editor.chain().focus().toggleItalic).toHaveBeenCalledTimes(1);
    expect(editor.chain().focus().toggleItalic().run).toHaveBeenCalledTimes(1);
  });

  it('fires toggleUnderline when the Underline button is clicked', () => {
    const editor = createMockEditor() as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('Underline (Ctrl+U)'));

    expect(editor.chain().focus().toggleUnderline).toHaveBeenCalledTimes(1);
    expect(editor.chain().focus().toggleUnderline().run).toHaveBeenCalledTimes(1);
  });

  it('calls preventDefault on mousedown so the editor keeps focus', () => {
    const editor = createMockEditor() as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(mousedown, 'preventDefault');

    boldButton.dispatchEvent(mousedown);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('calls preventDefault on mousedown for dropdown item buttons', () => {
    const editor = createMockEditor() as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    // Open the Style dropdown and verify its items prevent default.
    fireEvent.click(screen.getByText('Normal'));
    const heading1Item = screen.getByRole('button', { name: 'Heading 1' });
    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(mousedown, 'preventDefault');

    heading1Item.dispatchEvent(mousedown);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('shows Bold as active when the editor marks bold as active', () => {
    const editor = createMockEditor({ bold: true }) as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    expect(boldButton).toHaveAttribute('aria-pressed', 'true');
    expect(boldButton.className).toContain('bg-blue-600');
    // Italic/Underline should remain inactive.
    expect(screen.getByTitle('Italic (Ctrl+I)')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTitle('Italic (Ctrl+I)').className).not.toContain('bg-blue-600');
    expect(screen.getByTitle('Underline (Ctrl+U)').className).not.toContain('bg-blue-600');
  });

  it('shows Italic and Underline as active when their marks are active', () => {
    const editor = createMockEditor({ italic: true, underline: true }) as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    expect(screen.getByTitle('Italic (Ctrl+I)')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Italic (Ctrl+I)').className).toContain('bg-blue-600');
    expect(screen.getByTitle('Underline (Ctrl+U)')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Underline (Ctrl+U)').className).toContain('bg-blue-600');
    expect(screen.getByTitle('Bold (Ctrl+B)')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTitle('Bold (Ctrl+B)').className).not.toContain('bg-blue-600');
  });

  it('does not render Bold/Italic/Underline inside the Format dropdown', () => {
    const { container } = render(<Toolbar />);

    // Open the Format menu.
    fireEvent.click(screen.getByText('Format'));
    // Scope assertions to the open dropdown panel (the toolbar buttons share
    // the same accessible names, so a document-wide query would match them).
    const dropdown = container.querySelector('.absolute.z-50') as HTMLElement;
    expect(dropdown).toBeTruthy();
    // The dropdown items "Bold" / "Italic" / "Underline" (as list rows) should
    // no longer exist — only Strikethrough remains under Text Style.
    expect(within(dropdown).queryByRole('button', { name: /Bold/ })).not.toBeInTheDocument();
    expect(within(dropdown).queryByRole('button', { name: /Italic/ })).not.toBeInTheDocument();
    expect(within(dropdown).queryByRole('button', { name: /Underline/ })).not.toBeInTheDocument();
    // Strikethrough is still in the Format menu.
    expect(within(dropdown).getByRole('button', { name: /Strikethrough/ })).toBeInTheDocument();
  });

  it('shows "Normal" as the active style by default', () => {
    render(<Toolbar />);

    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('shows the active heading level in the Style dropdown', () => {
    const editor = createMockEditor({}, 2) as Editor;
    useDocStore.setState({ editor });
    render(<Toolbar />);

    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.queryByText('Normal')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Roving tabindex (ARIA toolbar pattern)
  // -------------------------------------------------------------------------
  describe('toolbar keyboard navigation', () => {
    it('the toolbar has role="toolbar" and an accessible name', () => {
      render(<Toolbar />);
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Formatting');
    });

    it('only one button is in the tab order at a time (tabIndex 0)', () => {
      render(<Toolbar />);
      const buttons = screen.getByRole('toolbar').querySelectorAll('button');
      const tabZero = Array.from(buttons).filter((b) => b.getAttribute('tabindex') === '0');
      expect(tabZero.length).toBe(1);
    });

    // NOTE: focus() and native KeyboardEvent dispatch are intentionally NOT
    // wrapped in act() — wrapping focus() forces a synchronous flush of the
    // roving-tabindex state update, which changes tabIndex on the focused
    // element and causes jsdom to blur it.
    it('ArrowRight moves focus to the next button', () => {
      render(<Toolbar />);
      const toolbar = screen.getByRole('toolbar');
      const bold = screen.getByTitle('Bold (Ctrl+B)');
      const italic = screen.getByTitle('Italic (Ctrl+I)');
      bold.focus();
      toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(document.activeElement).toBe(italic);
    });

    it('ArrowLeft wraps to the end from the first button', () => {
      render(<Toolbar />);
      const toolbar = screen.getByRole('toolbar');
      const buttons = toolbar.querySelectorAll('button');
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      first.focus();
      toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(document.activeElement).toBe(last);
    });

    it('Home / End jump to first / last button', () => {
      render(<Toolbar />);
      const toolbar = screen.getByRole('toolbar');
      const buttons = toolbar.querySelectorAll('button');
      const mid = buttons[Math.floor(buttons.length / 2)];
      mid.focus();
      toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(document.activeElement).toBe(buttons[0]);
      toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    });

    it('suspends arrow navigation while a dropdown is open', () => {
      render(<Toolbar />);
      const toolbar = screen.getByRole('toolbar');
      // Open the Style dropdown. The click triggers a re-render, so the
      // toolbar button DOM nodes are recreated — re-query afterwards.
      fireEvent.click(screen.getByText('Normal'));
      const bold = screen.getByTitle('Bold (Ctrl+B)');
      bold.focus();
      toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      // Focus must NOT leave the Bold button — dropdown owns the keys.
      expect(document.activeElement).toBe(bold);
    });
  });
});
