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
  showPageBackgrounds: boolean;
}

export interface DocState {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  settings: DocSettings;
  content: Record<string, unknown>;
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
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
      },
    ],
  },
});

const loadFromStorage = (): DocState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return null;
};

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

    loadDocument: (doc) => {
      set({ docState: doc });
      persistToStorage(doc);
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
    setCurrentPage: (page) => {
      const { totalPages } = get();
      if (isNaN(page)) return;
      set({ currentPage: Math.max(1, Math.min(Math.floor(page), totalPages)) });
    },
    setTotalPages: (pages) =>
      set({ totalPages: Math.max(1, typeof pages === 'number' ? pages : 1) }),
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
