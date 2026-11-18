// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDocumentText, sanitizeFileName, titleFromFileName } from './documentFile';
import { blobToBase64, getDesktopBridge, isDesktop, saveBlob } from './desktop';

const validDoc = {
  id: 'doc-1',
  title: 'Test',
  settings: { pageFormat: 'A4' },
  content: { type: 'doc', content: [] },
};

afterEach(() => {
  delete window.simpleDocsDesktop;
  vi.restoreAllMocks();
});

describe('parseDocumentText', () => {
  it('accepts a current content document', () => {
    expect(parseDocumentText(JSON.stringify(validDoc))).toEqual(validDoc);
  });

  it('accepts a legacy pages[] document', () => {
    const legacy = { ...validDoc, content: undefined, pages: [{ id: 'p1' }] };
    expect(parseDocumentText(JSON.stringify(legacy))).not.toBeNull();
  });

  it('rejects invalid JSON', () => {
    expect(parseDocumentText('{not json')).toBeNull();
  });

  it('rejects JSON that is not a document', () => {
    expect(parseDocumentText(JSON.stringify({ hello: 'world' }))).toBeNull();
    expect(parseDocumentText(JSON.stringify({ id: 'x', settings: {} }))).toBeNull();
    expect(parseDocumentText('null')).toBeNull();
  });
});

describe('titleFromFileName', () => {
  it('derives a title from a saved filename', () => {
    expect(titleFromFileName('Quarterly Report.sdjson')).toBe('Quarterly Report');
    expect(titleFromFileName('letter.JSON')).toBe('letter');
    expect(titleFromFileName('My_Notes.sdjson')).toBe('My Notes');
  });

  it('ignores default or empty names', () => {
    expect(titleFromFileName('Untitled_Document.sdjson')).toBeNull();
    expect(titleFromFileName('Untitled.sdjson')).toBeNull();
    expect(titleFromFileName('.sdjson')).toBeNull();
  });
});

describe('sanitizeFileName', () => {
  it('strips path separators and unsafe characters', () => {
    expect(sanitizeFileName('Report: Q1/Q2 "Draft"')).toBe('Report_Q1_Q2_Draft');
  });

  it('keeps safe names and falls back to Untitled', () => {
    expect(sanitizeFileName('my-doc_2026')).toBe('my-doc_2026');
    expect(sanitizeFileName('   ')).toBe('Untitled');
  });
});

describe('desktop bridge adapter', () => {
  it('reports web mode when the preload API is absent', () => {
    expect(isDesktop()).toBe(false);
    expect(getDesktopBridge()).toBeNull();
  });

  it('detects the desktop bridge', () => {
    window.simpleDocsDesktop = {
      isDesktop: true,
      platform: 'win32',
      getVersion: vi.fn(),
      openDocument: vi.fn(),
      saveFile: vi.fn(),
      onOpenDocument: vi.fn(),
      onCommand: vi.fn(),
      rendererReady: vi.fn(),
    };
    expect(isDesktop()).toBe(true);
  });

  it('saves through the native bridge on desktop', async () => {
    const saveFile = vi.fn().mockResolvedValue({ canceled: false, name: 'Doc.sdjson' });
    window.simpleDocsDesktop = {
      isDesktop: true,
      platform: 'win32',
      getVersion: vi.fn(),
      openDocument: vi.fn(),
      saveFile,
      onOpenDocument: vi.fn(),
      onCommand: vi.fn(),
      rendererReady: vi.fn(),
    };

    const outcome = await saveBlob(new Blob(['{}'], { type: 'application/json' }), {
      suggestedName: 'Doc.sdjson',
      filters: [{ name: 'SimpleDocs Document', extensions: ['sdjson'] }],
    });

    expect(outcome).toEqual({ saved: true, name: 'Doc.sdjson', path: undefined });
    expect(saveFile).toHaveBeenCalledOnce();
    expect(saveFile.mock.calls[0][0]).toMatchObject({ suggestedName: 'Doc.sdjson' });
    expect(typeof saveFile.mock.calls[0][0].base64).toBe('string');
  });

  it('reports cancellation without throwing', async () => {
    window.simpleDocsDesktop = {
      isDesktop: true,
      platform: 'win32',
      getVersion: vi.fn(),
      openDocument: vi.fn(),
      saveFile: vi.fn().mockResolvedValue({ canceled: true }),
      onOpenDocument: vi.fn(),
      onCommand: vi.fn(),
      rendererReady: vi.fn(),
    };

    const outcome = await saveBlob(new Blob(['{}']), { suggestedName: 'Doc.sdjson' });
    expect(outcome.saved).toBe(false);
  });

  it('round-trips a blob to base64', async () => {
    const base64 = await blobToBase64(new Blob(['SimpleDocs']));
    expect(Buffer.from(base64, 'base64').toString('utf-8')).toBe('SimpleDocs');
  });
});
