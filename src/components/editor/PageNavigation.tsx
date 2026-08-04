// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import { formatReadingTime } from '../../utils/textStats';

/**
 * Page Navigation Controls
 *
 * Provides:
 * - Previous/Next page buttons
 * - Current page indicator (editable for direct jump)
 * - Total pages display
 */
export default function PageNavigation() {
  const {
    editor,
    currentPage,
    totalPages,
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = useDocStore();
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [stats, setStats] = useState({ words: 0, characters: 0, readingTimeMinutes: 1 });

  // Track cursor position and text stats from the editor
  useEffect(() => {
    if (!editor) return;

    const updateStats = () => {
      const { selection } = editor.state;
      const { from } = selection;
      const resolved = editor.state.doc.resolve(from);
      const line = resolved.index(0) + 1;
      const col = resolved.parentOffset + 1;
      setCursorPos({ line, col });

      // Update text stats from editor storage
      const characterCount = editor.storage.characterCount;
      if (characterCount) {
        setStats({
          words: characterCount.words(),
          characters: characterCount.characters(),
          readingTimeMinutes: Math.max(1, Math.round(characterCount.words() / 200)),
        });
      }
    };

    editor.on('selectionUpdate', updateStats);
    editor.on('update', updateStats);
    updateStats();

    return () => {
      editor.off('selectionUpdate', updateStats);
      editor.off('update', updateStats);
    };
  }, [editor]);

  // Sync input with store when page changes externally
  if (!isEditing && pageInput !== String(currentPage)) {
    setPageInput(String(currentPage));
  }

  const handlePageSubmit = () => {
    const trimmed = pageInput.trim();
    const page = parseInt(trimmed, 10);
    if (trimmed && !isNaN(page) && page >= 1) {
      goToPage(page);
    } else {
      setPageInput(String(currentPage));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageSubmit();
    } else if (e.key === 'Escape') {
      setPageInput(String(currentPage));
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 border-b border-gray-200">
      {/* Previous Page */}
      <button
        onClick={goToPrevPage}
        disabled={currentPage <= 1}
        className="p-1.5 rounded hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous Page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Indicator */}
      <div className="flex items-center gap-1 text-sm">
        {isEditing ? (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setPageInput(val);
            }}
            onBlur={handlePageSubmit}
            onKeyDown={handleKeyDown}
            className="w-10 text-center border border-gray-300 rounded px-1 py-0.5"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-0.5 rounded hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-w-[2rem] text-center"
            title="Click to jump to page"
          >
            {currentPage}
          </button>
        )}
        <span className="text-gray-500">of</span>
        <span className="min-w-[2rem] text-center">{totalPages}</span>
      </div>

      {/* Next Page */}
      <button
        onClick={goToNextPage}
        disabled={currentPage >= totalPages}
        className="p-1.5 rounded hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next Page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Cursor Position */}
      <div className="ml-4 text-xs text-gray-500 border-l border-gray-300 pl-4">
        Ln {cursorPos.line}, Col {cursorPos.col}
      </div>

      {/* Text Stats */}
      <div className="ml-4 text-xs text-gray-500 border-l border-gray-300 pl-4">
        {stats.words} words · {stats.characters} chars · {formatReadingTime(stats.readingTimeMinutes)}
      </div>
    </div>
  );
}
