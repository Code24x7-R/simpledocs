// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi } from 'vitest';

// Mock mammoth before importing the module
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(),
  },
}));

import mammoth from 'mammoth';
import { importWordDocument } from './wordImport';

type MockFn = ReturnType<typeof vi.fn>;
const mockConvertToHtml = mammoth.convertToHtml as unknown as MockFn;

function createMockFile(name: string): File {
  const file = new File(['dummy content'], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  // jsdom File doesn't implement arrayBuffer, define it
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.resolve(new ArrayBuffer(8)),
    writable: true,
    configurable: true,
  });
  return file;
}

describe('wordImport', () => {
  it('converts docx file to HTML', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<p>Hello World</p>',
      messages: [],
    });

    const result = await importWordDocument(createMockFile('test.docx'));

    expect(result.html).toBe('<p>Hello World</p>');
    expect(result.messages).toEqual([]);
    expect(mammoth.convertToHtml).toHaveBeenCalledWith(
      { arrayBuffer: expect.any(ArrayBuffer) },
      expect.objectContaining({ styleMap: expect.any(Array) })
    );
  });

  it('returns messages for unsupported features', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<h1>Title</h1><p>Content</p>',
      messages: [
        { type: 'warning', message: 'Unsupported feature: embedded chart' },
      ],
    });

    const result = await importWordDocument(createMockFile('complex.docx'));
    expect(result.html).toBe('<h1>Title</h1><p>Content</p>');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].type).toBe('warning');
  });

  it('maps Word headings to HTML headings', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<h1>Main Heading</h1><h2>Sub Heading</h2><h3>Sub Sub</h3>',
      messages: [],
    });

    const result = await importWordDocument(createMockFile('headings.docx'));
    expect(result.html).toContain('<h1>');
    expect(result.html).toContain('<h2>');
    expect(result.html).toContain('<h3>');
  });

  it('propagates errors from mammoth', async () => {
    mockConvertToHtml.mockRejectedValue(new Error('Invalid docx file'));

    await expect(importWordDocument(createMockFile('corrupt.docx'))).rejects.toThrow(
      'Invalid docx file'
    );
  });

  it('preserves Word page breaks from mammoth', async () => {
    mockConvertToHtml.mockResolvedValue({
      value: '<h1>Title</h1><div data-type="page-break"></div><p>Next page</p>',
      messages: [],
    });

    const result = await importWordDocument(createMockFile('pagebreaks.docx'));
    expect(result.html).toContain('data-type="page-break"');
  });
});
