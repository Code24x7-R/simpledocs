// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveDocument, openDocument } from './fileIO';
import type { DocState } from '../store/useDocStore';

describe('fileIO', () => {
  const mockDoc: DocState = {
    id: 'test-123',
    title: 'Test Document',
    createdAt: '2026-08-02T00:00:00Z',
    updatedAt: '2026-08-02T00:00:00Z',
    totalPages: 1,
    settings: {
      pageFormat: 'A4',
      orientation: 'portrait',
      margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
      header: { enabled: true, content: '' },
      footer: { enabled: true, showPageNumbers: true },
      pageGap: 24,
      orphans: 2,
      widows: 2,
    defaultFullBleedMode: false,
    },
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    },
  };

  describe('saveDocument', () => {
    const clickSpy = vi.fn();
    const appendChildSpy = vi.fn();
    const removeChildSpy = vi.fn();
    let anchorMock: HTMLAnchorElement;

    beforeEach(() => {
      anchorMock = {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement;

      vi.spyOn(document, 'createElement').mockReturnValue(anchorMock);
      vi.spyOn(document.body, 'appendChild').mockImplementation(appendChildSpy);
      vi.spyOn(document.body, 'removeChild').mockImplementation(removeChildSpy);

      // jsdom doesn't implement URL.createObjectURL
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('creates a download link with the correct filename', () => {
      saveDocument(mockDoc);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalledWith(anchorMock);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(anchorMock);
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('sanitizes filename from title', () => {
      const docWithSpecialChars = { ...mockDoc, title: 'My/Document: Version 1' };
      saveDocument(docWithSpecialChars);

      expect(anchorMock.download).toBe('My_Document__Version_1.json');
    });
  });

  describe('openDocument', () => {
    it('reads and parses a valid JSON file', async () => {
      const json = JSON.stringify(mockDoc);
      const file = new File([json], 'test.json', { type: 'application/json' });

      const result = await openDocument(file);
      expect(result).toEqual(mockDoc);
    });

    it('rejects invalid JSON', async () => {
      const file = new File(['not valid json'], 'test.json', { type: 'application/json' });
      await expect(openDocument(file)).rejects.toThrow();
    });

    it('rejects JSON missing required fields', async () => {
      const invalidDoc = { title: 'no id field' };
      const file = new File([JSON.stringify(invalidDoc)], 'test.json', { type: 'application/json' });
      await expect(openDocument(file)).rejects.toThrow('Invalid document format');
    });
  });
});
