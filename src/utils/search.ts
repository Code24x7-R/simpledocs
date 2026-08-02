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
}

/**
 * Find all occurrences of a search term in text.
 *
 * @param text - Text to search in
 * @param searchTerm - Term to search for
 * @param options - Search options
 * @returns Array of search results
 */
export function findAllOccurrences(
  text: string,
  searchTerm: string,
  options: SearchOptions = { caseSensitive: false, wholeWord: false }
): SearchResult[] {
  if (!searchTerm) return [];

  const results: SearchResult[] = [];
  const flags = options.caseSensitive ? 'g' : 'gi';

  let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const regex = new RegExp(pattern, flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    results.push({
      index: match.index,
      text: match[0],
      end: match.index + match[0].length,
    });
  }

  return results;
}

/**
 * Replace all occurrences of a search term with replacement text.
 * Works with plain text - loses formatting.
 *
 * @param text - Original text
 * @param searchTerm - Term to replace
 * @param replacement - Replacement text
 * @param options - Search options
 * @returns Object with new text and count of replacements
 */
export function replaceAllOccurrences(
  text: string,
  searchTerm: string,
  replacement: string,
  options: SearchOptions = { caseSensitive: false, wholeWord: false }
): { text: string; count: number } {
  if (!searchTerm) return { text, count: 0 };

  const flags = options.caseSensitive ? 'g' : 'gi';

  let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const regex = new RegExp(pattern, flags);
  const matches = text.match(regex);
  const count = matches ? matches.length : 0;
  const newText = text.replace(regex, replacement);

  return { text: newText, count };
}

/**
 * Count occurrences of a search term in text.
 *
 * @param text - Text to search
 * @param searchTerm - Term to count
 * @param options - Search options
 * @returns Number of occurrences
 */
export function countOccurrences(
  text: string,
  searchTerm: string,
  options: SearchOptions = { caseSensitive: false, wholeWord: false }
): number {
  return findAllOccurrences(text, searchTerm, options).length;
}

/**
 * Replace text while preserving document structure and formatting.
 * Works with Tiptap/ProseMirror JSON document format.
 *
 * @param doc - Document JSON (Tiptap/ProseMirror format)
 * @param searchTerm - Term to search for
 * @param replacement - Replacement text
 * @param options - Search options
 * @returns Object with new document and count of replacements
 */
export function replaceAllPreservingStyles(
  doc: any,
  searchTerm: string,
  replacement: string,
  options: SearchOptions = { caseSensitive: false, wholeWord: false }
): { doc: any; count: number } {
  if (!searchTerm) return { doc, count: 0 };

  let totalCount = 0;

  // Deep clone the document to avoid mutating the original
  const newDoc = JSON.parse(JSON.stringify(doc));

  // Recursively process all nodes
  function processNode(node: any): any {
    if (!node) return node;

    // Process text content within the node
    if (node.text && typeof node.text === 'string') {
      const flags = options.caseSensitive ? 'g' : 'gi';
      let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const regex = new RegExp(pattern, flags);
      const matches = node.text.match(regex);
      if (matches) {
        totalCount += matches.length;
        node.text = node.text.replace(regex, replacement);
      }
    }

    // Recursively process content array
    if (Array.isArray(node.content)) {
      node.content = node.content.map(processNode);
    }

    // Process marks (inline formatting)
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
 * Used for navigating to matches while preserving context.
 *
 * @param doc - Document JSON
 * @param searchTerm - Term to search
 * @param options - Search options
 * @returns Array of match info with node index and position
 */
export function findInDocument(
  doc: any,
  searchTerm: string,
  options: SearchOptions = { caseSensitive: false, wholeWord: false }
): { nodePath: number[]; index: number; end: number; text: string }[] {
  if (!searchTerm) return [];

  const results: { nodePath: number[]; index: number; end: number; text: string }[] = [];
  const flags = options.caseSensitive ? 'g' : 'gi';
  let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }
  const regex = new RegExp(pattern, flags);

  function searchNode(node: any, path: number[]) {
    if (!node) return;

    if (node.text && typeof node.text === 'string') {
      let match: RegExpExecArray | null;
      regex.lastIndex = 0; // Reset regex
      while ((match = regex.exec(node.text)) !== null) {
        results.push({
          nodePath: [...path],
          index: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
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
