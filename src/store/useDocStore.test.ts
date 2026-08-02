import { describe, it, expect, beforeEach } from 'vitest';
import { useDocStore } from './useDocStore';

describe('useDocStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDocStore.setState({
      docState: {
        id: 'test-id',
        title: 'Test Document',
        createdAt: '2026-08-02T00:00:00Z',
        updatedAt: '2026-08-02T00:00:00Z',
        settings: {
          pageFormat: 'A4',
          orientation: 'portrait',
          margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
          header: { enabled: true, content: '' },
          footer: { enabled: true, showPageNumbers: true },
        },
        content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
      },
      editor: null,
      zoom: 1,
      pageSetupOpen: false,
      insertFieldOpen: false,
      tableGridOpen: false,
      tableGridSize: null,
    });
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

  it('updates content', () => {
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
      settings: {
        pageFormat: 'Letter' as const,
        orientation: 'landscape' as const,
        margins: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        header: { enabled: false, content: '' },
        footer: { enabled: false, showPageNumbers: false },
      },
      content: { type: 'doc', content: [] },
    };
    useDocStore.getState().loadDocument(doc);
    expect(useDocStore.getState().docState.title).toBe('Loaded Doc');
    expect(useDocStore.getState().docState.settings.pageFormat).toBe('Letter');
  });

  it('persists state to localStorage (debounced)', async () => {
    useDocStore.getState().updateTitle('Persisted Title');
    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 600));
    const raw = localStorage.getItem('SIMPLEDOCS_STATE');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.title).toBe('Persisted Title');
  });
});
