// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { BackgroundColor } from '@tiptap/extension-text-style';
import { FontSize } from './FontSize';
import type { Editor, AnyExtension } from '@tiptap/core';

let testEditor: Editor | null = null;

/** Get the test editor, failing if not yet mounted. */
function getEditor(): Editor {
  if (!testEditor) throw new Error('Editor not mounted');
  return testEditor;
}

function TestEditor({
  content = '<p>Hello World</p>',
  extraExtensions = [],
}: {
  content?: string;
  extraExtensions?: unknown[];
}) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize, Color, BackgroundColor, ...extraExtensions] as AnyExtension[],
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

describe('BackgroundColor extension', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('renders with BackgroundColor registered', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    expect(getEditor().commands.setBackgroundColor).toBeDefined();
    expect(getEditor().commands.unsetBackgroundColor).toBeDefined();
  });

  it('applies background color via setBackgroundColor command', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setBackgroundColor('#fef08a');
    });

    await waitFor(() => {
      // Check stored attribute preserves exact hex value
      const attrs = getEditor().getAttributes('textStyle');
      expect(attrs.backgroundColor).toBe('#fef08a');
      // Browser serializes to rgb() in HTML output
      const html = getEditor().getHTML();
      expect(html).toContain('background-color: rgb(254, 240, 138)');
    });
  });

  it('unsets background color via unsetBackgroundColor command', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setBackgroundColor('#fef08a');
    });

    await waitFor(() => {
      expect(getEditor().getAttributes('textStyle').backgroundColor).toBe('#fef08a');
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.unsetBackgroundColor();
    });

    await waitFor(() => {
      const attrs = getEditor().getAttributes('textStyle');
      // removeEmptyTextStyle removes the mark entirely when no attrs remain
      expect(attrs.backgroundColor == null).toBe(true);
    });
  });

  it('background color and text color coexist on the same mark', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    // Apply both text color and background color
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setColor('#ff0000');
      getEditor().commands.setBackgroundColor('#fef08a');
    });

    await waitFor(() => {
      const attrs = getEditor().getAttributes('textStyle');
      expect(attrs.color).toBe('#ff0000');
      expect(attrs.backgroundColor).toBe('#fef08a');
    });
  });

  it('unsetting background color preserves text color', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    // Apply both
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setColor('#00ff00');
      getEditor().commands.setBackgroundColor('#fef08a');
    });

    await waitFor(() => {
      const attrs = getEditor().getAttributes('textStyle');
      expect(attrs.backgroundColor).toBe('#fef08a');
      expect(attrs.color).toBe('#00ff00');
    });

    // Unset only background
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.unsetBackgroundColor();
    });

    await waitFor(() => {
      const attrs = getEditor().getAttributes('textStyle');
      expect(attrs.backgroundColor == null).toBe(true);
      expect(attrs.color).toBe('#00ff00');
    });
  });

  it('unsetting text color preserves background color', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    // Apply both
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setColor('#0000ff');
      getEditor().commands.setBackgroundColor('#bbf7d0');
    });

    await waitFor(() => {
      const attrs = getEditor().getAttributes('textStyle');
      expect(attrs.backgroundColor).toBe('#bbf7d0');
      expect(attrs.color).toBe('#0000ff');
    });

    // Unset only text color
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.unsetColor();
    });

    await waitFor(() => {
      const attrs = getEditor().getAttributes('textStyle');
      expect(attrs.backgroundColor).toBe('#bbf7d0');
      expect(attrs.color).toBeNull();
    });
  });

  it('background color does NOT include color: inherit (no text color override)', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setBackgroundColor('#fef08a');
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      // BackgroundColor extension should NOT emit color: inherit
      // (unlike the old Highlight mark which did)
      expect(html).not.toContain('color: inherit');
      expect(html).toContain('background-color: rgb(254, 240, 138)');
    });
  });

  it('isActive returns correct state for backgroundColor', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    // Initially no background color
    act(() => {
      getEditor().commands.selectAll();
    });

    await waitFor(() => {
      const isActive = getEditor().isActive('textStyle', { backgroundColor: '#fef08a' });
      expect(isActive).toBe(false);
    });

    // Set background color and check isActive
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setBackgroundColor('#fef08a');
    });

    await waitFor(() => {
      const isActive = getEditor().isActive('textStyle', { backgroundColor: '#fef08a' });
      expect(isActive).toBe(true);
    });
  });

  it('renders background-color without font-size conflict', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setFontSize('24px');
      getEditor().commands.setBackgroundColor('#fde047');
    });

    await waitFor(() => {
      const attrs = getEditor().getAttributes('textStyle');
      expect(attrs.fontSize).toBe('24px');
      expect(attrs.backgroundColor).toBe('#fde047');
    });
  });
});
