// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Import a Word document into the editor store.
 *
 * Shared by the File → Import Word menu and by `.docx` launches (file
 * association, native Open, Recent Files). Mirrors the browser path: mammoth
 * converts to HTML, a throwaway Tiptap editor normalises it to document JSON,
 * then the store loads it.
 */
import { Editor } from '@tiptap/core';
import { createExtensions } from '../extensions';
import { useDocStore } from '../store/useDocStore';
import { titleFromFileName } from './documentFile';
import { importWordBuffer } from './wordImport';

export interface WordImportOptions {
  name: string;
  arrayBuffer: ArrayBuffer;
  /** Byte size for Recent Files (defaults to the buffer size). */
  size?: number;
  /** Absolute path for desktop Recent Files. */
  path?: string;
}

export async function importWordIntoStore({
  name,
  arrayBuffer,
  size = arrayBuffer.byteLength,
  path,
}: WordImportOptions): Promise<void> {
  const { html, messages } = await importWordBuffer(arrayBuffer);

  const tempEditor = new Editor({ extensions: createExtensions(), content: html });
  const content = tempEditor.getJSON();
  tempEditor.destroy();

  const store = useDocStore.getState();
  const title = titleFromFileName(name) ?? store.docState.title;
  store.loadDocument({
    ...store.docState,
    title,
    content,
    updatedAt: new Date().toISOString(),
  });
  store.addRecentFile(name, size, path);

  if (messages.length > 0) {
    console.warn('Word import warnings:', messages);
  }
}

/** Import a File from the browser/Electron file input. */
export async function importWordFileIntoStore(file: File): Promise<void> {
  await importWordIntoStore({
    name: file.name,
    arrayBuffer: await file.arrayBuffer(),
    size: file.size,
  });
}
