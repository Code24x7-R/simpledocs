import { useState, useCallback, useRef } from 'react';
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
  const { editor, setSearchReplaceOpen } = useDocStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [replaceResult, setReplaceResult] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const matchesRef = useRef<{ index: number; end: number }[]>([]);

  const getSearchOptions = useCallback((): SearchOptions => {
    return { caseSensitive, wholeWord };
  }, [caseSensitive, wholeWord]);

  const scrollMatchIntoView = (from: number, to: number) => {
    if (!editor) return;

    // First, ensure editor has focus so selection is visible
    editor.commands.focus();

    // Set the selection again to ensure it's active
    editor.commands.setTextSelection({ from, to });

    // Use requestAnimationFrame to wait for the selection to render
    requestAnimationFrame(() => {
      // Get coordinates of the selection
      const startCoords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);

      if (!startCoords || !endCoords) return;

      // Find the scrollable container
      const scrollContainer = document.getElementById('paginated-viewport');
      if (!scrollContainer) return;

      const scrollInner = scrollContainer.querySelector('.overflow-y-auto') as HTMLElement;
      if (!scrollInner) return;

      // Calculate the middle of the selection relative to viewport
      const midY = (startCoords.top + endCoords.bottom) / 2;
      const containerRect = scrollInner.getBoundingClientRect();

      // Check if selection is outside visible area
      if (midY < containerRect.top + 60 || midY > containerRect.bottom - 60) {
        // Calculate scroll offset to center the selection
        const targetScroll = scrollInner.scrollTop + (midY - containerRect.top - containerRect.height / 2);
        scrollInner.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    });
  };

  const handleFind = () => {
    if (!editor || !searchTerm) {
      setMatchCount(null);
      matchesRef.current = [];
      setCurrentMatchIndex(-1);
      return;
    }

    const text = editor.getText();
    const results = findAllOccurrences(text, searchTerm, getSearchOptions());
    matchesRef.current = results;
    setMatchCount(results.length);

    if (results.length > 0) {
      // Move to next match (or first match if at end)
      const nextIndex = currentMatchIndex >= results.length - 1 ? 0 : currentMatchIndex + 1;
      setCurrentMatchIndex(nextIndex);

      // Select the match in the editor (this highlights it)
      const match = results[nextIndex];
      const from = match.index + 1;
      const to = match.end + 1;
      editor.commands.setTextSelection({ from, to });

      // Scroll to make the match visible (focus editor first so selection shows)
      scrollMatchIntoView(from, to);
    }

    setReplaceResult(null);
  };

  const handleFindNext = () => {
    if (matchesRef.current.length === 0) {
      handleFind();
      return;
    }
    if (!editor) return;

    const nextIndex = currentMatchIndex >= matchesRef.current.length - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(nextIndex);

    const match = matchesRef.current[nextIndex];
    const from = match.index + 1;
    const to = match.end + 1;
    editor.commands.setTextSelection({ from, to });
    scrollMatchIntoView(from, to);
  };

  const handleFindPrev = () => {
    if (matchesRef.current.length === 0) {
      handleFind();
      return;
    }
    if (!editor) return;

    const prevIndex = currentMatchIndex <= 0 ? matchesRef.current.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);

    const match = matchesRef.current[prevIndex];
    const from = match.index + 1;
    const to = match.end + 1;
    editor.commands.setTextSelection({ from, to });
    scrollMatchIntoView(from, to);
  };

  const handleReplace = () => {
    if (!editor || !searchTerm) return;
    // Use JSON-based replacement to preserve formatting (bold, italic, etc.)
    const docJSON = editor.getJSON();
    const result = replaceAllPreservingStyles(docJSON, searchTerm, replaceTerm, getSearchOptions());
    if (result.count > 0) {
      editor.commands.setContent(result.doc, { emitUpdate: true });
      setReplaceResult(`Replaced ${result.count} occurrence${result.count > 1 ? 's' : ''}`);
      setMatchCount(0);
      matchesRef.current = [];
      setCurrentMatchIndex(-1);
    } else {
      setReplaceResult('No matches found');
    }
  };

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
    <div className="fixed top-16 right-4 z-50 w-[380px]">
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
                    <span className="font-medium text-blue-700">{currentMatchIndex + 1}</span>
                    <span className="text-gray-500"> of </span>
                    <span className="font-medium">{matchCount}</span>
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
