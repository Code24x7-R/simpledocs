// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  MAX_RECENT_PATHS,
  addRecentPath,
  isRecentPath,
  normalizeRecentPaths,
} from './recent';

describe('recent path allowlist', () => {
  it('normalises persisted values to absolute paths', () => {
    const other = 'C:/Docs/Other.sdjson';
    const result = normalizeRecentPaths(['docs/letter.sdjson', other]);
    expect(result).toEqual([path.resolve('docs/letter.sdjson'), path.resolve(other)]);
  });

  it('drops non-strings, empty values and duplicates', () => {
    const result = normalizeRecentPaths([
      'a.sdjson',
      'a.sdjson',
      '',
      '   ',
      null,
      42,
      'b.sdjson',
    ]);
    expect(result).toEqual([path.resolve('a.sdjson'), path.resolve('b.sdjson')]);
  });

  it('caps the list', () => {
    const values = Array.from({ length: MAX_RECENT_PATHS + 5 }, (_, i) => `doc-${i}.sdjson`);
    expect(normalizeRecentPaths(values)).toHaveLength(MAX_RECENT_PATHS);
  });

  it('adds the newest path first and de-duplicates', () => {
    const first = addRecentPath([], 'a.sdjson');
    const second = addRecentPath(first, 'b.sdjson');
    const again = addRecentPath(second, 'a.sdjson');
    expect(again).toEqual([path.resolve('a.sdjson'), path.resolve('b.sdjson')]);
  });

  it('checks membership', () => {
    const list = normalizeRecentPaths(['a.sdjson']);
    expect(isRecentPath(list, 'a.sdjson')).toBe(true);
    expect(isRecentPath(list, 'b.sdjson')).toBe(false);
  });
});
