// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileLaunch } from './useFileLaunch';
import { useDocStore } from '../store/useDocStore';
import type { DocState } from '../store/useDocStore';

const validDoc: DocState = {
  id: 'file-launch-1',
  title: 'From File',
  createdAt: '2026-08-26T00:00:00Z',
  updatedAt: '2026-08-26T00:00:00Z',
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
    defaultNormalEditorMode: false,
  },
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello from file' }] }],
  },
};

/**
 * Set or clear window.launchQueue. Uses typed access since launchQueue is
 * an experimental API not yet in lib.dom.d.ts (declared in launch-queue.d.ts).
 */
function setLaunchQueue(value: LaunchQueue | undefined): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).launchQueue = value;
}

/** Build a fake FileSystemFileHandle that returns a File with the given text. */
function mockFileHandle(text: string, name: string = 'doc.sdjson'): FileSystemFileHandle {
  return {
    getFile: vi.fn().mockResolvedValue({
      text: () => Promise.resolve(text),
      name,
    }),
  } as unknown as FileSystemFileHandle;
}

describe('useFileLaunch', () => {
  let originalLaunchQueue: LaunchQueue | undefined;

  beforeEach(() => {
    originalLaunchQueue = window.launchQueue;
    useDocStore.setState({ docState: { ...validDoc, id: 'initial' } });
  });

  afterEach(() => {
    // Restore launchQueue to pre-test value (including undefined).
    setLaunchQueue(originalLaunchQueue);
  });

  it('does nothing when launchQueue is not available (plain tab mode)', () => {
    setLaunchQueue(undefined);
    const loadSpy = vi.spyOn(useDocStore.getState(), 'loadDocument');

    renderHook(() => useFileLaunch());

    // No consumer registered, no load called.
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('registers a consumer on launchQueue when available', () => {
    const setConsumer = vi.fn();
    setLaunchQueue({ setConsumer });

    renderHook(() => useFileLaunch());

    expect(setConsumer).toHaveBeenCalledTimes(1);
    expect(typeof setConsumer.mock.calls[0][0]).toBe('function');
  });

  it('loads a valid DocState file into the store', async () => {
    const consumerFn = vi.fn();
    const setConsumer = vi.fn((cb) => {
      consumerFn.mockImplementation(cb);
    });
    setLaunchQueue({ setConsumer });

    // Spy BEFORE render so the hook captures the spied function.
    const loadSpy = vi.spyOn(useDocStore.getState(), 'loadDocument');

    renderHook(() => useFileLaunch());
    expect(setConsumer).toHaveBeenCalled();

    const handle = mockFileHandle(JSON.stringify(validDoc), 'MyLetter.sdjson');

    await act(async () => {
      await consumerFn({ files: [handle], targetURL: 'http://localhost:5137/' });
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-launch-1' }));
    loadSpy.mockRestore();
  });

  it('skips files with an invalid shape (no id)', async () => {
    const consumerFn = vi.fn();
    const setConsumer = vi.fn((cb) => {
      consumerFn.mockImplementation(cb);
    });
    setLaunchQueue({ setConsumer });

    const loadSpy = vi.spyOn(useDocStore.getState(), 'loadDocument');
    renderHook(() => useFileLaunch());

    const invalidDoc = { title: 'No ID', content: {} };
    const handle = mockFileHandle(JSON.stringify(invalidDoc));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      await consumerFn({ files: [handle] });
    });

    expect(loadSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[FileLaunch] Skipped file with invalid document shape:',
      expect.any(String),
    );
    warnSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('skips files that fail to parse as JSON', async () => {
    const consumerFn = vi.fn();
    const setConsumer = vi.fn((cb) => {
      consumerFn.mockImplementation(cb);
    });
    setLaunchQueue({ setConsumer });

    const loadSpy = vi.spyOn(useDocStore.getState(), 'loadDocument');
    renderHook(() => useFileLaunch());

    const handle = mockFileHandle('not valid json{{{');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      await consumerFn({ files: [handle] });
    });

    expect(loadSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[FileLaunch] Failed to open file:',
      expect.any(Error),
    );
    warnSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('accepts legacy pages[] format (no content field)', async () => {
    const consumerFn = vi.fn();
    const setConsumer = vi.fn((cb) => {
      consumerFn.mockImplementation(cb);
    });
    setLaunchQueue({ setConsumer });

    const loadSpy = vi.spyOn(useDocStore.getState(), 'loadDocument');
    renderHook(() => useFileLaunch());

    const legacyDoc = {
      id: 'legacy-1',
      settings: { pageFormat: 'A4', orientation: 'portrait' },
      pages: [{ content: { type: 'doc', content: [] } }],
    };
    const handle = mockFileHandle(JSON.stringify(legacyDoc));

    await act(async () => {
      await consumerFn({ files: [handle] });
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
    loadSpy.mockRestore();
  });

  it('adds the opened file to the MRU list', async () => {
    const consumerFn = vi.fn();
    const setConsumer = vi.fn((cb) => {
      consumerFn.mockImplementation(cb);
    });
    setLaunchQueue({ setConsumer });

    const loadSpy = vi.spyOn(useDocStore.getState(), 'loadDocument');
    const mruSpy = vi.spyOn(useDocStore.getState(), 'addRecentFile');
    renderHook(() => useFileLaunch());

    const docText = JSON.stringify(validDoc);
    const handle = mockFileHandle(docText, 'MyLetter.sdjson');

    await act(async () => {
      await consumerFn({ files: [handle] });
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(mruSpy).toHaveBeenCalledTimes(1);
    expect(mruSpy).toHaveBeenCalledWith('MyLetter.sdjson', docText.length);
    mruSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('handles multiple files from a single launch', async () => {
    const consumerFn = vi.fn();
    const setConsumer = vi.fn((cb) => {
      consumerFn.mockImplementation(cb);
    });
    setLaunchQueue({ setConsumer });

    const loadSpy = vi.spyOn(useDocStore.getState(), 'loadDocument');
    renderHook(() => useFileLaunch());

    const handle1 = mockFileHandle(JSON.stringify({ ...validDoc, id: 'doc-1' }), 'first.sdjson');
    const handle2 = mockFileHandle(JSON.stringify({ ...validDoc, id: 'doc-2' }), 'second.sdjson');

    await act(async () => {
      await consumerFn({ files: [handle1, handle2] });
    });

    expect(loadSpy).toHaveBeenCalledTimes(2);
    loadSpy.mockRestore();
  });
});
