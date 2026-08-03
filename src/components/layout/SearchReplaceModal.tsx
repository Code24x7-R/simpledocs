// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Search, Replace, ChevronDown, ChevronUp, Regex } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import {
  findAllOccurrences,
  replaceAllPreservingStyles,
  replaceOnePreservingStyles,
  SearchOptions,
} from '../../utils/search';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Search & Replace Panel
 *
 * Features:
 * - Find Next / Find Previous with keyboard navigation (F3 / Shift+F3)
 * - Replace One — replace current match and advance
 * - Replace All — replace all occurrences
 * - Case sensitive, whole word, and regex options
 * - Live match count as you type
 * - Opens with Ctrl+H or Ctrl+F (when no text selected)
 */
export default function SearchReplaceModal({ isOpen, onClose }: SearchReplaceModalProps) {
  const { editor, docState, updateContent, setSearchReplaceOpen } = useDocStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [replaceResult, setReplaceResult] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [allMatches, setAllMatches] = useState<{ from: number; to: number; text: string }[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSearchOptions = useCallback((): SearchOptions => {
    return { caseSensitive, wholeWord, regex: useRegex };
  }, [caseSensitive, wholeWord, useRegex]);

  // Live search with debounce
  const debouncedSearch = useCallback(
    (term: string, options: SearchOptions) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        if (!term || !editor) {
          setMatchCount(null);
          setAllMatches([]);
          setCurrentMatchIndex(-1);
          return;
        }
        const text = editor.getText();
        const results = findAllOccurrences(text, term, options);
        setMatchCount(results.length);
        setAllMatches(results.map((r) => ({
          from: r.index + 1,
          to: r.index + r.text.length + 1,
          text: r.text,
        })));
        setCurrentMatchIndex(results.length > 0 ? 0 : -1);
        setReplaceResult(null);
      }, 150);
    },
    [editor]
  );

  // Trigger live search when searchTerm or options change
  useEffect(() => {
    if (!isOpen) return;
    debouncedSearch(searchTerm, getSearchOptions());
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm, caseSensitive, wholeWord, useRegex, isOpen, debouncedSearch, getSearchOptions]);

  const scrollMatchIntoView = (from: number, to: number) => {
    if (!editor) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const startCoords = editor.view.coordsAtPos(from);
        const endCoords = editor.view.coordsAtPos(to);

        if (!startCoords || !endCoords) return;

        const scrollContainer = document.getElementById('paginated-viewport');
        if (!scrollContainer) return;

        const midY = (startCoords.top + endCoords.bottom) / 2;
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetScroll = scrollContainer.scrollTop + (midY - containerRect.top - containerRect.height / 2);
        scrollContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      });
    });
  };

  const navigateToMatch = (index: number) => {
    if (!editor || allMatches.length === 0) return;

    const match = allMatches[index];
    editor.commands.setTextSelection({ from: match.from, to: match.to });
    editor.commands.focus();
    scrollMatchIntoView(match.from, match.to);
    setCurrentMatchIndex(index);
  };

  const handleFind = () => {
    if (!searchTerm || !editor) {
      setMatchCount(null);
      setCurrentMatchIndex(-1);
      return;
    }

    if (allMatches.length > 0) {
      const nextIndex = currentMatchIndex >= allMatches.length - 1 ? 0 : currentMatchIndex + 1;
      navigateToMatch(nextIndex);
    }

    setReplaceResult(null);
  };

  const handleFindNext = () => {
    if (!editor) return;

    if (matchCount === null || matchCount === 0 || allMatches.length === 0) {
      handleFind();
      return;
    }

    const nextIndex = currentMatchIndex >= allMatches.length - 1 ? 0 : currentMatchIndex + 1;
    navigateToMatch(nextIndex);
  };

  const handleFindPrev = () => {
    if (!editor) return;

    if (matchCount === null || matchCount === 0 || allMatches.length === 0) {
      handleFind();
      return;
    }

    const prevIndex = currentMatchIndex <= 0 ? allMatches.length - 1 : currentMatchIndex - 1;
    navigateToMatch(prevIndex);
  };

  const handleReplaceOne = () => {
    if (!searchTerm || !editor || allMatches.length === 0) return;

    const currentMatch = allMatches[currentMatchIndex >= 0 ? currentMatchIndex : 0];
    if (!currentMatch) return;

    const result = replaceOnePreservingStyles(
      docState.content,
      searchTerm,
      replaceTerm,
      currentMatchIndex >= 0 ? currentMatchIndex : 0,
      getSearchOptions()
    );

    if (result.replaced) {
      updateContent(result.doc);
      setReplaceResult('Replaced 1 occurrence');

      // Re-run search after replace to update matches
      setTimeout(() => {
        const text = editor.getText();
        const newResults = findAllOccurrences(text, searchTerm, getSearchOptions());
        setMatchCount(newResults.length);
        setAllMatches(newResults.map((r) => ({
          from: r.index + 1,
          to: r.index + r.text.length + 1,
          text: r.text,
        })));

        if (newResults.length > 0) {
          const newIndex = currentMatchIndex >= newResults.length ? 0 : Math.min(currentMatchIndex, newResults.length - 1);
          setCurrentMatchIndex(newIndex);
          navigateToMatch(newIndex);
        } else {
          setCurrentMatchIndex(-1);
        }
      }, 50);
    }
  };

  const handleReplaceAll = () => {
    if (!searchTerm) return;

    const result = replaceAllPreservingStyles(docState.content, searchTerm, replaceTerm, getSearchOptions());

    if (result.count > 0) {
      updateContent(result.doc);
      setReplaceResult(`Replaced ${result.count} occurrence${result.count > 1 ? 's' : ''}`);
      setMatchCount(0);
      setCurrentMatchIndex(-1);
      setAllMatches([]);
    } else {
      setReplaceResult('No matches found');
    }
  };

  // Prepopulate search input with selected text when dialog opens
  useEffect(() => {
    if (isOpen && editor) {
      const { selection } = editor.state;
      if (!selection.empty) {
        const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
        if (selectedText && selectedText.length > 0 && selectedText.length < 200) {
          // Escape regex special chars when pasting selection
          setSearchTerm(selectedText);
        }
      }
    }
  }, [isOpen, editor]);

  // Keyboard shortcuts: F3 = find next, Shift+F3 = find prev, Ctrl+H = open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+H or Ctrl+F to open search/replace
      if ((e.key === 'h' || e.key === 'f') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSearchReplaceOpen(true);
        return;
      }

      // F3 / Shift+F3 only when dialog is open
      if (!isOpen) return;

      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          handleFindPrev();
        } else {
          handleFindNext();
        }
      }

      // Escape to close
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleClose = () => {
    if (editor) {
      editor.commands.setTextSelection({ from: editor.state.selection.to, to: editor.state.selection.to });
    }
    setSearchReplaceOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[460px]">
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
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">Ctrl+H</span>
            <button onClick={handleClose} className="p-1 hover:bg-gray-200 rounded" title="Close search panel">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
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
                  placeholder={useRegex ? "Regex pattern..." : "Search for..."}
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              <button
                onClick={handleFindPrev}
                disabled={!searchTerm || allMatches.length === 0}
                className="p-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous match (Shift+F3)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFindNext}
                disabled={!searchTerm || allMatches.length === 0}
                className="p-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next match (F3)"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleReplaceOne();
                    }
                  }}
                  placeholder="Replace with..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={handleReplaceOne}
                disabled={!searchTerm || allMatches.length === 0}
                className="px-2 py-1.5 text-xs bg-gray-100 border border-gray-300 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Replace one (Ctrl+Enter)"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={!searchTerm}
                className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                All
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  id="search-case"
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="rounded"
                />
                Case
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  id="search-word"
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(e) => setWholeWord(e.target.checked)}
                  className="rounded"
                />
                Word
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  id="search-regex"
                  type="checkbox"
                  checked={useRegex}
                  onChange={(e) => setUseRegex(e.target.checked)}
                  className="rounded"
                />
                <Regex className="w-3 h-3" />
                Regex
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

            {/* Hint */}
            <div className="text-[10px] text-gray-400 text-center pt-1">
              F3 Next · Shift+F3 Prev · Ctrl+Enter Replace · Esc Close
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
