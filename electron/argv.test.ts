// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { extractDocumentPaths } from './argv';

describe('extractDocumentPaths', () => {
  it('extracts a quoted .sdjson path from a Windows launch', () => {
    const argv = ['C:\\Program Files\\SimpleDocs\\SimpleDocs.exe', '"C:\\Users\\Ada\\Documents\\Letter.sdjson"'];
    expect(extractDocumentPaths(argv)).toEqual([path.resolve('C:\\Users\\Ada\\Documents\\Letter.sdjson')]);
  });

  it('accepts unquoted paths and normalises them', () => {
    const argv = ['SimpleDocs.exe', 'docs/letter.SDJSON'];
    expect(extractDocumentPaths(argv)).toEqual([path.resolve('docs/letter.SDJSON')]);
  });

  it('accepts .docx association launches', () => {
    const file = 'C:/Docs/Letter.docx';
    const argv = ['SimpleDocs.exe', `"${file}"`];
    expect(extractDocumentPaths(argv)).toEqual([path.resolve(file)]);
  });

  it('keeps mixed .sdjson and .docx launches in order', () => {
    const argv = ['SimpleDocs.exe', 'a.sdjson', 'b.docx'];
    expect(extractDocumentPaths(argv)).toEqual([path.resolve('a.sdjson'), path.resolve('b.docx')]);
  });

  it('ignores flags, the executable and non-document arguments', () => {
    const argv = ['SimpleDocs.exe', '--no-sandbox', '.', 'readme.txt', 'photo.png'];
    expect(extractDocumentPaths(argv)).toEqual([]);
  });

  it('de-duplicates and preserves order', () => {
    const argv = ['SimpleDocs.exe', 'a.sdjson', 'b.sdjson', 'a.sdjson'];
    expect(extractDocumentPaths(argv)).toEqual([path.resolve('a.sdjson'), path.resolve('b.sdjson')]);
  });

  it('supports unicode and spaces', () => {
    const argv = ['SimpleDocs.exe', '"C:\\Docs\\Résumé 2026.sdjson"'];
    expect(extractDocumentPaths(argv)).toEqual([path.resolve('C:\\Docs\\Résumé 2026.sdjson')]);
  });

  it('returns nothing when no file is associated', () => {
    expect(extractDocumentPaths(['SimpleDocs.exe'])).toEqual([]);
  });

  it('ignores empty and whitespace arguments', () => {
    expect(extractDocumentPaths(['SimpleDocs.exe', '', '  ', '""'])).toEqual([]);
  });
});
