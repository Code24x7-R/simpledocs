// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('./wordImportStore', () => ({
  importWordIntoStore: vi.fn().mockResolvedValue(undefined),
  importWordFileIntoStore: vi.fn(),
}));

import { useDocStore, type DocState } from '../store/useDocStore';
import { openRecentDocument } from './desktopFiles';
import { importWordIntoStore } from './wordImportStore';
import type { DesktopBridge } from '../types/desktop';

function makeDoc(title = 'Recent Doc'): DocState {
  return {
    id: 'recent-1',
    title,
    createdAt: '2026-11-18T00:00:00Z',
    updatedAt: '2026-11-18T00:00:00Z',
    totalPages: 1,
    settings: {
      pageFormat: 'A4',
      orientation: 'portrait',
      margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
      header: { enabled: false, content: '' },
      footer: { enabled: false, showPageNumbers: false },
      pageGap: 24,
      orphans: 2,
      widows: 2,
      defaultNormalEditorMode: false,
    },
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  };
}

function installBridge(openRecent: DesktopBridge['openRecent']): void {
  window.simpleDocsDesktop = {
    isDesktop: true,
    platform: 'win32',
    getVersion: vi.fn(),
    openDocument: vi.fn(),
    openRecent,
    saveFile: vi.fn(),
    onOpenDocument: vi.fn(),
    onCommand: vi.fn(),
    rendererReady: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
  useDocStore.setState({ mruList: [] });
});

afterEach(() => {
  delete window.simpleDocsDesktop;
  vi.restoreAllMocks();
});

describe('openRecentDocument', () => {
  it('loads a document and records its path in MRU', async () => {
    const doc = makeDoc('Recent Doc');
    installBridge(vi.fn().mockResolvedValue({
      status: 'ok',
      document: { kind: 'sdjson', name: 'Recent Doc.sdjson', path: 'C:/Docs/Recent Doc.sdjson', text: JSON.stringify(doc) },
    }));

    const outcome = await openRecentDocument('C:/Docs/Recent Doc.sdjson');

    expect(outcome).toBe('opened');
    expect(useDocStore.getState().docState.title).toBe('Recent Doc');
    expect(useDocStore.getState().mruList[0]).toMatchObject({
      name: 'Recent Doc.sdjson',
      path: 'C:/Docs/Recent Doc.sdjson',
    });
  });

  it('adopts the filename when the remembered title is untitled', async () => {
    const doc = makeDoc('Untitled Document');
    installBridge(vi.fn().mockResolvedValue({
      status: 'ok',
      document: { kind: 'sdjson', name: 'Adopted Name.sdjson', path: 'C:/Docs/Adopted Name.sdjson', text: JSON.stringify(doc) },
    }));

    await openRecentDocument('C:/Docs/Adopted Name.sdjson');
    expect(useDocStore.getState().docState.title).toBe('Adopted Name');
  });

  it('reports a missing file', async () => {
    installBridge(vi.fn().mockResolvedValue({ status: 'missing' }));
    await expect(openRecentDocument('C:/Docs/gone.sdjson')).resolves.toBe('missing');
  });

  it('reports a forbidden path', async () => {
    installBridge(vi.fn().mockResolvedValue({ status: 'forbidden' }));
    await expect(openRecentDocument('C:/Windows/System32/config')).resolves.toBe('forbidden');
  });

  it('reports invalid document JSON', async () => {
    installBridge(vi.fn().mockResolvedValue({
      status: 'ok',
      document: { kind: 'sdjson', name: 'bad.sdjson', path: 'C:/Docs/bad.sdjson', text: '{"hello":1}' },
    }));
    await expect(openRecentDocument('C:/Docs/bad.sdjson')).resolves.toBe('invalid');
  });

  it('imports a .docx recent file', async () => {
    installBridge(vi.fn().mockResolvedValue({
      status: 'ok',
      document: { kind: 'docx', name: 'Letter.docx', path: 'C:/Docs/Letter.docx', base64: 'AAEC' },
    }));

    await expect(openRecentDocument('C:/Docs/Letter.docx')).resolves.toBe('opened');
    expect(importWordIntoStore).toHaveBeenCalledWith({
      name: 'Letter.docx',
      path: 'C:/Docs/Letter.docx',
      arrayBuffer: expect.any(ArrayBuffer),
    });
  });

  it('does nothing on the web build', async () => {
    await expect(openRecentDocument('C:/Docs/doc.sdjson')).resolves.toBe('unsupported');
  });
});
