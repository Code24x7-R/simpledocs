// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Search, Replace, ChevronDown, ChevronUp } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import { findAllOccurrences, replaceAllPreservingStyles, SearchOptions } from '../../utils/search';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Search & Replace Panel
 *
 * Positioned at top-right so it doesn't obscure document content.
 * Non-modal - user can interact with document while searching.
 */
export default function SearchReplaceModal({ isOpen, onClose }: SearchReplaceModalProps) {
  const { editor, docState, loadDocument, setSearchReplaceOpen } = useDocStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [replaceResult, setReplaceResult] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const matchesRef = useRef<{ index: number; text: string; end: number }[]>([]);

  const getSearchOptions = useCallback((): SearchOptions => {
    return { caseSensitive, wholeWord };
  }, [caseSensitive, wholeWord]);

  const scrollMatchIntoViewOnPage = (pageEditor: any, from: number, to: number) => {
    if (!pageEditor) return;

    // Use double requestAnimationFrame to ensure selection is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Get coordinates of the selection
        const startCoords = pageEditor.view.coordsAtPos(from);
        const endCoords = pageEditor.view.coordsAtPos(to);

        if (!startCoords || !endCoords) return;

        // Find the scrollable container
        const scrollContainer = document.getElementById('paginated-viewport');
        if (!scrollContainer) return;

        const scrollInner = scrollContainer.querySelector('.overflow-y-auto') as HTMLElement;
        if (!scrollInner) return;

        // Always scroll to center the match in the viewport
        const midY = (startCoords.top + endCoords.bottom) / 2;
        const containerRect = scrollInner.getBoundingClientRect();
        const targetScroll = scrollInner.scrollTop + (midY - containerRect.top - containerRect.height / 2);
        scrollInner.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      });
    });
  };

  // Get the editor instance for a specific page
  const getEditorForPage = (pageIndex: number) => {
    const el = document.querySelector<HTMLElement>(
      `[data-page-editor="${pageIndex}"] .tiptap`
    );
    return el ? (el as any)?.editor : null;
  };

  // Build a combined text map: { pageIndex, offset, text }
  const buildCombinedText = () => {
    const pages: { pageIndex: number; offset: number; text: string }[] = [];
    let offset = 0;
    for (let i = 0; i < docState.pages.length; i++) {
      const pageEditor = getEditorForPage(i);
      const text = pageEditor ? pageEditor.getText() : '';
      pages.push({ pageIndex: i, offset, text });
      offset += text.length + 1; // +1 for page separator
    }
    return pages;
  };

  // Find which page a global index belongs to
  const findPageForIndex = (globalIndex: number, pages: { pageIndex: number; offset: number; text: string }[]) => {
    for (let i = pages.length - 1; i >= 0; i--) {
      if (globalIndex >= pages[i].offset) {
        return {
          pageIndex: pages[i].pageIndex,
          localIndex: globalIndex - pages[i].offset,
        };
      }
    }
    return { pageIndex: 0, localIndex: globalIndex };
  };

  const handleFind = () => {
    if (!searchTerm) {
      setMatchCount(null);
      matchesRef.current = [];
      setCurrentMatchIndex(-1);
      return;
    }

    // Build combined text from all pages
    const pageTexts = buildCombinedText();
    const combinedText = pageTexts.map(p => p.text).join('\n');
    const results = findAllOccurrences(combinedText, searchTerm, getSearchOptions());
    matchesRef.current = results;
    setMatchCount(results.length);

    if (results.length > 0) {
      // Move to next match (or first match if at end)
      const nextIndex = currentMatchIndex >= results.length - 1 ? 0 : currentMatchIndex + 1;
      setCurrentMatchIndex(nextIndex);

      // Navigate to the page containing this match
      const match = results[nextIndex];
      const { pageIndex, localIndex } = findPageForIndex(match.index, pageTexts);
      const pageEditor = getEditorForPage(pageIndex);
      if (pageEditor) {
        pageEditor.commands.focus();
        const from = localIndex + 1;
        const to = localIndex + match.text.length + 1;
        pageEditor.commands.setTextSelection({ from, to });
        scrollMatchIntoViewOnPage(pageEditor, from, to);
      }
    }

    setReplaceResult(null);
  };

  const handleFindNext = () => {
    if (matchesRef.current.length === 0) {
      handleFind();
      return;
    }

    const nextIndex = currentMatchIndex >= matchesRef.current.length - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(nextIndex);

    const match = matchesRef.current[nextIndex];
    const pageTexts = buildCombinedText();
    const { pageIndex, localIndex } = findPageForIndex(match.index, pageTexts);
    const pageEditor = getEditorForPage(pageIndex);
    if (pageEditor) {
      pageEditor.commands.focus();
      const from = localIndex + 1;
      const to = localIndex + match.text.length + 1;
      pageEditor.commands.setTextSelection({ from, to });
      scrollMatchIntoViewOnPage(pageEditor, from, to);
    }
  };

  const handleFindPrev = () => {
    if (matchesRef.current.length === 0) {
      handleFind();
      return;
    }

    const prevIndex = currentMatchIndex <= 0 ? matchesRef.current.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);

    const match = matchesRef.current[prevIndex];
    const pageTexts = buildCombinedText();
    const { pageIndex, localIndex } = findPageForIndex(match.index, pageTexts);
    const pageEditor = getEditorForPage(pageIndex);
    if (pageEditor) {
      pageEditor.commands.focus();
      const from = localIndex + 1;
      const to = localIndex + match.text.length + 1;
      pageEditor.commands.setTextSelection({ from, to });
      scrollMatchIntoViewOnPage(pageEditor, from, to);
    }
  };

  const handleReplace = () => {
    if (!searchTerm) return;
    // Replace across all pages
    let totalReplaced = 0;
    const updatedPages = docState.pages.map((page) => {
      const result = replaceAllPreservingStyles(page.content, searchTerm, replaceTerm, getSearchOptions());
      totalReplaced += result.count;
      return { ...page, content: result.doc };
    });

    if (totalReplaced > 0) {
      loadDocument({ ...docState, pages: updatedPages, updatedAt: new Date().toISOString() });
      setReplaceResult(`Replaced ${totalReplaced} occurrence${totalReplaced > 1 ? 's' : ''}`);
      setMatchCount(0);
      matchesRef.current = [];
      setCurrentMatchIndex(-1);
    } else {
      setReplaceResult('No matches found');
    }
  };

  // Keyboard shortcuts: F3 = find next, Shift+F3 = find prev
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          handleFindPrev();
        } else {
          handleFindNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleClose = () => {
    // Clear selection when closing
    if (editor) {
      editor.commands.setTextSelection({ from: editor.state.selection.to, to: editor.state.selection.to });
    }
    setSearchReplaceOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[420px]">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Find & Replace
          </button>
          <button onClick={handleClose} className="p-1 hover:bg-gray-200 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {isExpanded && (
          <div className="p-3 space-y-2">
            {/* Search Input */}
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        handleFindPrev();
                      } else {
                        handleFindNext();
                      }
                    }
                  }}
                  placeholder="Search for..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              <button
                onClick={handleFindPrev}
                disabled={!searchTerm}
                className="p-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous match"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFindNext}
                disabled={!searchTerm}
                className="p-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next match"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Replace Input */}
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <Replace className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  placeholder="Replace with..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={handleReplace}
                disabled={!searchTerm}
                className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Replace All
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="rounded"
                />
                Case
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(e) => setWholeWord(e.target.checked)}
                  className="rounded"
                />
                Word
              </label>
            </div>

            {/* Results */}
            {matchCount !== null && (
              <div className="text-xs py-1.5 px-2 bg-gray-50 rounded border border-gray-200">
                {matchCount === 0 ? (
                  <span className="text-red-600">No matches found</span>
                ) : (
                  <span className="text-gray-700">
                    <span className="font-bold text-blue-700">{currentMatchIndex + 1}</span>
                    <span className="text-gray-500"> of </span>
                    <span className="font-bold">{matchCount}</span>
                    <span className="text-gray-500"> matches</span>
                  </span>
                )}
              </div>
            )}
            {replaceResult && (
              <div className="text-xs py-1.5 px-2 bg-green-50 rounded border border-green-200 text-green-700">
                {replaceResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
