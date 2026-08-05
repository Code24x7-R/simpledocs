// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach } from 'vitest';
import {
  convertToPdfmake,
  setImageDimensions,
  calculateDisplayDimensions,
  PX_TO_MM,
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
  // Set natural dimensions for test images so scaling calculations work
  beforeEach(() => {
    setImageDimensions({
      'data:image/png;base64,abc123': { width: 800, height: 600 },
      'data:image/png;base64,xyz': { width: 1000, height: 500 },
    });
  });
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

    it('converts an image with explicit width smaller than content area at natural size', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,xyz', width: 300 },
        }]),
        defaultPageSetup
      );
      const img = doc.content[0] as { image: string; width: number; height: number };
      // Natural size: 300px * 0.26458 = 79.37mm wide (smaller than 159.2mm content area)
      // So displayed at natural size (no scaling up)
      expect(img.width).toBeCloseTo(79.4, 1);
      // Height from natural aspect ratio: 500 * (300/1000) = 150px = 39.69mm
      expect(img.height).toBeCloseTo(39.7, 1);
    });

    it('converts a large image to fit within content area', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,xyz', width: 500, height: 400 },
        }]),
        defaultPageSetup
      );
      const img = doc.content[0] as { image: string; width: number; height: number };
      // 500px * 0.26458 = 132.3mm (smaller than 159.2mm content area)
      // So displayed at natural size (no scaling up)
      expect(img.width).toBeCloseTo(132.3, 1);
      expect(img.height).toBeCloseTo(105.8, 1);
    });

    it('scales a wide natural image down to fit content area', () => {
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,xyz' },
        }]),
        defaultPageSetup
      );
      const img = doc.content[0] as { image: string; width: number; height: number };
      // Natural 1000x500 → 264.58mm wide (exceeds 159.2mm content area)
      // Scaled down: width = 159.2mm, height = 132.29 * (159.2/264.58) = 79.6mm
      expect(img.width).toBeCloseTo(159.2, 1);
      expect(img.height).toBeCloseTo(79.6, 1);
    });

    it('scales a tall image down to fit by height', () => {
      // Set natural dimensions for a tall image (aspect ratio 0.5)
      setImageDimensions({ 'data:image/png;base64,tall': { width: 500, height: 1000 } });
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,tall' },
        }]),
        defaultPageSetup
      );
      const img = doc.content[0] as { image: string; width: number; height: number };
      // Natural: 132.3mm wide (fits), 264.58mm tall (exceeds 246.2mm)
      // Scaled down: height = 246.2mm, width = 132.3 * (246.2/264.58) = 123.1mm
      expect(img.height).toBeCloseTo(246.2, 1);
      expect(img.width).toBeCloseTo(123.1, 1);
    });

    it('displays small images at natural size without scaling up', () => {
      // Small image that should NOT be scaled up to fill content area
      setImageDimensions({ 'data:image/png;base64,small': { width: 200, height: 150 } });
      const doc = convertToPdfmake(
        makeDoc([{
          type: 'image',
          attrs: { src: 'data:image/png;base64,small' },
        }]),
        defaultPageSetup
      );
      const img = doc.content[0] as { image: string; width: number; height: number };
      // Natural: 200 * 0.26458 = 52.9mm (smaller than 159.2mm)
      // Should display at natural size, not scaled up
      expect(img.width).toBeCloseTo(52.9, 1);
      expect(img.height).toBeCloseTo(39.7, 1);
    });
  });

  describe('calculateDisplayDimensions', () => {
    it('converts pixels to mm at 96 DPI', () => {
      expect(PX_TO_MM).toBeCloseTo(0.26458, 4);
    });

    it('returns natural size when image is smaller than container', () => {
      const result = calculateDisplayDimensions(200, 150, 159.2, 246.2);
      expect(result.width).toBeCloseTo(200 * PX_TO_MM, 1);
      expect(result.height).toBeCloseTo(150 * PX_TO_MM, 1);
    });

    it('scales down wide images to fit container width', () => {
      const result = calculateDisplayDimensions(1000, 500, 159.2, 246.2);
      expect(result.width).toBeCloseTo(159.2, 1);
      expect(result.height).toBeCloseTo(79.6, 1);
    });

    it('scales down tall images to fit container height', () => {
      const result = calculateDisplayDimensions(500, 1000, 159.2, 246.2);
      expect(result.height).toBeCloseTo(246.2, 1);
      expect(result.width).toBeCloseTo(123.1, 1);
    });

    it('does not scale up small images', () => {
      const result = calculateDisplayDimensions(100, 100, 159.2, 246.2);
      expect(result.width).toBeCloseTo(100 * PX_TO_MM, 1);
      expect(result.height).toBeCloseTo(100 * PX_TO_MM, 1);
    });

    it('uses default 800x400 when dimensions are zero', () => {
      const result = calculateDisplayDimensions(0, 0, 159.2, 246.2);
      // When dimensions are zero, default to 800x400 clamped to container
      // Width clamped from 211.67 to 159.2, height clamped from 105.83 to 105.83 (under 246.2)
      expect(result.width).toBeCloseTo(159.2, 1);
      expect(result.height).toBeCloseTo(400 * PX_TO_MM, 1);
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
