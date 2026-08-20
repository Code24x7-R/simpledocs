// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { ParagraphStyle } from './ParagraphStyle';
import { TableOfContents } from './TableOfContents';
import {
  extractHeadings,
  buildTocContent,
  assignHeadingAnchors,
  wrapTocInContainer,
} from '../utils/tableOfContents';
import type { Editor, AnyExtension } from '@tiptap/core';

let testEditor: Editor | null = null;

function TestEditor({ content = '<p>Hello</p>' }: { content?: string | object }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      TextStyle,
      ParagraphStyle,
      TableOfContents,
    ] as AnyExtension[],
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

describe('Heading id rendering in DOM', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('renders id attribute on heading after setContent with anchor', async () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Introduction' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text.' }],
        },
      ],
    };

    render(<TestEditor content={doc} />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    // Simulate what assignHeadingAnchors does
    const entries = extractHeadings(doc);
    const docWithAnchors = assignHeadingAnchors(doc, entries);

    // Set content via editor (simulating updateContent + sync)
    act(() => {
      testEditor!.commands.setContent(docWithAnchors, { emitUpdate: false });
    });

    await waitFor(() => {
      const html = testEditor!.getHTML();
      expect(html).toContain('id="introduction"');
      expect(html).toContain('<h1');
    });
  });

  it('renders id attribute on multiple headings', async () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter One' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section A' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter Two' }] },
      ],
    };

    render(<TestEditor content={doc} />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    const entries = extractHeadings(doc);
    const docWithAnchors = assignHeadingAnchors(doc, entries);

    act(() => {
      testEditor!.commands.setContent(docWithAnchors, { emitUpdate: false });
    });

    await waitFor(() => {
      const html = testEditor!.getHTML();
      expect(html).toContain('id="chapter-one"');
      expect(html).toContain('id="section-a"');
      expect(html).toContain('id="chapter-two"');
    });
  });
});

describe('TOC hyperlink integration', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('renders TOC links as anchor tags with correct href', async () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Introduction' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text.' }],
        },
      ],
    };

    // Generate TOC
    const entries = extractHeadings(doc);
    expect(entries.length).toBe(1);
    expect(entries[0].anchorId).toBe('introduction');

    // Build TOC content and assign anchors
    const tocContent = buildTocContent(entries);
    const wrapped = wrapTocInContainer(tocContent);
    const docWithAnchors = assignHeadingAnchors(doc, entries);

    // Create the full document: TOC + original content with anchors
    const fullDoc = {
      type: 'doc',
      content: [wrapped, ...(docWithAnchors.content as unknown[])],
    };

    render(<TestEditor content={fullDoc} />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    await waitFor(() => {
      const html = testEditor!.getHTML();
      // The TOC link should have the correct href
      expect(html).toContain('href="#introduction"');
      // The heading should have the id
      expect(html).toContain('id="introduction"');
    });
  });

  it('renders multiple TOC links with correct anchors', async () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter One' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section A' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter Two' }] },
      ],
    };

    const entries = extractHeadings(doc);
    const tocContent = buildTocContent(entries);
    const wrapped = wrapTocInContainer(tocContent);
    const docWithAnchors = assignHeadingAnchors(doc, entries);

    const fullDoc = {
      type: 'doc',
      content: [wrapped, ...(docWithAnchors.content as unknown[])],
    };

    render(<TestEditor content={fullDoc} />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    await waitFor(() => {
      const html = testEditor!.getHTML();
      expect(html).toContain('href="#chapter-one"');
      expect(html).toContain('href="#section-a"');
      expect(html).toContain('href="#chapter-two"');
    });
  });

  it('renders TOC links as <a> tags', async () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
      ],
    };

    const entries = extractHeadings(doc);
    const tocContent = buildTocContent(entries);
    const wrapped = wrapTocInContainer(tocContent);
    const docWithAnchors = assignHeadingAnchors(doc, entries);

    const fullDoc = {
      type: 'doc',
      content: [wrapped, ...(docWithAnchors.content as unknown[])],
    };

    render(<TestEditor content={fullDoc} />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    await waitFor(() => {
      const html = testEditor!.getHTML();
      // Should contain an <a> tag with href
      expect(html).toContain('href="#intro"');
      expect(html).toContain('<a');
    });
  });
});
