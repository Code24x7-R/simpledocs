// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Navbar from './Navbar';
import { useDocStore } from '../../store/useDocStore';
import type { Editor } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Mock useEditorClipboard — avoid real clipboard utils (jsdom lacks execCommand)
// ---------------------------------------------------------------------------
vi.mock('../../hooks/useEditorClipboard', () => ({
  useEditorClipboard: () => ({
    handleCopy: vi.fn(),
    handleCut: vi.fn(),
    handlePaste: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock utility modules triggered by menu item actions
// ---------------------------------------------------------------------------
vi.mock('../../utils/fileIO', () => ({
  saveDocument: vi.fn(),
  openDocument: vi.fn().mockResolvedValue(null),
  exportToMarkdown: vi.fn(),
}));

vi.mock('../../utils/wordImport', () => ({
  importWordDocument: vi.fn().mockResolvedValue({ html: '<p>Imported</p>', messages: [] }),
}));

// Mock clipboard utils — jsdom lacks document.execCommand('paste')
vi.mock('../../utils/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
  pasteFromClipboard: vi.fn().mockResolvedValue({ text: '', html: '' }),
}));

// Mock fetch for the Load Demo action
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'demo',
      title: 'Demo Document',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
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
      content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
    }),
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Set up the real store with mock values before each test
// ---------------------------------------------------------------------------
function createMockEditor(): Partial<Editor> {
  // Build a chainable mock that supports editor.chain().focus().setPageBreak().run()
  const chainObj: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['focus', 'setPageBreak', 'deleteSelection', 'insertContent', 'setTextSelection'];
  methods.forEach((m) => {
    chainObj[m] = vi.fn().mockReturnValue(chainObj);
  });
  chainObj.run = vi.fn();
  chainObj.chain = vi.fn().mockReturnValue(chainObj);

  return {
    getHTML: () => '<p>Hello</p>',
    chain: vi.fn().mockReturnValue(chainObj),
    state: {
      selection: { from: 0, to: 0, empty: true },
      doc: { textBetween: () => '' },
    },
    view: {
      nodeDOM: () => null,
    },
  } as unknown as Partial<Editor>;
}

function setupStore() {
  useDocStore.setState({
    docState: {
      id: 'test-id',
      title: 'Test Doc',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
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
      content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
    },
    editor: createMockEditor() as Editor,
    zoom: 1,
    fullBleedMode: false,
    helpMenuOpen: false,
    aboutOpen: false,
    shortcutsOpen: false,
    pageSetupOpen: false,
    insertFieldOpen: false,
    tableGridOpen: false,
    fieldMergeOpen: false,
    imageOpen: false,
    tocOpen: false,
    ttsOpen: false,
    driveOpen: false,
    mruList: [],
  });
}

// Helper: open a menu by clicking its header button
function openMenu(menuLabel: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${menuLabel}$`) }));
}

describe('Navbar — menu close behavior', () => {
  beforeEach(() => {
    setupStore();
  });

  // =======================================================================
  // File menu — uses local state (fileMenuOpen)
  // =======================================================================
  describe('File menu', () => {
    it('closes after clicking New', () => {
      render(<Navbar />);
      openMenu('File');
      expect(screen.getByText('New')).toBeInTheDocument();
      fireEvent.click(screen.getByText('New'));
      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });

    it('closes after clicking Load Demo', async () => {
      render(<Navbar />);
      openMenu('File');
      expect(screen.getByText('Load Demo')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Load Demo'));
      await waitFor(() => {
        expect(screen.queryByText('Load Demo')).not.toBeInTheDocument();
      });
    });

    it('closes after clicking Save JSON', () => {
      render(<Navbar />);
      openMenu('File');
      fireEvent.click(screen.getByText('Save JSON'));
      expect(screen.queryByText('Save JSON')).not.toBeInTheDocument();
    });

    it('closes after clicking Export PDF', () => {
      render(<Navbar />);
      openMenu('File');
      fireEvent.click(screen.getByText('Export PDF'));
      expect(screen.queryByText('Export PDF')).not.toBeInTheDocument();
    });

    it('closes after clicking Print', () => {
      render(<Navbar />);
      openMenu('File');
      fireEvent.click(screen.getByText('Print'));
      expect(screen.queryByText('Print')).not.toBeInTheDocument();
    });
  });

  // =======================================================================
  // Edit menu — uses local state (editMenuOpen)
  // =======================================================================
  describe('Edit menu', () => {
    it('closes after clicking Copy', () => {
      render(<Navbar />);
      openMenu('Edit');
      fireEvent.click(screen.getByText('Copy'));
      expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    });

    it('closes after clicking Cut', () => {
      render(<Navbar />);
      openMenu('Edit');
      fireEvent.click(screen.getByText('Cut'));
      expect(screen.queryByText('Cut')).not.toBeInTheDocument();
    });

    it('closes after clicking Paste', () => {
      render(<Navbar />);
      openMenu('Edit');
      fireEvent.click(screen.getByText('Paste'));
      expect(screen.queryByText('Paste')).not.toBeInTheDocument();
    });
  });

  // =======================================================================
  // Insert menu — uses local state (insertMenuOpen)
  // =======================================================================
  describe('Insert menu', () => {
    it('closes after clicking Image', () => {
      render(<Navbar />);
      openMenu('Insert');
      fireEvent.click(screen.getByText('Image'));
      expect(screen.queryByText('Image')).not.toBeInTheDocument();
    });

    it('closes after clicking Table', () => {
      render(<Navbar />);
      openMenu('Insert');
      fireEvent.click(screen.getByText('Table'));
      expect(screen.queryByText('Table')).not.toBeInTheDocument();
    });

    it('closes after clicking Page Break', () => {
      render(<Navbar />);
      openMenu('Insert');
      fireEvent.click(screen.getByText('Page Break'));
      expect(screen.queryByText('Page Break')).not.toBeInTheDocument();
    });

    it('closes after clicking Read Aloud', () => {
      render(<Navbar />);
      openMenu('Insert');
      fireEvent.click(screen.getByText('Read Aloud'));
      expect(screen.queryByText('Read Aloud')).not.toBeInTheDocument();
    });
  });

  // =======================================================================
  // View menu — uses local state (viewMenuOpen) — THE BUG WAS HERE
  // =======================================================================
  describe('View menu', () => {
    it('closes after clicking a zoom preset (100%)', () => {
      render(<Navbar />);
      openMenu('View');
      // "100%" appears both as a preset button and in the zoom display span.
      // Use getAllByText and click the button (preset), not the display span.
      const matches = screen.getAllByText('100%');
      const presetButton = matches.find((el) => el.tagName === 'BUTTON');
      fireEvent.click(presetButton!);
      expect(screen.queryByText('Normal Editor')).not.toBeInTheDocument();
    });

    it('closes after clicking the zoom out (−) button', () => {
      render(<Navbar />);
      openMenu('View');
      const zoomOut = screen.getByTitle('Zoom out');
      fireEvent.click(zoomOut);
      expect(screen.queryByTitle('Zoom out')).not.toBeInTheDocument();
    });

    it('closes after clicking the zoom in (+) button', () => {
      render(<Navbar />);
      openMenu('View');
      const zoomIn = screen.getByTitle('Zoom in');
      fireEvent.click(zoomIn);
      expect(screen.queryByTitle('Zoom in')).not.toBeInTheDocument();
    });

    it('switches to Normal Editor and closes', () => {
      render(<Navbar />);
      openMenu('View');
      fireEvent.click(screen.getByText('Normal Editor'));
      expect(screen.queryByText('Normal Editor')).not.toBeInTheDocument();
      expect(useDocStore.getState().fullBleedMode).toBe(true);
    });

    it('switches to Paginated Editor and closes', () => {
      render(<Navbar />);
      openMenu('View');
      fireEvent.click(screen.getByText('Paginated Editor'));
      expect(screen.queryByText('Paginated Editor')).not.toBeInTheDocument();
      expect(useDocStore.getState().fullBleedMode).toBe(false);
    });

    it('closes after clicking Launch with Normal Editor by Default', () => {
      render(<Navbar />);
      openMenu('View');
      fireEvent.click(screen.getByText('Launch with Normal Editor by Default'));
      expect(screen.queryByText('Launch with Normal Editor by Default')).not.toBeInTheDocument();
    });
  });

  // =======================================================================
  // Help menu — uses store state (helpMenuOpen) via the real Zustand store
  // =======================================================================
  describe('Help menu', () => {
    it('closes after clicking Keyboard Shortcuts', () => {
      render(<Navbar />);
      openMenu('Help');
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Keyboard Shortcuts'));
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('closes after clicking About simpledocs', () => {
      render(<Navbar />);
      openMenu('Help');
      expect(screen.getByText('About simpledocs')).toBeInTheDocument();
      fireEvent.click(screen.getByText('About simpledocs'));
      expect(screen.queryByText('About simpledocs')).not.toBeInTheDocument();
    });
  });
});
