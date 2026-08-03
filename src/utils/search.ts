// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
export interface SearchResult {
  /** Index of the match in the text */
  index: number;
  /** The matched text */
  text: string;
  /** End position of the match */
  end: number;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

/**
 * Build a regex pattern and flags from search options.
 * Returns null if the pattern is invalid (e.g., bad regex).
 */
function buildRegex(
  searchTerm: string,
  options: SearchOptions
): { regex: RegExp; pattern: string } | null {
  if (!searchTerm) return null;

  const flags = options.caseSensitive ? 'g' : 'gi';
  let pattern: string;

  if (options.regex) {
    pattern = searchTerm;
  } else {
    pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (options.wholeWord) {
      pattern = `(?<!\\w)${pattern}(?!\\w)`;
    }
  }

  try {
    return { regex: new RegExp(pattern, flags), pattern };
  } catch {
    return null;
  }
}

/**
 * Find all occurrences of a search term in text.
 */
export function findAllOccurrences(
  text: string,
  searchTerm: string,
  options: SearchOptions = {}
): SearchResult[] {
  if (!searchTerm) return [];

  const built = buildRegex(searchTerm, options);
  if (!built) return [];

  const results: SearchResult[] = [];
  const regex = built.regex;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    results.push({
      index: match.index,
      text: match[0],
      end: match.index + match[0].length,
    });
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  return results;
}

/**
 * Replace all occurrences of a search term with replacement text.
 */
export function replaceAllOccurrences(
  text: string,
  searchTerm: string,
  replacement: string,
  options: SearchOptions = {}
): { text: string; count: number } {
  if (!searchTerm) return { text, count: 0 };

  const built = buildRegex(searchTerm, options);
  if (!built) return { text, count: 0 };

  const matches = text.match(built.regex);
  const count = matches ? matches.length : 0;
  const newText = text.replace(built.regex, replacement);

  return { text: newText, count };
}

/**
 * Count occurrences of a search term in text.
 */
export function countOccurrences(
  text: string,
  searchTerm: string,
  options: SearchOptions = {}
): number {
  return findAllOccurrences(text, searchTerm, options).length;
}

/**
 * Replace text while preserving document structure and formatting.
 */
export function replaceAllPreservingStyles(
  doc: any,
  searchTerm: string,
  replacement: string,
  options: SearchOptions = {}
): { doc: any; count: number } {
  if (!searchTerm) return { doc, count: 0 };

  let totalCount = 0;
  const newDoc = JSON.parse(JSON.stringify(doc));

  const built = buildRegex(searchTerm, options);
  if (!built) return { doc, count: 0 };

  const regex = built.regex;

  function processNode(node: any): any {
    if (!node) return node;

    if (node.text && typeof node.text === 'string') {
      regex.lastIndex = 0;
      const matches = node.text.match(regex);
      if (matches) {
        totalCount += matches.length;
        const newText = node.text.replace(regex, replacement);
        if (newText.length > 0) {
          node.text = newText;
        }
      }
    }

    if (Array.isArray(node.content)) {
      node.content = node.content.map(processNode);
    }

    if (Array.isArray(node.marks)) {
      node.marks = node.marks.map(processNode);
    }

    return node;
  }

  processNode(newDoc);
  return { doc: newDoc, count: totalCount };
}

/**
 * Search for matches across document nodes and return positions with node paths.
 */
export function findInDocument(
  doc: any,
  searchTerm: string,
  options: SearchOptions = {}
): { nodePath: number[]; index: number; end: number; text: string }[] {
  if (!searchTerm) return [];

  const results: { nodePath: number[]; index: number; end: number; text: string }[] = [];

  const built = buildRegex(searchTerm, options);
  if (!built) return [];

  const regex = built.regex;

  function searchNode(node: any, path: number[]) {
    if (!node) return;

    if (node.text && typeof node.text === 'string') {
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;
      while ((match = regex.exec(node.text)) !== null) {
        results.push({
          nodePath: [...path],
          index: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }

    if (Array.isArray(node.content)) {
      node.content.forEach((child: any, i: number) => {
        searchNode(child, [...path, i]);
      });
    }
  }

  searchNode(doc, []);
  return results;
}

/**
 * Replace a single occurrence at the specified position in the document.
 */
export function replaceOnePreservingStyles(
  doc: any,
  searchTerm: string,
  replacement: string,
  matchIndex: number,
  options: SearchOptions = {}
): { doc: any; replaced: boolean; from?: number; to?: number } {
  if (!searchTerm) return { doc, replaced: false };

  const matches = findInDocument(doc, searchTerm, options);
  if (matchIndex < 0 || matchIndex >= matches.length) {
    return { doc, replaced: false };
  }

  const targetMatch = matches[matchIndex];

  const positions = resolveMatchPositions(doc, [targetMatch]);
  if (positions.length === 0) return { doc, replaced: false };

  const { from, to } = positions[0];
  const newDoc = JSON.parse(JSON.stringify(doc));

  let currentIndex = 0;

  function processNode(node: any): any {
    if (!node) return node;

    if (node.text && typeof node.text === 'string') {
      const built = buildRegex(searchTerm, options);
      if (!built) return node;

      const regex = built.regex;
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;

      while ((match = regex.exec(node.text)) !== null) {
        if (currentIndex === matchIndex) {
          const before = node.text.substring(0, match.index);
          const after = node.text.substring(match.index + match[0].length);
          node.text = before + replacement + after;
          return node;
        }
        currentIndex++;
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }

    if (Array.isArray(node.content)) {
      node.content = node.content.map(processNode);
    }

    if (Array.isArray(node.marks)) {
      node.marks = node.marks.map(processNode);
    }

    return node;
  }

  processNode(newDoc);
  return { doc: newDoc, replaced: true, from, to };
}

/**
 * Get the absolute document position for each match found via findInDocument.
 */
export function resolveMatchPositions(
  doc: any,
  matches: { nodePath: number[]; index: number; end: number; text: string }[]
): { from: number; to: number; text: string }[] {
  const results: { from: number; to: number; text: string }[] = [];

  for (const match of matches) {
    let node = doc;
    for (const idx of match.nodePath) {
      if (node.content && node.content[idx]) {
        node = node.content[idx];
      } else {
        node = null;
        break;
      }
    }

    if (!node || !node.text) continue;

    let pos = 1;
    let parent = doc;

    for (let i = 0; i < match.nodePath.length; i++) {
      const idx = match.nodePath[i];
      if (!parent.content) break;

      for (let j = 0; j < idx; j++) {
        pos += getTextLength(parent.content[j]);
      }

      pos += 1;
      parent = parent.content[idx];
    }

    results.push({
      from: pos + match.index,
      to: pos + match.end,
      text: match.text,
    });
  }

  return results;
}

/**
 * Get the total text length of a node (recursive).
 */
function getTextLength(node: any): number {
  if (!node) return 0;
  if (node.text) return node.text.length;
  if (Array.isArray(node.content)) {
    return node.content.reduce((sum: number, child: any) => sum + getTextLength(child), 0) + 2;
  }
  return 0;
}
