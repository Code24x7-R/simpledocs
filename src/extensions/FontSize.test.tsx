// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontSize } from './FontSize';

// Helper: editor component that stores editor in a ref-accessible way
let testEditor: any = null;

function TestEditor({
  content = '<p>Hello World</p>',
  extraExtensions = [],
}: {
  content?: string;
  extraExtensions?: any[];
}) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize, ...extraExtensions],
    content,
    onUpdate: () => {
      testEditor = editor;
    },
  });

  // Also capture on creation
  if (editor && !testEditor) {
    testEditor = editor;
  }

  return (
    <div>
      <EditorContent editor={editor} />
    </div>
  );
}

describe('FontSize extension', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('renders with textStyle and fontSize extension registered', async () => {
    render(<TestEditor />);

    // Trigger an update to capture the editor
    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    expect(testEditor.commands.setFontSize).toBeDefined();
    expect(testEditor.commands.unsetFontSize).toBeDefined();
  });

  it('applies font size via setFontSize command', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.setFontSize('24px');
    });

    await waitFor(() => {
      const html = testEditor.getHTML();
      expect(html).toContain('font-size: 24px');
    });
  });

  it('unsets font size via unsetFontSize command', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    // First set a font size
    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.setFontSize('18px');
    });

    await waitFor(() => {
      expect(testEditor.getHTML()).toContain('font-size: 18px');
    });

    // Then unset it
    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.unsetFontSize();
    });

    await waitFor(() => {
      const html = testEditor.getHTML();
      expect(html).not.toContain('font-size');
    });
  });

  it('unsetFontSize preserves other textStyle attributes (color)', async () => {
    const Color = require('@tiptap/extension-color').Color;

    function TestEditorWithColor() {
      const editor = useEditor({
        extensions: [StarterKit, TextStyle, FontSize, Color],
        content: '<p>Hello World</p>',
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

    render(<TestEditorWithColor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    // Set color + fontSize
    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.setColor('#ff0000');
      testEditor.commands.setFontSize('20px');
    });

    await waitFor(() => {
      const html = testEditor.getHTML();
      expect(html).toContain('font-size: 20px');
      expect(html).toContain('color: rgb(255, 0, 0)');
    });

    // Unset fontSize — color should remain
    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.unsetFontSize();
    });

    await waitFor(() => {
      const html = testEditor.getHTML();
      expect(html).not.toContain('font-size');
      expect(html).toContain('color: rgb(255, 0, 0)');
    });
  });

  it('removes empty span tags when font size is unset', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.setFontSize('14px');
    });

    await waitFor(() => {
      expect(testEditor.getHTML()).toContain('font-size: 14px');
    });

    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.unsetFontSize();
    });

    await waitFor(() => {
      const html = testEditor.getHTML();
      // Should not have empty <span> tags
      expect(html).not.toMatch(/<span\s*>/);
    });
  });

  it('renders font-size without line-height property', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.setFontSize('14px');
    });

    await waitFor(() => {
      const html = testEditor.getHTML();
      expect(html).toContain('font-size: 14px');
      // Should NOT include line-height (was a bug in previous version)
      expect(html).not.toContain('line-height: inherit');
    });
  });

  it('applies font size with px suffix as stored', async () => {
    render(<TestEditor content="<p>First paragraph</p>" />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.setFontSize('12px');
    });

    await waitFor(() => {
      const html = testEditor.getHTML();
      expect(html).toContain('font-size: 12px');
    });
  });

  it('isActive returns correct state for fontSize', async () => {
    render(<TestEditor />);

    await waitFor(() => {
      expect(testEditor).not.toBeNull();
    });

    // Initially no font size
    act(() => {
      testEditor.commands.selectAll();
    });

    await waitFor(() => {
      const isActive = testEditor.isActive('textStyle', { fontSize: '16px' });
      expect(isActive).toBe(false);
    });

    // Set font size and check isActive
    act(() => {
      testEditor.commands.selectAll();
      testEditor.commands.setFontSize('16px');
    });

    await waitFor(() => {
      const isActive = testEditor.isActive('textStyle', { fontSize: '16px' });
      expect(isActive).toBe(true);
    });
  });
});
