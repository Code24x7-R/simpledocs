// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  convertToPdfmake,
  type TiptapNode,
  type PageSetup,
} from './pdfmakeConverter';

const defaultPageSetup: PageSetup = {
  pageFormat: 'A4',
  orientation: 'portrait',
  margins: { top: '25.4mm', bottom: '25.4mm', left: '25.4mm', right: '25.4mm' },
  header: { enabled: false, content: '' },
  footer: { enabled: false, showPageNumbers: false },
  title: 'Test Doc',
};

function makeDoc(content: TiptapNode[]): TiptapNode {
  return { type: 'doc', content };
}

describe('pdfmakeConverter', () => {
  describe('document structure', () => {
    it('creates a doc with A4 portrait defaults', () => {
      const doc = convertToPdfmake(makeDoc([]), defaultPageSetup);
      expect(doc.pageSize).toBe('A4');
      expect(doc.pageOrientation).toBe('portrait');
      expect(doc.pageMargins).toEqual([25.4, 25.4, 25.4, 25.4]);
      expect(doc.defaultStyle).toEqual({ font: 'Arial' });
    });

    it('creates a doc with Letter landscape', () => {
      const setup = { ...defaultPageSetup, pageFormat: 'Letter' as const, orientation: 'landscape' as const };
      const doc = convertToPdfmake(makeDoc([]), setup);
      expect(doc.pageSize).toBe('LETTER');
      expect(doc.pageOrientation).toBe('landscape');
    });

    it('parses inch margins correctly', () => {
      const setup = {
        ...defaultPageSetup,
        margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
      };
      const doc = convertToPdfmake(makeDoc([]), setup);
      // 1 inch = 25.4mm
      expect(doc.pageMargins).toEqual([25.4, 25.4, 25.4, 25.4]);
    });
  });

  describe('paragraph', () => {
    it('converts a simple paragraph with text', () => {
      const doc = convertToPdfmake(
        makeDoc([{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }]),
        defaultPageSetup
      );
      expect(doc.content).toHaveLength(1);
      const para = doc.content[0] as { text: unknown; margin: number[] };
      expect(para.text).toEqual([{ text: 'Hello world' }]);
      expect(para.margin).toEqual([0, 0, 0, 4]);
    });

    it('converts an empty paragraph', () => {
      const doc = convertToPdfmake(
        makeDoc([{ type: 'paragraph', content: [] }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: string };
      expect(para.text).toBe('');
    });
  });

  describe('marks', () => {
    it('applies bold mark', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bold', marks: [{ type: 'bold' }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ text: string; bold: boolean }> };
      expect(para.text[0].bold).toBe(true);
    });

    it('applies italic mark', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Italic', marks: [{ type: 'italic' }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ text: string; italics: boolean }> };
      expect(para.text[0].italics).toBe(true);
    });

    it('applies underline mark', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Underline', marks: [{ type: 'underline' }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ text: string; underline: boolean }> };
      expect(para.text[0].underline).toBe(true);
    });

    it('applies strike mark', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Strike', marks: [{ type: 'strike' }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ text: string; strike: boolean }> };
      expect(para.text[0].strike).toBe(true);
    });

    it('applies code mark (monospace + bg)', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'code', marks: [{ type: 'code' }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ text: string; font: string; color: string; background: string }> };
      expect(para.text[0].font).toBe('Courier New');
      expect(para.text[0].color).toBe('222222');
      expect(para.text[0].background).toBe('F5F5F5');
    });

    it('applies textStyle mark (fontSize, fontFamily, color)', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'Styled',
            marks: [{ type: 'textStyle', attrs: { fontSize: '18px', fontFamily: 'Arial', color: '#FF0000' } }],
          }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ fontSize: number; font: string; color: string }> };
      // px → pt conversion: 18px * 0.75 = 13.5pt
      expect(para.text[0].fontSize).toBe(13.5);
      expect(para.text[0].font).toBe('Arial');
      expect(para.text[0].color).toBe('FF0000');
    });

    it('converts px to pt for font sizes (12px → 9pt, 16px → 12pt)', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Small', marks: [{ type: 'textStyle', attrs: { fontSize: '12px' } }] },
            { type: 'text', text: 'Large', marks: [{ type: 'textStyle', attrs: { fontSize: '16px' } }] },
          ],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ text: string; fontSize: number }> };
      expect(para.text[0].fontSize).toBe(9);   // 12px → 9pt
      expect(para.text[1].fontSize).toBe(12);  // 16px → 12pt
    });

    it('applies color mark', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Colored', marks: [{ type: 'color', attrs: { color: '#00FF00' } }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ color: string }> };
      expect(para.text[0].color).toBe('00FF00');
    });

    it('applies backgroundColor mark', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Highlight', marks: [{ type: 'backgroundColor', attrs: { color: '#FFFF00' } }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ background: string }> };
      expect(para.text[0].background).toBe('FFFF00');
    });

    it('applies link mark', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'Click me',
            marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
          }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ text: string; link: string; color: string; decoration: string }> };
      expect(para.text[0].link).toBe('https://example.com');
      expect(para.text[0].color).toBe('1E40AF');
      expect(para.text[0].decoration).toBe('underline');
    });

    it('applies multiple marks simultaneously', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'BoldItalic',
            marks: [{ type: 'bold' }, { type: 'italic' }],
          }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ bold: boolean; italics: boolean }> };
      expect(para.text[0].bold).toBe(true);
      expect(para.text[0].italics).toBe(true);
    });

    it('normalizes rgb color values', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'RGB', marks: [{ type: 'color', attrs: { color: 'rgb(255, 128, 0)' } }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ color: string }> };
      expect(para.text[0].color).toBe('ff8000');
    });
  });

  describe('heading', () => {
    it('converts h1 with correct font size', () => {
      const doc = convertToPdfmake(
        makeDoc([{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] }]),
        defaultPageSetup
      );
      const heading = doc.content[0] as { fontSize: number; bold: boolean };
      expect(heading.fontSize).toBe(24);
      expect(heading.bold).toBe(true);
    });

    it('converts h2 with correct font size', () => {
      const doc = convertToPdfmake(
        makeDoc([{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Subtitle' }] }]),
        defaultPageSetup
      );
      const heading = doc.content[0] as { fontSize: number };
      expect(heading.fontSize).toBe(20);
    });

    it('converts h3 with correct font size', () => {
      const doc = convertToPdfmake(
        makeDoc([{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Section' }] }]),
        defaultPageSetup
      );
      const heading = doc.content[0] as { fontSize: number };
      expect(heading.fontSize).toBe(16);
    });
  });

  describe('lists', () => {
    it('converts bulletList', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] },
          ],
        }]),
        defaultPageSetup
      );
      const list = doc.content[0] as { ul: unknown[] };
      expect(list.ul).toHaveLength(2);
    });

    it('converts orderedList', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'orderedList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
          ],
        }]),
        defaultPageSetup
      );
      const list = doc.content[0] as { ol: unknown[] };
      expect(list.ol).toHaveLength(1);
    });

    it('converts taskList with checked and unchecked items', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Todo' }] }] },
          ],
        }]),
        defaultPageSetup
      );
      const list = doc.content[0] as { ul: unknown[] };
      expect(list.ul).toHaveLength(2);
    });
  });

  describe('table', () => {
    it('converts a simple table', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Age' }] }] },
              ],
            },
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alice' }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '30' }] }] },
              ],
            },
          ],
        }]),
        defaultPageSetup
      );
      const table = doc.content[0] as { table: { body: unknown[][] } };
      expect(table.table.body).toHaveLength(2);
      expect(table.table.body[0]).toHaveLength(2);
    });

    it('handles empty table cells', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'table',
          content: [{
            type: 'tableRow',
            content: [{ type: 'tableCell', content: [] }],
          }],
        }]),
        defaultPageSetup
      );
      const table = doc.content[0] as { table: { body: unknown[][] } };
      expect(table.table.body[0][0]).toBe('');
    });
  });

  describe('image', () => {
    it('converts an image node', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,abc123', alt: 'test' },
        }]),
        defaultPageSetup
      );
      const img = doc.content[0] as { image: string };
      expect(img.image).toBe('data:image/png;base64,abc123');
    });

    it('converts an image to use fit with content area dimensions', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,xyz' },
        }]),
        defaultPageSetup
      );
      const img = doc.content[0] as { image: string; fit: [number, number] };
      // fit is set to content area dimensions (pdfmake scales the image to fit)
      expect(img.fit[0]).toBeCloseTo(159.2, 1);
      expect(img.fit[1]).toBeCloseTo(246.2, 1);
    });

    it('sets fit to landscape content area for landscape pages', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,xyz' },
        }]),
        { ...defaultPageSetup, orientation: 'landscape' }
      );
      const img = doc.content[0] as { image: string; fit: [number, number] };
      // Landscape A4: width = 297 - margins, height = 210 - margins
      expect(img.fit[0]).toBeCloseTo(246.2, 1);
      expect(img.fit[1]).toBeCloseTo(159.2, 1);
    });
  });

  describe('blockquote', () => {
    it('converts a blockquote with indented text', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }],
        }]),
        defaultPageSetup
      );
      const bq = doc.content[0] as { margin: number[]; color: string };
      expect(bq.margin[0]).toBe(12);
      expect(bq.color).toBe('6B7280');
    });
  });

  describe('codeBlock', () => {
    it('converts a code block with monospace font', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'codeBlock',
          content: [{ type: 'text', text: 'const x = 1;' }],
        }]),
        defaultPageSetup
      );
      const cb = doc.content[0] as { text: string; font: string; background: string };
      expect(cb.text).toBe('const x = 1;');
      expect(cb.font).toBe('Courier');
      expect(cb.background).toBe('F5F5F5');
    });
  });

  describe('horizontalRule', () => {
    it('converts to a line canvas', () => {
      const doc = convertToPdfmake(
        makeDoc([{ type: 'horizontalRule' }]),
        defaultPageSetup
      );
      const hr = doc.content[0] as { canvas: unknown[] };
      expect(hr.canvas).toHaveLength(1);
    });
  });

  describe('pageBreak', () => {
    it('converts to page break after', () => {
      const doc = convertToPdfmake(
        makeDoc([{ type: 'pageBreak' }]),
        defaultPageSetup
      );
      const pb = doc.content[0] as { pageBreak: string };
      expect(pb.pageBreak).toBe('after');
    });
  });

  describe('templateField', () => {
    it('converts a template field node', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'templateField',
          attrs: { id: 'name', label: 'Full Name' },
        }]),
        defaultPageSetup
      );
      const tf = doc.content[0] as { text: string; color: string };
      expect(tf.text).toBe('{{Full Name}}');
      expect(tf.color).toBe('6B7280');
    });
  });

  describe('hardBreak', () => {
    it('converts to newline text', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line 1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Line 2' },
          ],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: unknown[] };
      expect(para.text).toHaveLength(3);
    });
  });

  describe('header and footer', () => {
    it('adds a header when enabled', () => {
      const setup = {
        ...defaultPageSetup,
        header: { enabled: true, content: 'Document: {title}' },
        title: 'My Report',
      };
      const doc = convertToPdfmake(makeDoc([]), setup);
      expect(doc.header).toBeDefined();
      // Call the header function to verify it replaces {title}
      const headerResult = (doc.header as () => { text: string })();
      expect(headerResult.text).toBe('Document: My Report');
    });

    it('adds a footer with page numbers when enabled', () => {
      const setup = {
        ...defaultPageSetup,
        footer: { enabled: true, showPageNumbers: true },
      };
      const doc = convertToPdfmake(makeDoc([]), setup);
      expect(doc.footer).toBeDefined();
      const footerResult = (doc.footer as (c: number, t: number) => { text: string })(2, 5);
      expect(footerResult.text).toBe('Page 2 of 5');
    });

    it('adds footer without page numbers when disabled', () => {
      const setup = {
        ...defaultPageSetup,
        footer: { enabled: true, showPageNumbers: false },
      };
      const doc = convertToPdfmake(makeDoc([]), setup);
      const footerResult = (doc.footer as (c: number, t: number) => { text: string })(1, 1);
      expect(footerResult.text).toBe('');
    });

    it('does NOT add header when disabled', () => {
      const setup = { ...defaultPageSetup, header: { enabled: false, content: '' } };
      const doc = convertToPdfmake(makeDoc([]), setup);
      expect(doc.header).toBeUndefined();
    });

    it('does NOT add footer when disabled', () => {
      const setup = { ...defaultPageSetup, footer: { enabled: false, showPageNumbers: false } };
      const doc = convertToPdfmake(makeDoc([]), setup);
      expect(doc.footer).toBeUndefined();
    });
  });

  describe('color normalization', () => {
    it('strips # from hex colors', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Test', marks: [{ type: 'color', attrs: { color: '#123456' } }] }],
        }]),
        defaultPageSetup
      );
      const para = doc.content[0] as { text: Array<{ color: string }> };
      expect(para.text[0].color).toBe('123456');
    });
  });
});
