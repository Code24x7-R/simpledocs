// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for Google Picker API wrapper.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock driveAuth
vi.mock('./driveAuth', () => ({
  requestAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
}));

/** Data passed to the picker callback. */
interface PickerCallbackData {
  action: string;
  docs: Array<{ id: string; name: string; url: string; mimeType: string }>;
}

/** A configured DocsView (chainable, all methods return this). */
interface DocsView {
  setIncludeFolders(): DocsView;
  setMimeTypes(): DocsView;
  setSelectFolderEnabled(): DocsView;
  setParent(): DocsView;
}

/** Mutable state shared across all builder instances in a test. */
interface PickerMockState {
  lastCallback: ((data: PickerCallbackData) => void) | null;
  builtCount: number;
  visibleCalled: boolean;
  lastOAuthToken: string;
  lastDeveloperKey: string;
  lastTitle: string;
  views: DocsView[];
  features: string[];
}

/** Picker API globals attached to window. */
interface GooglePickerGlobals {
  gapi: { load: (api: string, config: { callback: () => void }) => void };
  google: {
    picker: {
      Action: { PICKED: string; CANCEL: string };
      Feature: { MULTISELECT_ENABLED: string };
      PickerBuilder: () => MockBuilder;
      DocsView: () => DocsView;
    };
  };
}

/** Mock builder that records configuration on a shared state object. */
class MockBuilder {
  constructor(private state: PickerMockState) {}
  setOAuthToken(token: string) {
    this.state.lastOAuthToken = token;
    return this;
  }
  setDeveloperKey(key: string) {
    this.state.lastDeveloperKey = key;
    return this;
  }
  setTitle(title: string) {
    this.state.lastTitle = title;
    return this;
  }
  setCallback(cb: (data: PickerCallbackData) => void) {
    this.state.lastCallback = cb;
    return this;
  }
  addView(view: DocsView) {
    this.state.views.push(view);
    return this;
  }
  enableFeature(feature: string) {
    this.state.features.push(feature);
    return this;
  }
  build() {
    this.state.builtCount++;
    return {
      setVisible: vi.fn((visible: boolean) => {
        if (visible) this.state.visibleCalled = true;
      }),
    };
  }
}

class MockDocsView implements DocsView {
  setIncludeFolders() { return this; }
  setMimeTypes() { return this; }
  setSelectFolderEnabled() { return this; }
  setParent() { return this; }
}

/**
 * Create a fresh mock state and factory functions for the Google Picker API.
 * All builder instances share the same state so tests can assert on the
 * final configuration and invoke the captured callback.
 */
function createPickerMock() {
  const state: PickerMockState = {
    lastCallback: null,
    builtCount: 0,
    visibleCalled: false,
    lastOAuthToken: '',
    lastDeveloperKey: '',
    lastTitle: '',
    views: [],
    features: [],
  };

  return {
    state,
    MockBuilder: () => new MockBuilder(state),
    MockDocsView: () => new MockDocsView(),
  };
}

/**
 * Flush all pending microtasks so the async picker setup completes.
 * The picker chain (load script → load API → request token → build) is
 * promise-based and resolves on microtask ticks.
 */
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('pickerApi', () => {
  let mock: ReturnType<typeof createPickerMock>;

  beforeEach(() => {
    const w = window as unknown as Partial<GooglePickerGlobals>;
    delete w.google;
    delete w.gapi;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Sets up google.picker and gapi globals to simulate a loaded Picker API.
   * gapi.load fires its callback immediately so the picker is ready.
   */
  function setupGoogleReady() {
    mock = createPickerMock();

    const w = window as unknown as GooglePickerGlobals;
    w.gapi = {
      load: vi.fn((_api: string, config: { callback: () => void }) => {
        config.callback();
      }),
    };

    w.google = {
      picker: {
        Action: { PICKED: 'picked', CANCEL: 'cancel' },
        Feature: { MULTISELECT_ENABLED: 'multiselectEnabled' },
        PickerBuilder: vi.fn(() => mock.MockBuilder()),
        DocsView: vi.fn(() => mock.MockDocsView()),
      },
    };

    return mock;
  }

  describe('openPicker', () => {
    it('returns selected docs when user picks a document', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker();

      // Wait for the async picker setup to complete
      await flushMicrotasks();

      const pickedDocs = [
        { id: 'doc1', name: 'Test.sdjson', url: '', mimeType: 'application/vnd.simpledocs+json' },
      ];
      mock.state.lastCallback!({ action: 'picked', docs: pickedDocs });

      const result = await promise;
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('doc1');
      expect(result[0].name).toBe('Test.sdjson');
    });

    it('returns empty array when user cancels', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker();

      await flushMicrotasks();

      mock.state.lastCallback!({ action: 'cancel', docs: [] });

      const result = await promise;
      expect(result).toEqual([]);
    });

    it('sets OAuth token from requestAccessToken', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker();

      await flushMicrotasks();

      mock.state.lastCallback!({ action: 'picked', docs: [] });
      await promise;

      expect(mock.state.lastOAuthToken).toBe('mock-access-token');
    });

    it('builds and shows the picker dialog', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker();

      await flushMicrotasks();

      mock.state.lastCallback!({ action: 'picked', docs: [] });
      await promise;

      expect(mock.state.builtCount).toBe(1);
      expect(mock.state.visibleCalled).toBe(true);
    });

    it('configures a DocsView with folders enabled by default', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker();

      await flushMicrotasks();

      mock.state.lastCallback!({ action: 'picked', docs: [] });
      await promise;

      expect(mock.state.views).toHaveLength(1);
      expect(window.google!.picker.DocsView).toHaveBeenCalled();
    });

    it('adds only one view when showFolders is false', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker({ showFolders: false });

      await flushMicrotasks();

      mock.state.lastCallback!({ action: 'picked', docs: [] });
      await promise;

      expect(mock.state.views).toHaveLength(1);
    });

    it('enables multiselect and returns multiple docs', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker({ multiselect: true });

      await flushMicrotasks();

      const pickedDocs = [
        { id: 'doc1', name: 'A.sdjson', url: '', mimeType: '' },
        { id: 'doc2', name: 'B.sdjson', url: '', mimeType: '' },
      ];
      mock.state.lastCallback!({ action: 'picked', docs: pickedDocs });

      const result = await promise;
      expect(result).toHaveLength(2);
      expect(mock.state.features).toContain('multiselectEnabled');
    });

    it('sets custom title on the picker', async () => {
      setupGoogleReady();

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker({ title: 'Choose a Document' });

      await flushMicrotasks();

      mock.state.lastCallback!({ action: 'picked', docs: [] });
      await promise;

      expect(mock.state.lastTitle).toBe('Choose a Document');
    });

    it('does not create a script tag when google.picker already exists', async () => {
      setupGoogleReady();

      const createElementSpy = vi.spyOn(document, 'createElement');

      const { openPicker } = await import('./pickerApi');
      const promise = openPicker();

      await flushMicrotasks();

      mock.state.lastCallback!({ action: 'picked', docs: [] });
      await promise;

      const scriptCalls = createElementSpy.mock.calls.filter((c) => c[0] === 'script');
      expect(scriptCalls).toHaveLength(0);

      createElementSpy.mockRestore();
    });
  });
});
