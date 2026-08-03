// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTimeMinutes: number;
}

/** Words per minute for average reading speed */
const WPM = 200;

/** Count words in text (handles multiple spaces, newlines) */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Count sentences (rough approximation by punctuation) */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/[.!?]+/g);
  return matches ? matches.length : (trimmed ? 1 : 0);
}

/** Count paragraphs (blocks separated by blank lines) */
export function countParagraphs(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length;
}

/** Calculate reading time in minutes */
export function readingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WPM));
}

/** Get full text statistics from a string */
export function getTextStats(text: string): TextStats {
  const words = countWords(text);
  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    readingTimeMinutes: readingTime(words),
  };
}

/** Format reading time for display */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '<1 min read';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}
