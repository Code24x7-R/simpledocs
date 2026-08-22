import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { ParagraphStyle } from './ParagraphStyle';
import { TableOfContents, TocEntry } from './TableOfContents';
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
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      TextStyle,
      ParagraphStyle,
      TableOfContents,
      TocEntry,
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

describe('TOC navigation building blocks', () => {
  beforeEach(() => {
    testEditor = null;
  });

  it('posAtDOM resolves the heading position so navigation can target it', async () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, id: 'introduction' },
          content: [{ type: 'text', text: 'Introduction' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some text here.' }],
        },
      ],
    };

    render(<TestEditor content="<p>placeholder</p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      testEditor!.commands.setContent(doc, { emitUpdate: false });
    });

    const ed = document.querySelector('.tiptap') as HTMLElement;
    const h1 = ed.querySelector('h1') as HTMLElement;
    expect(h1).not.toBeNull();

    // posAtDOM must return a valid, in-range position for the heading DOM node.
    const pos = testEditor!.view.posAtDOM(h1, 0);
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(pos).toBeLessThan(testEditor!.state.doc.content.size);

    // Applying the selection at that position lands the cursor on the heading.
    act(() => {
      testEditor!.chain().setTextSelection(pos).run();
    });

    // The selection position must fall within the heading's span in the doc.
    const selFrom = testEditor!.state.selection.from;
    let found = false;
    testEditor!.state.doc.descendants((node, nodeStart) => {
      if (
        node.type.name === 'heading' &&
        node.textContent === 'Introduction' &&
        selFrom >= nodeStart &&
        selFrom <= nodeStart + node.nodeSize
      ) {
        found = true;
        return false;
      }
      return true;
    });
    expect(found).toBe(true);
  });

  it('TOC link href matches the heading id they point to', async () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Introduction' }],
        },
      ],
    };

    const entries = extractHeadings(doc);
    const wrapped = wrapTocInContainer(buildTocContent(entries));
    const docWithAnchors = assignHeadingAnchors(doc, entries);
    const fullDoc: Record<string, unknown> = {
      type: 'doc',
      content: [wrapped, ...(docWithAnchors.content as Record<string, unknown>[])],
    };

    render(<TestEditor content="<p>placeholder</p>" />);
    await waitFor(() => expect(testEditor).not.toBeNull());

    act(() => {
      testEditor!.commands.setContent(fullDoc, { emitUpdate: false });
    });

    const ed = document.querySelector('.tiptap') as HTMLElement;
    const link = ed.querySelector('.toc-entry-link') as HTMLAnchorElement;
    const heading = ed.querySelector('h1') as HTMLElement;

    expect(link.getAttribute('href')).toBe(`#${heading.id}`);
    expect(heading.id).toBe('introduction');
  });
});
