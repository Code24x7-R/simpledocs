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
