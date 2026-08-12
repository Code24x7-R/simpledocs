// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { create } from 'zustand';
import type { Editor } from '@tiptap/react';
import { getMRUList, addMRUEntry, removeMRUEntry } from '../utils/mru';

export interface DocSettings {
  pageFormat: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  header: {
    enabled: boolean;
    content: string;
  };
  footer: {
    enabled: boolean;
    showPageNumbers: boolean;
  };
  pageGap: number;
  /** Minimum lines at bottom of page before a break (default: 2) */
  orphans: number;
  /** Minimum lines at top of next page after a break (default: 2) */
  widows: number;
  /** Whether to launch in full-bleed (distraction-free) mode by default */
  defaultFullBleedMode: boolean;
}

export interface DocState {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  settings: DocSettings;
  /** Single Tiptap JSON content tree for the entire document. */
  content: Record<string, unknown>;
  /** Total page count (computed from content height / page height). */
  totalPages: number;
}

interface DocStore {
  docState: DocState;
  editor: Editor | null;
  zoom: number;
  /** Whether full-bleed (distraction-free) mode is currently active */
  fullBleedMode: boolean;
  pageSetupOpen: boolean;
  insertFieldOpen: boolean;
  tableGridOpen: boolean;
  tableGridSize: { rows: number; cols: number } | null;
  helpMenuOpen: boolean;
  aboutOpen: boolean;
  shortcutsOpen: boolean;
  mruList: { name: string; timestamp: number; size: number }[];
  searchReplaceOpen: boolean;
  fieldMergeOpen: boolean;
  linkOpen: boolean;
  imageOpen: boolean;
  driveOpen: boolean;
  driveMode: 'save' | 'open';
  chatOpen: boolean;
  providerSetupOpen: boolean;
  /** Editor selection saved before link modal opens (modal steals focus) */
  savedLinkSelection: { from: number; to: number } | null;
  currentPage: number;
  totalPages: number;

  setEditor: (editor: Editor) => void;
  updateContent: (content: Record<string, unknown>) => void;
  updateSettings: (settings: Partial<DocSettings>) => void;
  updateTitle: (title: string) => void;
  newDocument: () => void;
  loadDocument: (doc: DocState) => void;
  setZoom: (zoom: number) => void;
  setPageSetupOpen: (open: boolean) => void;
  setInsertFieldOpen: (open: boolean) => void;
  setTableGridOpen: (open: boolean) => void;
  setTableGridSize: (size: { rows: number; cols: number } | null) => void;
  setHelpMenuOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setMruList: (list: { name: string; timestamp: number; size: number }[]) => void;
  addRecentFile: (name: string, size: number) => void;
  removeRecentFile: (name: string) => void;
  setSearchReplaceOpen: (open: boolean) => void;
  setFieldMergeOpen: (open: boolean) => void;
  setLinkOpen: (open: boolean) => void;
  setImageOpen: (open: boolean) => void;
  setDriveOpen: (open: boolean, mode?: 'save' | 'open') => void;
  setSavedLinkSelection: (sel: { from: number; to: number } | null) => void;
  setChatOpen: (open: boolean) => void;
  setProviderSetupOpen: (open: boolean) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToPage: (page: number) => void;
  setFullBleedMode: (enabled: boolean) => void;
}

const STORAGE_KEY = 'SIMPLEDOCS_STATE';

const defaultSettings: DocSettings = {
  pageFormat: 'A4',
  orientation: 'portrait',
  margins: {
    top: '20mm',
    bottom: '20mm',
    left: '25mm',
    right: '25mm',
  },
  header: {
    enabled: true,
    content: '',
  },
  footer: {
    enabled: true,
    showPageNumbers: true,
  },
  pageGap: 24,
  orphans: 2,
  widows: 2,
  defaultFullBleedMode: false,
};

const createNewDoc = (): DocState => ({
  id: crypto.randomUUID(),
  title: 'Untitled Document',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  totalPages: 1,
  settings: { ...defaultSettings },
  content: {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  },
});

const loadFromStorage = (): DocState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateToContent(parsed);
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

/**
 * Migrate old paginated-format documents (with `pages[]`) back to the
 * single-content model. Merges all page content trees into one.
 */
function migrateToContent(parsed: Record<string, unknown>): DocState {
  // Already in new format
  if (parsed.content && !parsed.pages) {
    // Ensure new settings fields have defaults
    const settings = (parsed.settings as DocSettings) || defaultSettings;
    return {
      ...parsed,
      settings: {
        ...defaultSettings,
        ...settings,
      },
    } as unknown as DocState;
  }

  // Old format: has `pages[]` — merge into single content
  if (parsed.pages && Array.isArray(parsed.pages)) {
    const mergedContent: Record<string, unknown> = {
      type: 'doc',
      content: [],
    };

    for (const page of parsed.pages) {
      if (page && typeof page === 'object' && 'content' in page) {
        const pageContent = (page as Record<string, unknown>).content as Record<string, unknown> | undefined;
        const blocks = pageContent?.content as unknown[] | undefined;
        if (blocks) {
          (mergedContent.content as unknown[]).push(...blocks);
        }
      }
    }

    // Ensure at least one paragraph
    if ((mergedContent.content as unknown[]).length === 0) {
      (mergedContent.content as unknown[]).push({ type: 'paragraph' });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pages: _pages, settings: parsedSettings, ...rest } = parsed;
    return {
      ...rest,
      settings: { ...defaultSettings, ...(parsedSettings as Record<string, unknown>) },
      content: mergedContent,
    } as unknown as DocState;
  }

  // Fallback: empty document
  return createNewDoc();
}

export const createInitialState = (): DocState => {
  return loadFromStorage() ?? createNewDoc();
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const persistToStorage = (state: DocState) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 500);
};

export const useDocStore = create<DocStore>((set, get) => {
  const initial = createInitialState();

  return {
    docState: initial,
    editor: null,
    zoom: 1,
    fullBleedMode: initial.settings.defaultFullBleedMode,
    pageSetupOpen: false,
    insertFieldOpen: false,
    tableGridOpen: false,
    tableGridSize: null,
    helpMenuOpen: false,
    aboutOpen: false,
    shortcutsOpen: false,
    mruList: getMRUList(),
    searchReplaceOpen: false,
    fieldMergeOpen: false,
    linkOpen: false,
    imageOpen: false,
    driveOpen: false,
    driveMode: 'save',
    chatOpen: false,
    providerSetupOpen: false,
    savedLinkSelection: null,
    currentPage: 1,
    totalPages: 1,

    setEditor: (editor) => set({ editor }),

    updateContent: (content) => {
      const state = get();
      const updated: DocState = {
        ...state.docState,
        content,
        updatedAt: new Date().toISOString(),
      };
      set({ docState: updated });
      persistToStorage(updated);
    },

    updateSettings: (settings) => {
      const state = get();
      const updated: DocState = {
        ...state.docState,
        settings: { ...state.docState.settings, ...settings },
        updatedAt: new Date().toISOString(),
      };
      set({ docState: updated });
      persistToStorage(updated);
    },

    updateTitle: (title) => {
      const state = get();
      const updated: DocState = {
        ...state.docState,
        title,
        updatedAt: new Date().toISOString(),
      };
      set({ docState: updated });
      persistToStorage(updated);
    },

    newDocument: () => {
      const doc = createNewDoc();
      set({ docState: doc, zoom: 1 });
      persistToStorage(doc);
    },

    loadDocument: (doc: DocState) => {
      const migrated = migrateToContent(doc as unknown as Record<string, unknown>);
      set({ docState: migrated, fullBleedMode: migrated.settings.defaultFullBleedMode });
      persistToStorage(migrated);
    },

    setZoom: (zoom) => set({ zoom }),
    setPageSetupOpen: (open) => set({ pageSetupOpen: open }),
    setInsertFieldOpen: (open) => set({ insertFieldOpen: open }),
    setTableGridOpen: (open) => set({ tableGridOpen: open }),
    setTableGridSize: (size) => set({ tableGridSize: size }),
    setHelpMenuOpen: (open) => set({ helpMenuOpen: open }),
    setAboutOpen: (open) => set({ aboutOpen: open }),
    setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
    setMruList: (list) => set({ mruList: list }),
    addRecentFile: (name: string, size: number) => {
      const list = addMRUEntry({ name, size });
      set({ mruList: list });
    },
    removeRecentFile: (name: string) => {
      const list = removeMRUEntry(name);
      set({ mruList: list });
    },
    setSearchReplaceOpen: (open) => set({ searchReplaceOpen: open }),
    setFieldMergeOpen: (open) => set({ fieldMergeOpen: open }),
    setLinkOpen: (open) => set({ linkOpen: open }),
    setImageOpen: (open) => set({ imageOpen: open }),
    setDriveOpen: (open, mode = 'save') => set({ driveOpen: open, driveMode: mode }),
    setSavedLinkSelection: (sel) => set({ savedLinkSelection: sel }),
    setChatOpen: (open) => set({ chatOpen: open }),
    setProviderSetupOpen: (open) => set({ providerSetupOpen: open }),
    setCurrentPage: (page) => {
      const { totalPages } = get();
      if (isNaN(page)) return;
      set({ currentPage: Math.max(1, Math.min(Math.floor(page), totalPages)) });
    },
    setTotalPages: (pages) =>
      set({
        totalPages: Math.max(
          1,
          typeof pages === 'number' && !isNaN(pages) ? Math.floor(pages) : 1
        ),
      }),
    goToNextPage: () => {
      const { currentPage, totalPages } = get();
      if (!isNaN(currentPage) && currentPage < totalPages) {
        set({ currentPage: currentPage + 1 });
      }
    },
    goToPrevPage: () => {
      const { currentPage } = get();
      if (!isNaN(currentPage) && currentPage > 1) {
        set({ currentPage: currentPage - 1 });
      }
    },
    goToPage: (page) => {
      const { totalPages } = get();
      if (isNaN(page)) return;
      set({ currentPage: Math.max(1, Math.min(Math.floor(page), totalPages)) });
    },
    setFullBleedMode: (enabled) => set({ fullBleedMode: enabled }),
  };
});
