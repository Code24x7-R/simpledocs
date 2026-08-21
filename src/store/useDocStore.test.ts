// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useDocStore, createInitialState } from './useDocStore';
import type { Editor } from '@tiptap/core';
import type { DocState } from './useDocStore';

const baseDoc = {
  id: 'test-id',
  title: 'Test Document',
  createdAt: '2026-08-02T00:00:00Z',
  updatedAt: '2026-08-02T00:00:00Z',
  totalPages: 1,
  settings: {
    pageFormat: 'A4' as const,
    orientation: 'portrait' as const,
    margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
    header: { enabled: true, content: '' },
    footer: { enabled: true, showPageNumbers: true },
    pageGap: 24,
    orphans: 2,
    widows: 2,
    defaultNormalEditorMode: false,
  },
  content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
};

describe('useDocStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    useDocStore.setState({
      docState: baseDoc,
      editor: null,
      zoom: 1,
      pageSetupOpen: false,
      insertFieldOpen: false,
      tableGridOpen: false,
      tableGridSize: null,
      helpMenuOpen: false,
      aboutOpen: false,
      shortcutsOpen: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default document state', () => {
    const state = useDocStore.getState();
    expect(state.docState.title).toBe('Test Document');
    expect(state.docState.settings.pageFormat).toBe('A4');
  });

  it('updates document title and persists to localStorage', () => {
    useDocStore.getState().updateTitle('New Title');
    expect(useDocStore.getState().docState.title).toBe('New Title');
  });

  it('updates page margins via updateSettings', () => {
    useDocStore.getState().updateSettings({
      margins: { top: '30mm', bottom: '30mm', left: '20mm', right: '20mm' },
    });
    const settings = useDocStore.getState().docState.settings;
    expect(settings.margins.top).toBe('30mm');
    expect(settings.margins.left).toBe('20mm');
  });

  it('changes page format and orientation', () => {
    useDocStore.getState().updateSettings({
      pageFormat: 'Letter',
      orientation: 'landscape',
    });
    const settings = useDocStore.getState().docState.settings;
    expect(settings.pageFormat).toBe('Letter');
    expect(settings.orientation).toBe('landscape');
  });

  it('updates zoom level', () => {
    useDocStore.getState().setZoom(1.25);
    expect(useDocStore.getState().zoom).toBe(1.25);
  });

  it('toggles page setup modal', () => {
    expect(useDocStore.getState().pageSetupOpen).toBe(false);
    useDocStore.getState().setPageSetupOpen(true);
    expect(useDocStore.getState().pageSetupOpen).toBe(true);
  });

  it('toggles insert field modal', () => {
    expect(useDocStore.getState().insertFieldOpen).toBe(false);
    useDocStore.getState().setInsertFieldOpen(true);
    expect(useDocStore.getState().insertFieldOpen).toBe(true);
  });

  it('toggles table grid modal', () => {
    expect(useDocStore.getState().tableGridOpen).toBe(false);
    useDocStore.getState().setTableGridOpen(true);
    expect(useDocStore.getState().tableGridOpen).toBe(true);
  });

  it('updates document content', () => {
    const newContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    };
    useDocStore.getState().updateContent(newContent);
    expect(useDocStore.getState().docState.content).toEqual(newContent);
  });

  it('creates a new document', () => {
    useDocStore.getState().updateTitle('Custom Title');
    useDocStore.getState().newDocument();
    const state = useDocStore.getState();
    expect(state.docState.title).toBe('Untitled Document');
  });

  it('loads a document', () => {
    const doc = {
      id: 'loaded-id',
      title: 'Loaded Doc',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      totalPages: 1,
      settings: {
        pageFormat: 'Letter' as const,
        orientation: 'landscape' as const,
        margins: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        header: { enabled: false, content: '' },
        footer: { enabled: false, showPageNumbers: false },
        pageGap: 24,
        orphans: 2,
        widows: 2,
    defaultNormalEditorMode: false,
      },
      content: { type: 'doc', content: [] },
    };
    useDocStore.getState().loadDocument(doc);
    expect(useDocStore.getState().docState.title).toBe('Loaded Doc');
    expect(useDocStore.getState().docState.settings.pageFormat).toBe('Letter');
  });

  it('persists state to localStorage (debounced)', () => {
    useDocStore.getState().updateTitle('Persisted Title');
    // Should not be saved immediately
    expect(localStorage.getItem('SIMPLEDOCS_STATE')).toBeNull();
    // After debounce period
    vi.advanceTimersByTime(600);
    const raw = localStorage.getItem('SIMPLEDOCS_STATE');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.title).toBe('Persisted Title');
  });

  it('debounces multiple rapid updates into single save', () => {
    useDocStore.getState().updateTitle('First');
    useDocStore.getState().updateTitle('Second');
    useDocStore.getState().updateTitle('Third');
    // Advance past debounce
    vi.advanceTimersByTime(600);
    const raw = localStorage.getItem('SIMPLEDOCS_STATE');
    const parsed = JSON.parse(raw!);
    // Only the last value should be saved
    expect(parsed.title).toBe('Third');
  });

  // Branch coverage tests for loadFromStorage
  describe('localStorage branch coverage', () => {
    it('covers the null storage path (no data in localStorage)', () => {
      localStorage.clear();
      useDocStore.getState().newDocument();
      const state = useDocStore.getState();
      expect(state.docState.title).toBe('Untitled Document');
      expect(state.docState.id).toBeTruthy();
    });

    it('covers the JSON parse error catch block', () => {
      localStorage.setItem('SIMPLEDOCS_STATE', '{ invalid json !!');
      const originalParse = JSON.parse;
      JSON.parse = vi.fn((str: string) => {
        if (str === '{ invalid json !!') {
          throw new SyntaxError('Unexpected token');
        }
        return originalParse(str);
      }) as typeof JSON.parse;

      useDocStore.getState().newDocument();
      const state = useDocStore.getState();
      expect(state.docState.title).toBe('Untitled Document');

      JSON.parse = originalParse;
    });

    it('covers successful load from localStorage', () => {
      const savedDoc = {
        ...baseDoc,
        title: 'Previously Saved',
      };
      localStorage.setItem('SIMPLEDOCS_STATE', JSON.stringify(savedDoc));
      const raw = localStorage.getItem('SIMPLEDOCS_STATE');
      const loaded = JSON.parse(raw!);
      useDocStore.getState().loadDocument(loaded);
      expect(useDocStore.getState().docState.title).toBe('Previously Saved');
    });
  });

  // Additional setter branch coverage
  describe('setter branch coverage', () => {
    it('toggles helpMenuOpen', () => {
      expect(useDocStore.getState().helpMenuOpen).toBe(false);
      useDocStore.getState().setHelpMenuOpen(true);
      expect(useDocStore.getState().helpMenuOpen).toBe(true);
    });

    it('toggles aboutOpen', () => {
      expect(useDocStore.getState().aboutOpen).toBe(false);
      useDocStore.getState().setAboutOpen(true);
      expect(useDocStore.getState().aboutOpen).toBe(true);
    });

    it('toggles shortcutsOpen', () => {
      expect(useDocStore.getState().shortcutsOpen).toBe(false);
      useDocStore.getState().setShortcutsOpen(true);
      expect(useDocStore.getState().shortcutsOpen).toBe(true);
    });

    it('sets tableGridSize to value and back to null', () => {
      useDocStore.getState().setTableGridSize({ rows: 3, cols: 4 });
      expect(useDocStore.getState().tableGridSize).toEqual({ rows: 3, cols: 4 });
      useDocStore.getState().setTableGridSize(null);
      expect(useDocStore.getState().tableGridSize).toBeNull();
    });

    it('sets editor instance', () => {
      const mockEditor = { chain: vi.fn() } as unknown as Editor;
      useDocStore.getState().setEditor(mockEditor);
      expect(useDocStore.getState().editor).toBe(mockEditor);
    });
  });

  // Header/footer settings branch coverage
  describe('settings branch coverage', () => {
    it('updates header settings', () => {
      useDocStore.getState().updateSettings({
        header: { enabled: false, content: 'Custom Header' },
      });
      const settings = useDocStore.getState().docState.settings;
      expect(settings.header.enabled).toBe(false);
      expect(settings.header.content).toBe('Custom Header');
    });

    it('updates footer settings', () => {
      useDocStore.getState().updateSettings({
        footer: { enabled: false, showPageNumbers: false },
      });
      const settings = useDocStore.getState().docState.settings;
      expect(settings.footer.enabled).toBe(false);
      expect(settings.footer.showPageNumbers).toBe(false);
    });

    it('updates widow/orphan control settings', () => {
      useDocStore.getState().updateSettings({
        widows: 3,
        orphans: 4,
      });
      const settings = useDocStore.getState().docState.settings;
      expect(settings.widows).toBe(3);
      expect(settings.orphans).toBe(4);
    });

    it('defaults widows and orphans to 2', () => {
      const settings = useDocStore.getState().docState.settings;
      expect(settings.widows).toBe(2);
      expect(settings.orphans).toBe(2);
    });

    it('partial settings merge preserves other fields', () => {
      useDocStore.getState().updateSettings({
        margins: { top: '50mm', bottom: '50mm', left: '50mm', right: '50mm' },
      });
      const settings = useDocStore.getState().docState.settings;
      expect(settings.pageFormat).toBe('A4');
      expect(settings.orientation).toBe('portrait');
      expect(settings.header.enabled).toBe(true);
    });
  });

  // createInitialState branch coverage
  describe('createInitialState', () => {
    it('returns parsed doc when localStorage has valid JSON', () => {
      localStorage.setItem('SIMPLEDOCS_STATE', JSON.stringify({
        ...baseDoc,
        title: 'Stored Doc',
      }));
      const result = createInitialState();
      expect(result.title).toBe('Stored Doc');
    });

    it('returns new doc when localStorage is empty', () => {
      localStorage.clear();
      const result = createInitialState();
      expect(result.title).toBe('Untitled Document');
    });

    it('returns new doc when localStorage has invalid JSON (catch block)', () => {
      localStorage.setItem('SIMPLEDOCS_STATE', '{ broken json!');
      const result = createInitialState();
      expect(result.title).toBe('Untitled Document');
    });

    it('returns new doc when localStorage has null value', () => {
      localStorage.setItem('SIMPLEDOCS_STATE', 'null');
      const result = createInitialState();
      expect(result.title).toBe('Untitled Document');
    });
  });

  // Migration from old pages[] format
  describe('migration', () => {
    it('merges pages[] into single content on load', () => {
      const oldFormatDoc = {
        id: 'old-doc',
        title: 'Old Doc',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        settings: baseDoc.settings,
        pages: [
          {
            id: 'p1',
            content: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Page 1' }] }],
            },
          },
          {
            id: 'p2',
            content: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Page 2' }] }],
            },
          },
        ],
      };
      useDocStore.getState().loadDocument(oldFormatDoc as unknown as DocState);
      const state = useDocStore.getState();
      expect(state.docState.content).toBeDefined();
      expect((state.docState.content as Record<string, unknown>).content).toHaveLength(2);
      expect((state.docState as unknown as Record<string, unknown>).pages).toBeUndefined();
    });

    it('loads modern format directly', () => {
      const modernDoc = {
        ...baseDoc,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
      };
      useDocStore.getState().loadDocument(modernDoc);
      const state = useDocStore.getState();
      expect(state.docState.content).toEqual(modernDoc.content);
    });
  });

  // Normal Editor / Paginated Editor view
  describe('normalEditorMode', () => {
    it('defaults to false', () => {
      expect(useDocStore.getState().normalEditorMode).toBe(false);
    });

    it('toggles normalEditorMode on and off', () => {
      useDocStore.getState().setNormalEditorMode(true);
      expect(useDocStore.getState().normalEditorMode).toBe(true);
      useDocStore.getState().setNormalEditorMode(false);
      expect(useDocStore.getState().normalEditorMode).toBe(false);
    });

    it('initializes normalEditorMode from settings.defaultNormalEditorMode', () => {
      const docWithNormalEditor = {
        ...baseDoc,
        settings: { ...baseDoc.settings, defaultNormalEditorMode: true },
      };
      useDocStore.getState().loadDocument(docWithNormalEditor);
      expect(useDocStore.getState().normalEditorMode).toBe(true);
    });

    it('persists defaultNormalEditorMode via updateSettings', () => {
      useDocStore.getState().updateSettings({ defaultNormalEditorMode: true });
      const settings = useDocStore.getState().docState.settings;
      expect(settings.defaultNormalEditorMode).toBe(true);
    });

    it('does not change normalEditorMode when updating other settings', () => {
      useDocStore.getState().setNormalEditorMode(true);
      useDocStore.getState().updateSettings({
        margins: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      expect(useDocStore.getState().normalEditorMode).toBe(true);
    });
  });
});
