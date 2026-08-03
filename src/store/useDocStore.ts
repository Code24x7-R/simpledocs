// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { create } from 'zustand';
import type { Editor } from '@tiptap/react';
import { getMRUList, addMRUEntry, removeMRUEntry } from '../utils/mru';
import type { Page } from '../types/page';
import { createEmptyPage } from '../types/page';
import { splitContentIntoPages } from '../utils/pageOverflow';

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
  showPageBackgrounds: boolean;
}

export interface DocState {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  settings: DocSettings;
  /** Array of pages, each with its own Tiptap JSON content tree. */
  pages: Page[];
}

interface DocStore {
  docState: DocState;
  editor: Editor | null;
  zoom: number;
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
  currentPage: number;
  totalPages: number;

  setEditor: (editor: Editor) => void;
  updatePageContent: (pageIndex: number, content: Record<string, unknown>) => void;
  updateSettings: (settings: Partial<DocSettings>) => void;
  updateTitle: (title: string) => void;
  newDocument: () => void;
  loadDocument: (doc: DocState) => void;
  addPageAfter: (pageIndex: number) => void;
  removePage: (pageIndex: number) => void;
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
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToPage: (page: number) => void;
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
  showPageBackgrounds: true,
};

const createNewDoc = (): DocState => ({
  id: crypto.randomUUID(),
  title: 'Untitled Document',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: { ...defaultSettings },
  pages: [createEmptyPage()],
});

const loadFromStorage = (): DocState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateToPages(parsed);
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

/**
 * Migrate old-format documents (flat `content` tree) to the new paginated
 * model (`pages[]`). Uses DocumentLayoutEngine to split content at page
 * boundaries. This is a one-time conversion on load.
 */
function migrateToPages(parsed: any): DocState {
  // Already in new format
  if (parsed.pages && Array.isArray(parsed.pages)) {
    return parsed as DocState;
  }

  // Old format: has `content` but no `pages`
  if (parsed.content && !parsed.pages) {
    const pages = splitContentIntoPages(parsed.content, parsed.settings);
    const migrated: DocState = {
      ...parsed,
      pages,
    };
    delete (migrated as any).content;
    return migrated;
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
    currentPage: 1,
    totalPages: 1,

    setEditor: (editor) => set({ editor }),

    updatePageContent: (pageIndex, content) => {
      const state = get();
      const pages = [...state.docState.pages];
      if (pageIndex < 0 || pageIndex >= pages.length) return;
      pages[pageIndex] = { ...pages[pageIndex], content };
      const updated: DocState = {
        ...state.docState,
        pages,
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

    loadDocument: (doc) => {
      const migrated = migrateToPages(doc);
      set({ docState: migrated });
      persistToStorage(migrated);
    },

    addPageAfter: (pageIndex) => {
      const state = get();
      const pages = [...state.docState.pages];
      const newPage = createEmptyPage();
      pages.splice(pageIndex + 1, 0, newPage);
      const updated: DocState = {
        ...state.docState,
        pages,
        updatedAt: new Date().toISOString(),
      };
      set({ docState: updated });
      persistToStorage(updated);
    },

    removePage: (pageIndex) => {
      const state = get();
      if (state.docState.pages.length <= 1) return;
      const pages = state.docState.pages.filter((_, i) => i !== pageIndex);
      const updated: DocState = {
        ...state.docState,
        pages,
        updatedAt: new Date().toISOString(),
      };
      set({ docState: updated });
      persistToStorage(updated);
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
  };
});
