// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { ParagraphStyle } from './ParagraphStyle';
import type { Editor, AnyExtension } from '@tiptap/core';

// Helper: editor component that stores editor in a ref-accessible way
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
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }), TextStyle, ParagraphStyle, ...extraExtensions] as AnyExtension[],
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

describe('ParagraphStyle extension', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('renders with paragraphStyle extension registered', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    expect(getEditor().commands.setLineHeight).toBeDefined();
    expect(getEditor().commands.unsetLineHeight).toBeDefined();
    expect(getEditor().commands.setIndent).toBeDefined();
    expect(getEditor().commands.increaseIndent).toBeDefined();
    expect(getEditor().commands.decreaseIndent).toBeDefined();
    expect(getEditor().commands.setParagraphSpacing).toBeDefined();
    expect(getEditor().commands.unsetParagraphSpacing).toBeDefined();
  });

  it('applies line height via setLineHeight command', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setLineHeight('2');
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).toContain('line-height: 2');
    });
  });

  it('unsets line height via unsetLineHeight command', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setLineHeight('1.5');
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).toContain('line-height: 1.5');
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.unsetLineHeight();
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).not.toContain('line-height');
    });
  });

  it('applies indent via setIndent command', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setIndent(80);
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).toContain('margin-left: 80px');
    });
  });

  it('increases indent by 40px', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.increaseIndent();
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).toContain('margin-left: 40px');
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.increaseIndent();
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).toContain('margin-left: 80px');
    });
  });

  it('decreases indent by 40px (min 0)', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    // Set to 80px first
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setIndent(80);
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).toContain('margin-left: 80px');
    });

    // Decrease → 40px
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.decreaseIndent();
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).toContain('margin-left: 40px');
    });

    // Decrease twice more → clamps to 0
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.decreaseIndent();
      getEditor().commands.decreaseIndent();
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).not.toContain('margin-left');
    });
  });

  it('applies paragraph spacing via setParagraphSpacing command', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setParagraphSpacing({ before: 12, after: 12 });
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).toContain('margin-top: 12px');
      expect(html).toContain('margin-bottom: 12px');
    });
  });

  it('unsets paragraph spacing via unsetParagraphSpacing command', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setParagraphSpacing({ before: 10, after: 6 });
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).toContain('margin-top: 10px');
      expect(html).toContain('margin-bottom: 6px');
    });

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.unsetParagraphSpacing();
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).not.toContain('margin-top');
      expect(html).not.toContain('margin-bottom');
    });
  });

  it('applies attributes to heading nodes too', async () => {
    render(<TestEditor content="<h2>Heading text</h2>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setLineHeight('1.8');
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).toContain('line-height: 1.8');
    });
  });

  it('renders id attribute on headings', async () => {
    const content = '<h2 id="my-heading">Heading text</h2>';
    render(<TestEditor content={content} />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    // The id attribute should be parsed and preserved
    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).toContain('id="my-heading"');
    });
  });

  it('preserves other attributes when setting line height', async () => {
    render(<TestEditor />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    // Set indent first
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setIndent(40);
    });

    await waitFor(() => {
      expect(getEditor().getHTML()).toContain('margin-left: 40px');
    });

    // Set line height — indent should remain
    act(() => {
      getEditor().commands.selectAll();
      getEditor().commands.setLineHeight('2');
    });

    await waitFor(() => {
      const html = getEditor().getHTML();
      expect(html).toContain('line-height: 2');
      expect(html).toContain('margin-left: 40px');
    });
  });
});
