// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  findAllOccurrences,
  replaceAllOccurrences,
  countOccurrences,
} from './search';

describe('search', () => {
  describe('findAllOccurrences', () => {
    it('finds single occurrence', () => {
      const results = findAllOccurrences('Hello World', 'World');
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('World');
      expect(results[0].index).toBe(6);
    });

    it('finds multiple occurrences', () => {
      const results = findAllOccurrences('cat cat cat', 'cat');
      expect(results).toHaveLength(3);
      expect(results[0].index).toBe(0);
      expect(results[1].index).toBe(4);
      expect(results[2].index).toBe(8);
    });

    it('is case-insensitive by default', () => {
      const results = findAllOccurrences('Hello HELLO hello', 'hello');
      expect(results).toHaveLength(3);
    });

    it('respects case-sensitive option', () => {
      const results = findAllOccurrences('Hello HELLO hello', 'hello', {
        caseSensitive: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('hello');
    });

    it('respects whole-word option', () => {
      const results = findAllOccurrences('cat caterpillar cat', 'cat', {
        wholeWord: true,
      });
      expect(results).toHaveLength(2);
      expect(results[0].index).toBe(0);
      expect(results[1].index).toBe(16); // 'cat caterpillar ' = 16 chars
    });

    it('returns empty array for empty search term', () => {
      const results = findAllOccurrences('Hello World', '');
      expect(results).toEqual([]);
    });

    it('escapes special regex characters', () => {
      const results = findAllOccurrences('Price: $100 (USD)', '$100');
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('$100');
    });

    it('handles no matches', () => {
      const results = findAllOccurrences('Hello World', 'xyz');
      expect(results).toEqual([]);
    });
  });

  describe('replaceAllOccurrences', () => {
    it('replaces single occurrence', () => {
      const result = replaceAllOccurrences('Hello World', 'World', 'Universe');
      expect(result.text).toBe('Hello Universe');
      expect(result.count).toBe(1);
    });

    it('replaces multiple occurrences', () => {
      const result = replaceAllOccurrences('cat cat cat', 'cat', 'dog');
      expect(result.text).toBe('dog dog dog');
      expect(result.count).toBe(3);
    });

    it('is case-insensitive by default', () => {
      const result = replaceAllOccurrences('Hello HELLO hello', 'hello', 'hi');
      expect(result.text).toBe('hi hi hi');
      expect(result.count).toBe(3);
    });

    it('respects case-sensitive option', () => {
      const result = replaceAllOccurrences('Hello HELLO hello', 'hello', 'hi', {
        caseSensitive: true,
      });
      expect(result.text).toBe('Hello HELLO hi');
      expect(result.count).toBe(1);
    });

    it('respects whole-word option', () => {
      const result = replaceAllOccurrences('cat caterpillar cat', 'cat', 'dog', {
        wholeWord: true,
      });
      expect(result.text).toBe('dog caterpillar dog');
      expect(result.count).toBe(2);
    });

    it('returns original text for empty search term', () => {
      const result = replaceAllOccurrences('Hello World', '', 'xyz');
      expect(result.text).toBe('Hello World');
      expect(result.count).toBe(0);
    });

    it('handles replacement with empty string (deletion)', () => {
      const result = replaceAllOccurrences('Hello World', ' World', '');
      expect(result.text).toBe('Hello');
      expect(result.count).toBe(1);
    });

    it('handles special regex characters in search', () => {
      const result = replaceAllOccurrences('Price: $100', '$100', '$200');
      expect(result.text).toBe('Price: $200');
      expect(result.count).toBe(1);
    });
  });

  describe('countOccurrences', () => {
    it('counts single occurrence', () => {
      expect(countOccurrences('Hello World', 'World')).toBe(1);
    });

    it('counts multiple occurrences', () => {
      expect(countOccurrences('cat cat cat', 'cat')).toBe(3);
    });

    it('is case-insensitive by default', () => {
      expect(countOccurrences('Hello HELLO hello', 'hello')).toBe(3);
    });

    it('respects case-sensitive option', () => {
      expect(
        countOccurrences('Hello HELLO hello', 'hello', { caseSensitive: true })
      ).toBe(1);
    });

    it('returns 0 for no matches', () => {
      expect(countOccurrences('Hello World', 'xyz')).toBe(0);
    });

    it('returns 0 for empty search term', () => {
      expect(countOccurrences('Hello World', '')).toBe(0);
    });
  });
});
