// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  countWords,
  countSentences,
  countParagraphs,
  readingTime,
  getTextStats,
  formatReadingTime,
} from './textStats';

describe('textStats', () => {
  describe('countWords', () => {
    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0);
    });

    it('returns 0 for whitespace only', () => {
      expect(countWords('   \n\t  ')).toBe(0);
    });

    it('counts single word', () => {
      expect(countWords('hello')).toBe(1);
    });

    it('counts multiple words', () => {
      expect(countWords('hello world foo bar')).toBe(4);
    });

    it('handles multiple spaces between words', () => {
      expect(countWords('hello    world')).toBe(2);
    });

    it('handles newlines', () => {
      expect(countWords('hello\nworld\nfoo')).toBe(3);
    });

    it('handles mixed whitespace', () => {
      expect(countWords('  hello \n\t world  ')).toBe(2);
    });
  });

  describe('countSentences', () => {
    it('returns 0 for empty string', () => {
      expect(countSentences('')).toBe(0);
    });

    it('counts sentences with periods', () => {
      expect(countSentences('Hello world. Foo bar.')).toBe(2);
    });

    it('counts sentences with exclamation marks', () => {
      expect(countSentences('Hello! World!')).toBe(2);
    });

    it('counts sentences with question marks', () => {
      expect(countSentences('How are you? I am fine.')).toBe(2);
    });

    it('handles text without punctuation as 1 sentence', () => {
      expect(countSentences('hello world')).toBe(1);
    });
  });

  describe('countParagraphs', () => {
    it('returns 0 for empty string', () => {
      expect(countParagraphs('')).toBe(0);
    });

    it('counts single paragraph', () => {
      expect(countParagraphs('Hello world')).toBe(1);
    });

    it('counts multiple paragraphs', () => {
      expect(countParagraphs('Hello\n\nWorld\n\nFoo')).toBe(3);
    });

    it('handles extra blank lines', () => {
      expect(countParagraphs('Hello\n\n\n\nWorld')).toBe(2);
    });
  });

  describe('readingTime', () => {
    it('returns at least 1 minute', () => {
      expect(readingTime(0)).toBe(1);
      expect(readingTime(50)).toBe(1);
    });

    it('calculates minutes from word count', () => {
      expect(readingTime(200)).toBe(1);
      expect(readingTime(400)).toBe(2);
      expect(readingTime(600)).toBe(3);
    });

    it('rounds to nearest minute', () => {
      expect(readingTime(250)).toBe(1);
      expect(readingTime(350)).toBe(2);
    });
  });

  describe('getTextStats', () => {
    it('returns all stats for text', () => {
      const stats = getTextStats('Hello world. This is a test.');
      expect(stats.words).toBe(6);
      expect(stats.characters).toBe(28);
      expect(stats.charactersNoSpaces).toBe(23);
      expect(stats.sentences).toBe(2);
      expect(stats.paragraphs).toBe(1);
      expect(stats.readingTimeMinutes).toBe(1);
    });

    it('handles empty string', () => {
      const stats = getTextStats('');
      expect(stats.words).toBe(0);
      expect(stats.characters).toBe(0);
      expect(stats.charactersNoSpaces).toBe(0);
      expect(stats.sentences).toBe(0);
      expect(stats.paragraphs).toBe(0);
      expect(stats.readingTimeMinutes).toBe(1);
    });

    it('counts characters without spaces', () => {
      const stats = getTextStats('a b c');
      expect(stats.characters).toBe(5);
      expect(stats.charactersNoSpaces).toBe(3);
    });
  });

  describe('formatReadingTime', () => {
    it('formats less than 1 minute', () => {
      expect(formatReadingTime(0)).toBe('<1 min read');
    });

    it('formats exactly 1 minute', () => {
      expect(formatReadingTime(1)).toBe('1 min read');
    });

    it('formats multiple minutes', () => {
      expect(formatReadingTime(5)).toBe('5 min read');
    });
  });
});
