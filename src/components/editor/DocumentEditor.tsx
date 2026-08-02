import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useCallback, useRef } from 'react';
import { useDocStore } from '../../store/useDocStore';
import { createExtensions } from '../../extensions';
import { calculateAvailableHeight } from '../../utils/pageOverflow';
import { mmToPx } from '../../utils/unitConversion';

export default function DocumentEditor() {
  const { docState, setEditor, updateContent } = useDocStore();
  const pageBreaksRef = useRef<number[]>([]);

  const editor = useEditor({
    extensions: createExtensions(),
    content: docState.content,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateContent(ed.getJSON());
      checkAndInsertPageBreaks(ed);
    },
  });

  const checkAndInsertPageBreaks = useCallback(
    (ed: any) => {
      // Get page dimensions from settings
      const { settings } = docState;
      const { pageFormat, orientation, margins, header, footer } = settings;

      const fmt = pageFormat === 'A4' ? { w: 210, h: 297 } : { w: 215.9, h: 279.4 };
      const pageHeightPx =
        orientation === 'landscape' ? mmToPx(fmt.w) : mmToPx(fmt.h);

      const marginPx = {
        top: mmToPx(parseFloat(margins.top) || 20),
        bottom: mmToPx(parseFloat(margins.bottom) || 20),
        left: mmToPx(parseFloat(margins.left) || 25),
        right: mmToPx(parseFloat(margins.right) || 25),
      };

      const headerHeight = header.enabled ? mmToPx(10) : 0;
      const footerHeight = footer.enabled && footer.showPageNumbers ? mmToPx(10) : 0;

      const availableHeight = calculateAvailableHeight(
        pageHeightPx,
        marginPx.top,
        marginPx.bottom,
        headerHeight,
        footerHeight
      );

      // Get the editor DOM element
      const editorEl = document.querySelector('.tiptap');
      if (!editorEl) return;

      // Check if content overflows
      if (editorEl.scrollHeight <= availableHeight) {
        return; // No overflow
      }

      // Find block-level elements and their positions
      const blocks = Array.from(
        editorEl.querySelectorAll(
          'p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, pre, table, hr'
        )
      ) as HTMLElement[];

      if (blocks.length === 0) return;

      // Find the last block that fits within the page
      let lastFittingBlock: HTMLElement | null = null;
      for (const block of blocks) {
        const blockBottom = block.offsetTop + block.offsetHeight;
        if (blockBottom <= availableHeight) {
          lastFittingBlock = block;
        } else {
          break;
        }
      }

      if (!lastFittingBlock) return;

      // Find the ProseMirror position for this block
      const pos = ed.view.posAtDOM(lastFittingBlock, 0);
      if (pos < 0) return;

      // Check if there's already a page break at this position
      const hasExistingBreak = pageBreaksRef.current.includes(pos);
      if (hasExistingBreak) return;

      // Insert page break before this block
      ed.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
      pageBreaksRef.current.push(pos);
    },
    [docState]
  );

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  useEffect(() => {
    if (editor && docState.content) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(docState.content)) {
        editor.commands.setContent(docState.content, { emitUpdate: false });
      }
    }
  }, [docState.content, editor]);

  return (
    <div className="h-full overflow-y-auto" id="editor-scroll-container">
      <div
        id="tiptap-editor"
        className="min-h-full"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
