// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { ParagraphStyle } from '../../extensions/ParagraphStyle';
import { HeadingStyle } from '../../extensions/HeadingStyle';
import type { Editor, AnyExtension } from '@tiptap/core';

// Mock scrollIntoView and getClientRects which are not implemented in jsdom.
// getClientRects returns a DOMRectList (which has an item() method), so the
// mock must implement that shape to satisfy the DOM typings.
const mockRect: DOMRect = {
  top: 0,
  left: 0,
  bottom: 10,
  right: 100,
  width: 100,
  height: 10,
  x: 0,
  y: 0,
  toJSON() { return this; },
} as DOMRect;

const mockRectList: DOMRectList = {
  length: 1,
  item: () => mockRect,
  [0]: mockRect,
} as unknown as DOMRectList;

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = vi.fn(() => mockRectList);
});

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
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }), TextStyle, ParagraphStyle, HeadingStyle, ...extraExtensions] as AnyExtension[],
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

describe('Heading style application', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('should NOT bleed into paragraph below when applying different heading level at position 1', async () => {
    // Reproduce the bug: heading + paragraph, cursor at pos 1 in heading
    render(<TestEditor content="<h1>My Title</h1><p>Some paragraph</p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const editor = getEditor();

    // Place cursor at position 1 (start of heading content)
    act(() => {
      editor.chain().focus().setTextSelection(1).run();
    });

    // Verify cursor is at position 1
    await waitFor(() => {
      const { from, to } = editor.state.selection;
      expect(from).toBe(1);
      expect(to).toBe(1);
    });

    // Apply Heading 2 (different level from current Heading 1)
    act(() => {
      editor.chain().focus().setBlockHeading(2).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H2:', html);

      // The heading should be H2 now
      expect(html).toContain('<h2>');
      expect(html).toContain('My Title');

      // The paragraph below should NOT be affected
      expect(html).toContain('<p>');
      expect(html).toContain('Some paragraph');
      expect(html).not.toContain('<h2>Some paragraph</h2>');
    });
  });

  it('should apply heading style only to current block when cursor is at start of heading', async () => {
    render(<TestEditor content="<h1>First Heading</h1><h1>Second Heading</h1><p>Paragraph</p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const editor = getEditor();

    // Place cursor at position 1 (start of first heading)
    act(() => {
      editor.chain().focus().setTextSelection(1).run();
    });

    // Apply Heading 2
    act(() => {
      editor.chain().focus().setBlockHeading(2).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H2 to first heading:', html);

      // Only the first heading should change
      expect(html).toMatch(/^<h2>/); // First heading is now H2
      expect(html).toContain('<h1>Second Heading</h1>'); // Second heading unchanged
      expect(html).toContain('<p>Paragraph</p>'); // Paragraph unchanged
    });
  });

  it('should NOT bleed when applying H1 then H2 to a paragraph', async () => {
    // Start with a paragraph, apply H1, then apply H2
    render(<TestEditor content="<p>My Title</p><p>Paragraph below</p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const editor = getEditor();

    // Place cursor at position 1 (start of first paragraph)
    act(() => {
      editor.chain().focus().setTextSelection(1).run();
    });

    // Apply Heading 1
    act(() => {
      editor.chain().focus().setBlockHeading(1).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H1:', html);
      expect(html).toContain('<h1>My Title</h1>');
      expect(html).toContain('<p>Paragraph below</p>');
    });

    // Now apply Heading 2
    act(() => {
      editor.chain().focus().setTextSelection(1).run();
    });

    act(() => {
      editor.chain().focus().setBlockHeading(2).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H2:', html);
      expect(html).toContain('<h2>My Title</h2>');
      expect(html).toContain('<p>Paragraph below</p>');
      expect(html).not.toContain('<h2>Paragraph below</h2>');
    });
  });

  it('should NOT bleed when cursor is at position 0 (before heading)', async () => {
    render(<TestEditor content="<h1>My Title</h1><p>Paragraph below</p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const editor = getEditor();

    // Place cursor at position 0 (before heading)
    act(() => {
      editor.chain().focus().setTextSelection(0).run();
    });

    // Apply Heading 2
    act(() => {
      editor.chain().focus().setBlockHeading(2).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H2 at pos 0:', html);
      expect(html).toContain('<h2>My Title</h2>');
      expect(html).toContain('<p>Paragraph below</p>');
    });
  });

  it('should NOT bleed with empty paragraph below', async () => {
    render(<TestEditor content="<h1>My Title</h1><p></p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const editor = getEditor();

    // Place cursor at position 1
    act(() => {
      editor.chain().focus().setTextSelection(1).run();
    });

    // Apply Heading 2
    act(() => {
      editor.chain().focus().setBlockHeading(2).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H2 with empty para:', html);
      expect(html).toContain('<h2>My Title</h2>');
      expect(html).not.toContain('<h2></h2>');
    });
  });

  it('should NOT bleed when heading has id attribute', async () => {
    render(<TestEditor content='<h1 id="heading-1">My Title</h1><p>Paragraph below</p>' />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const editor = getEditor();

    // Place cursor at position 1
    act(() => {
      editor.chain().focus().setTextSelection(1).run();
    });

    // Apply Heading 2
    act(() => {
      editor.chain().focus().setBlockHeading(2).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H2 with id attr:', html);
      expect(html).toMatch(/<h2[\s>]/); // H2 tag with or without attributes
      expect(html).toContain('My Title');
      expect(html).toContain('<p>Paragraph below</p>');
      expect(html).not.toMatch(/<h2[\s>]*>Paragraph below/);
    });
  });

  it('should NOT bleed when applying heading to middle of heading text', async () => {
    render(<TestEditor content="<h1>My Title</h1><p>Paragraph below</p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const editor = getEditor();

    // Place cursor at position 4 (middle of heading text)
    act(() => {
      editor.chain().focus().setTextSelection(4).run();
    });

    // Apply Heading 2
    act(() => {
      editor.chain().focus().setBlockHeading(2).run();
    });

    await waitFor(() => {
      const html = editor.getHTML();
      console.log('HTML after applying H2 at pos 4:', html);
      expect(html).toContain('<h2>My Title</h2>');
      expect(html).toContain('<p>Paragraph below</p>');
    });
  });
});
