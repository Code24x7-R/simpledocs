// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useCallback, useEffect } from 'react';
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
 * Single-editor model: operates on the entire document content tree.
 */
export default function SearchReplaceModal({ isOpen, onClose }: SearchReplaceModalProps) {
  const { editor, docState, updateContent, setSearchReplaceOpen } = useDocStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [replaceResult, setReplaceResult] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const getSearchOptions = useCallback((): SearchOptions => {
    return { caseSensitive, wholeWord };
  }, [caseSensitive, wholeWord]);

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

  const handleFind = () => {
    if (!searchTerm || !editor) {
      setMatchCount(null);
      setCurrentMatchIndex(-1);
      return;
    }

    const text = editor.getText();
    const results = findAllOccurrences(text, searchTerm, getSearchOptions());
    setMatchCount(results.length);

    if (results.length > 0) {
      const nextIndex = currentMatchIndex >= results.length - 1 ? 0 : currentMatchIndex + 1;
      setCurrentMatchIndex(nextIndex);

      const match = results[nextIndex];
      const from = match.index + 1;
      const to = match.index + match.text.length + 1;
      editor.commands.setTextSelection({ from, to });
      editor.commands.focus();
      scrollMatchIntoView(from, to);
    }

    setReplaceResult(null);
  };

  const handleFindNext = () => {
    if (!editor) return;

    if (matchCount === null || matchCount === 0) {
      handleFind();
      return;
    }

    const text = editor.getText();
    const results = findAllOccurrences(text, searchTerm, getSearchOptions());

    if (results.length === 0) return;

    const nextIndex = currentMatchIndex >= results.length - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(nextIndex);

    const match = results[nextIndex];
    const from = match.index + 1;
    const to = match.index + match.text.length + 1;
    editor.commands.setTextSelection({ from, to });
    editor.commands.focus();
    scrollMatchIntoView(from, to);
  };

  const handleFindPrev = () => {
    if (!editor) return;

    if (matchCount === null || matchCount === 0) {
      handleFind();
      return;
    }

    const text = editor.getText();
    const results = findAllOccurrences(text, searchTerm, getSearchOptions());

    if (results.length === 0) return;

    const prevIndex = currentMatchIndex <= 0 ? results.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);

    const match = results[prevIndex];
    const from = match.index + 1;
    const to = match.index + match.text.length + 1;
    editor.commands.setTextSelection({ from, to });
    editor.commands.focus();
    scrollMatchIntoView(from, to);
  };

  const handleReplace = () => {
    if (!searchTerm) return;

    const result = replaceAllPreservingStyles(docState.content, searchTerm, replaceTerm, getSearchOptions());

    if (result.count > 0) {
      updateContent(result.doc);
      setReplaceResult(`Replaced ${result.count} occurrence${result.count > 1 ? 's' : ''}`);
      setMatchCount(0);
      setCurrentMatchIndex(-1);
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
          setSearchTerm(selectedText);
        }
      }
    }
  }, [isOpen, editor]);

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
