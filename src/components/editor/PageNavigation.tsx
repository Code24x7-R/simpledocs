// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';

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
    currentPage,
    totalPages,
    goToNextPage,
    goToPrevPage,
    goToPage,
    setSearchReplaceOpen,
  } = useDocStore();
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [isEditing, setIsEditing] = useState(false);

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
      // Reset to current page on invalid input
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
              // Only allow numeric input
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

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300 mx-2" />

      {/* Search & Replace Button */}
      <button
        onClick={() => setSearchReplaceOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        title="Search & Replace"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Find</span>
      </button>
    </div>
  );
}
