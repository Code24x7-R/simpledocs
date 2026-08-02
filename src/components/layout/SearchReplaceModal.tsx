import { useState, useCallback, useRef } from 'react';
import { X, Search, Replace } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import { findAllOccurrences, replaceAllOccurrences, SearchOptions } from '../../utils/search';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchReplaceModal({ isOpen, onClose }: SearchReplaceModalProps) {
  const { editor, setSearchReplaceOpen } = useDocStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [replaceResult, setReplaceResult] = useState<string | null>(null);
  const matchesRef = useRef<{ index: number; end: number }[]>([]);

  const getSearchOptions = useCallback((): SearchOptions => {
    return { caseSensitive, wholeWord };
  }, [caseSensitive, wholeWord]);

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

      // Select the match in the editor
      const match = results[nextIndex];
      editor.commands.setTextSelection({ from: match.index + 1, to: match.end + 1 });

      // Scroll the editor to show the selection
      const selection = editor.view.state.selection;
      const coords = editor.view.coordsAtPos(selection.from);
      const editorEl = document.querySelector('.tiptap') as HTMLElement;
      if (editorEl && coords) {
        editorEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    setReplaceResult(null);
  };

  const handleReplace = () => {
    if (!editor || !searchTerm) return;
    const text = editor.getText();
    const result = replaceAllOccurrences(text, searchTerm, replaceTerm, getSearchOptions());
    if (result.count > 0) {
      editor.commands.setContent(result.text);
      setReplaceResult(`Replaced ${result.count} occurrence${result.count > 1 ? 's' : ''}`);
      setMatchCount(0);
      matchesRef.current = [];
      setCurrentMatchIndex(-1);
    } else {
      setReplaceResult('No matches found');
    }
  };

  const handleClose = () => {
    setSearchReplaceOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Search & Replace</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                placeholder="Search for..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleFind}
              disabled={!searchTerm}
              className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Find
            </button>
          </div>

          {/* Replace Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Replace className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Replace with..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleReplace}
              disabled={!searchTerm}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Replace All
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded"
              />
              Case sensitive
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded"
              />
              Whole word
            </label>
          </div>

          {/* Results */}
          {matchCount !== null && (
            <div className="text-sm text-gray-600 py-2 px-3 bg-gray-50 rounded">
              {matchCount === 0
                ? 'No matches found'
                : currentMatchIndex >= 0
                  ? `Match ${currentMatchIndex + 1} of ${matchCount}`
                  : `${matchCount} match${matchCount > 1 ? 'es' : ''} found`}
            </div>
          )}
          {replaceResult && (
            <div className="text-sm text-green-700 py-2 px-3 bg-green-50 rounded">
              {replaceResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
