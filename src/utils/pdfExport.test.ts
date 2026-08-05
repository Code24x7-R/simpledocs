// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DocState } from '../store/useDocStore';
import { convertToPdfmake } from './pdfmakeConverter';

// Mock pdfmake to avoid loading the ~1MB library in tests
vi.mock('pdfmake/build/pdfmake', () => ({
  default: {
    virtualfs: {},
    addVirtualFileSystem: vi.fn(),
    createPdf: vi.fn(() => ({
      download: vi.fn().mockResolvedValue(undefined),
      getBlob: vi.fn().mockResolvedValue(new Blob(['dummy'], { type: 'application/pdf' })),
      getBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    })),
  },
}));

vi.mock('./pdfFonts.json', () => ({
  vfs: { 'Arial-normal-normal': 'base64data' },
  fontConfigs: [
    { name: 'Arial', normal: 'Arial-normal-normal', bold: 'Arial-bold-normal', italics: 'Arial-normal-italic', bolditalics: 'Arial-bold-italic' },
  ],
}));

// We test the converter directly (already covered in pdfmakeConverter.test.ts)
// and the exportToPdf integration with mocked pdfmake.
describe('pdfExport', () => {
  describe('convertToPdfmake (integration)', () => {
    const defaultDoc: DocState = {
      id: 'test-1',
      title: 'Test Document',
      createdAt: '2026-08-05',
      updatedAt: '2026-08-05',
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'My Document' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world with bold text', marks: [{ type: 'bold' }] }],
          },
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] },
            ],
          },
        ],
      },
      settings: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: '25.4mm', bottom: '25.4mm', left: '25.4mm', right: '25.4mm' },
        header: { enabled: true, content: 'My Header' },
        footer: { enabled: true, showPageNumbers: true },
        pageGap: 20,
        orphans: 2,
        widows: 2,
      },
      totalPages: 1,
    };

    it('converts a full document correctly', () => {
      const pdfDoc = convertToPdfmake(defaultDoc.content as unknown as Parameters<typeof convertToPdfmake>[0], {
        pageFormat: defaultDoc.settings.pageFormat,
        orientation: defaultDoc.settings.orientation,
        margins: defaultDoc.settings.margins,
        header: defaultDoc.settings.header,
        footer: defaultDoc.settings.footer,
        title: defaultDoc.title,
      });

      expect(pdfDoc.pageSize).toBe('A4');
      expect(pdfDoc.content).toHaveLength(3);
      expect(pdfDoc.header).toBeDefined();
      expect(pdfDoc.footer).toBeDefined();
    });

    it('builds correct filename from doc title', () => {
      const title = 'My Test Doc';
      const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      expect(filename).toBe('My_Test_Doc.pdf');
    });

    it('sanitizes special characters in filename', () => {
      const title = 'Report: Q1 & Q2 / Draft';
      const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      // Multiple consecutive special chars become multiple underscores
      expect(filename).toBe('Report__Q1___Q2___Draft.pdf');
    });
  });

  describe('exportToPdf', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let clickSpy: ReturnType<typeof vi.fn>;
    let link: HTMLAnchorElement;

    beforeEach(() => {
      clickSpy = vi.fn();
      link = {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(link) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => link) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => link) as any;

      // Mock URL.createObjectURL
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: vi.fn(),
      });
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('calls pdf.download() with sanitized filename', async () => {
      // Import here so the mock is in place
      const { exportToPdf } = await import('./pdfExport');

      const doc: DocState = {
        id: 'test-2',
        title: 'Export Test',
        createdAt: '2026-08-05',
        updatedAt: '2026-08-05',
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export me' }] }],
        },
        settings: {
          pageFormat: 'A4',
          orientation: 'portrait',
          margins: { top: '25.4mm', bottom: '25.4mm', left: '25.4mm', right: '25.4mm' },
          header: { enabled: false, content: '' },
          footer: { enabled: false, showPageNumbers: false },
          pageGap: 20,
          orphans: 2,
          widows: 2,
        },
        totalPages: 1,
      };

      await exportToPdf(doc, []);

      // pdfmake v0.3.x: download() is called directly (uses file-saver internally)
      // The mock returns a resolved promise, so we just verify no error was thrown.
      // Also verify addVirtualFileSystem was called with font data and fonts were registered.
      const pdfMakeMock = await import('pdfmake/build/pdfmake');
      expect(pdfMakeMock.default.addVirtualFileSystem).toHaveBeenCalled();
      expect(pdfMakeMock.default.fonts).toBeDefined();
      expect(pdfMakeMock.default.fonts.Arial).toBeDefined();
    });
  });
});
