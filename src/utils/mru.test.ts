// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMRUList,
  addMRUEntry,
  removeMRUEntry,
  clearMRUList,
  formatMRUTimestamp,
  type MRUEntry,
} from './mru';

describe('mru', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getMRUList', () => {
    it('returns empty array when no MRU stored', () => {
      expect(getMRUList()).toEqual([]);
    });

    it('returns parsed MRU list from localStorage', () => {
      const entries: MRUEntry[] = [
        { name: 'doc1.json', timestamp: Date.now(), size: 1024 },
      ];
      localStorage.setItem('SIMPLEDOCS_MRU', JSON.stringify(entries));
      expect(getMRUList()).toEqual(entries);
    });

    it('returns empty array on parse error', () => {
      localStorage.setItem('SIMPLEDOCS_MRU', '{ broken');
      expect(getMRUList()).toEqual([]);
    });
  });

  describe('addMRUEntry', () => {
    it('adds new entry to the top of the list', () => {
      addMRUEntry({ name: 'first.json', size: 100 });
      addMRUEntry({ name: 'second.json', size: 200 });
      const list = getMRUList();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('second.json');
      expect(list[1].name).toBe('first.json');
    });

    it('removes duplicate entries with same name', () => {
      addMRUEntry({ name: 'doc.json', size: 100 });
      addMRUEntry({ name: 'other.json', size: 200 });
      addMRUEntry({ name: 'doc.json', size: 150 }); // duplicate name
      const list = getMRUList();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('doc.json');
      expect(list[0].size).toBe(150);
    });

    it('limits list to 5 entries', () => {
      for (let i = 0; i < 7; i++) {
        addMRUEntry({ name: `doc${i}.json`, size: 100 + i });
      }
      const list = getMRUList();
      expect(list).toHaveLength(5);
      // Most recent should be first
      expect(list[0].name).toBe('doc6.json');
      // Oldest of the 5 kept
      expect(list[4].name).toBe('doc2.json');
    });

    it('persists to localStorage', () => {
      addMRUEntry({ name: 'test.json', size: 500 });
      const raw = localStorage.getItem('SIMPLEDOCS_MRU');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed[0].name).toBe('test.json');
    });
  });

  describe('removeMRUEntry', () => {
    it('removes entry by name', () => {
      addMRUEntry({ name: 'keep.json', size: 100 });
      addMRUEntry({ name: 'remove.json', size: 200 });
      removeMRUEntry('remove.json');
      const list = getMRUList();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('keep.json');
    });

    it('does nothing when name not found', () => {
      addMRUEntry({ name: 'doc.json', size: 100 });
      removeMRUEntry('nonexistent.json');
      expect(getMRUList()).toHaveLength(1);
    });
  });

  describe('clearMRUList', () => {
    it('removes all entries', () => {
      addMRUEntry({ name: 'doc1.json', size: 100 });
      addMRUEntry({ name: 'doc2.json', size: 200 });
      clearMRUList();
      expect(getMRUList()).toEqual([]);
    });
  });

  describe('formatMRUTimestamp', () => {
    it('formats "just now" for recent timestamps', () => {
      const now = Date.now();
      expect(formatMRUTimestamp(now)).toBe('just now');
    });

    it('formats minutes ago', () => {
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      expect(formatMRUTimestamp(fiveMinAgo)).toBe('5m ago');
    });

    it('formats hours ago', () => {
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      expect(formatMRUTimestamp(threeHoursAgo)).toBe('3h ago');
    });

    it('formats days ago', () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      expect(formatMRUTimestamp(twoDaysAgo)).toBe('2d ago');
    });

    it('formats as date for older entries', () => {
      const oldTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const result = formatMRUTimestamp(oldTimestamp);
      // Should be a date string (format depends on locale)
      expect(result).toMatch(/\d/); // contains at least one digit
      expect(result).not.toBe('just now');
      expect(result).not.toMatch(/^[0-9]+[mhd] ago$/); // not a relative time
    });
  });
});
