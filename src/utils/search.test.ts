// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  findAllOccurrences,
  replaceAllOccurrences,
  countOccurrences,
  replaceAllPreservingStyles,
  replaceOnePreservingStyles,
  findInDocument,
  type SerializedNode,
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
      expect(results[1].index).toBe(16);
    });

    it('returns empty array for empty search term', () => {
      const results = findAllOccurrences('Hello World', '');
      expect(results).toEqual([]);
    });

    it('escapes special regex characters in plain text mode', () => {
      const results = findAllOccurrences('Price: $100 (USD)', '$100');
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('$100');
    });

    it('handles no matches', () => {
      const results = findAllOccurrences('Hello World', 'xyz');
      expect(results).toEqual([]);
    });

    describe('regex mode', () => {
      it('supports regex patterns', () => {
        const results = findAllOccurrences('abc 123 def 456', '\\d+', { regex: true });
        expect(results).toHaveLength(2);
        expect(results[0].text).toBe('123');
        expect(results[1].text).toBe('456');
      });

      it('supports regex with capture groups', () => {
        const results = findAllOccurrences('foo@bar.com baz@qux.com', '(\\w+)@(\\w+)', { regex: true });
        expect(results).toHaveLength(2);
        expect(results[0].text).toBe('foo@bar');
        expect(results[1].text).toBe('baz@qux');
      });

      it('handles invalid regex gracefully', () => {
        const results = findAllOccurrences('Hello World', '[invalid', { regex: true });
        expect(results).toEqual([]);
      });

      it('supports case-insensitive regex', () => {
        const results = findAllOccurrences('Hello HELLO', 'hello', { regex: true });
        expect(results).toHaveLength(2);
      });

      it('supports case-sensitive regex', () => {
        const results = findAllOccurrences('Hello hello', 'hello', { regex: true, caseSensitive: true });
        expect(results).toHaveLength(1);
      });

      it('handles zero-length matches without infinite loop', () => {
        const results = findAllOccurrences('abc', 'a*', { regex: true });
        // Should not hang and should return some results
        expect(results.length).toBeGreaterThanOrEqual(1);
      });
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

    describe('regex mode', () => {
      it('replaces using regex', () => {
        const result = replaceAllOccurrences('abc 123 def 456', '\\d+', 'NUM', { regex: true });
        expect(result.text).toBe('abc NUM def NUM');
        expect(result.count).toBe(2);
      });

      it('handles invalid regex gracefully', () => {
        const result = replaceAllOccurrences('Hello World', '[bad', 'xyz', { regex: true });
        expect(result.text).toBe('Hello World');
        expect(result.count).toBe(0);
      });
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

  describe('replaceAllPreservingStyles', () => {
    const sampleDoc: SerializedNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello World' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'World is big' },
          ],
        },
      ],
    };

    it('replaces text while preserving structure', () => {
      const result = replaceAllPreservingStyles(sampleDoc, 'World', 'Universe');
      expect(result.count).toBe(2);
      expect(result.doc.content![0].content![0].text).toBe('Hello Universe');
      expect(result.doc.content![1].content![0].text).toBe('Universe is big');
    });

    it('does not mutate the original document', () => {
      const original = JSON.parse(JSON.stringify(sampleDoc));
      replaceAllPreservingStyles(sampleDoc, 'World', 'Universe');
      expect(sampleDoc).toEqual(original);
    });

    it('handles nested content', () => {
      const nestedDoc: SerializedNode = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'cat dog cat' }],
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = replaceAllPreservingStyles(nestedDoc, 'cat', 'bird');
      expect(result.count).toBe(2);
    });

    it('handles empty search term', () => {
      const result = replaceAllPreservingStyles(sampleDoc, '', 'xyz');
      expect(result.count).toBe(0);
    });

    it('handles regex mode', () => {
      const result = replaceAllPreservingStyles(sampleDoc, 'W\\w+', 'X', { regex: true });
      expect(result.count).toBe(2);
    });
  });

  describe('replaceOnePreservingStyles', () => {
    const sampleDoc: SerializedNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'cat dog cat bird cat' },
          ],
        },
      ],
    };

    it('replaces only the specified occurrence', () => {
      const result = replaceOnePreservingStyles(sampleDoc, 'cat', 'X', 1);
      expect(result.replaced).toBe(true);
      expect(result.doc.content![0].content![0].text).toBe('cat dog X bird cat');
    });

    it('replaces first occurrence when index is 0', () => {
      const result = replaceOnePreservingStyles(sampleDoc, 'cat', 'X', 0);
      expect(result.replaced).toBe(true);
      expect(result.doc.content![0].content![0].text).toBe('X dog cat bird cat');
    });

    it('replaces last occurrence', () => {
      const result = replaceOnePreservingStyles(sampleDoc, 'cat', 'X', 2);
      expect(result.replaced).toBe(true);
      expect(result.doc.content![0].content![0].text).toBe('cat dog cat bird X');
    });

    it('returns replaced=false for out-of-range index', () => {
      const result = replaceOnePreservingStyles(sampleDoc, 'cat', 'X', 10);
      expect(result.replaced).toBe(false);
    });

    it('does not mutate the original document', () => {
      const original = JSON.parse(JSON.stringify(sampleDoc));
      replaceOnePreservingStyles(sampleDoc, 'cat', 'X', 0);
      expect(sampleDoc).toEqual(original);
    });

    it('returns position info for the replaced match', () => {
      const result = replaceOnePreservingStyles(sampleDoc, 'cat', 'X', 0);
      expect(result.from).toBeDefined();
      expect(result.to).toBeDefined();
    });
  });

  describe('findInDocument', () => {
    const sampleDoc: SerializedNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello World' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'World peace' }],
        },
      ],
    };

    it('finds matches across multiple nodes', () => {
      const results = findInDocument(sampleDoc, 'World');
      expect(results).toHaveLength(2);
      expect(results[0].nodePath).toEqual([0, 0]);
      expect(results[1].nodePath).toEqual([1, 0]);
    });

    it('returns empty array for empty search term', () => {
      const results = findInDocument(sampleDoc, '');
      expect(results).toEqual([]);
    });

    it('handles regex mode', () => {
      const results = findInDocument(sampleDoc, 'W\\w+', { regex: true });
      expect(results).toHaveLength(2);
    });
  });
});
