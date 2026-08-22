// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect, useMemo } from 'react';
import { X, List, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import {
  extractHeadings,
  buildTocContent,
  assignHeadingAnchors,
  wrapTocInContainer,
  hasExistingToc,
  removeExistingToc,
  type TocEntry,
} from '../../utils/tableOfContents';

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user confirms TOC insertion/replacement */
  onInsert: (content: Record<string, unknown>, docWithAnchors: Record<string, unknown>) => void;
}

/**
 * Table of Contents Modal
 *
 * Scans the document for headings, previews the generated TOC, and
 * allows the user to insert it. If a TOC already exists, prompts to
 * replace it.
 */
export default function TableOfContentsModal({ isOpen, onClose, onInsert }: TableOfContentsModalProps) {
  const { docState } = useDocStore();
  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(6);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);

  // Check if document already has a TOC
  const existingToc = useMemo(() => hasExistingToc(docState.content), [docState.content]);

  // Extract headings based on level filters
  const entries: TocEntry[] = useMemo(
    () => extractHeadings(docState.content, { minLevel, maxLevel }),
    [docState.content, minLevel, maxLevel]
  );

  // Reset confirmation when modal opens
  useEffect(() => {
    if (isOpen) {
      setReplaceConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInsert = () => {
    // buildTocContent returns tocEntry nodes; wrap in container for insertion
    const tocNode = wrapTocInContainer(buildTocContent(entries));

    // Assign anchor IDs to headings in the document
    const docWithAnchors = assignHeadingAnchors(docState.content, entries);

    // If existing TOC, remove it first then insert new one at that position
    let finalDoc = docWithAnchors;
    if (existingToc && replaceConfirmed) {
      finalDoc = removeExistingToc(docWithAnchors);
    }

    onInsert(tocNode, finalDoc);
  };

  const handleReplace = () => {
    setReplaceConfirmed(true);
    handleInsert();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold">Table of Contents</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing TOC warning */}
        {existingToc && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">A Table of Contents already exists</p>
              <p className="text-amber-600 mt-0.5">
                Generating a new one will replace the existing TOC. The old content will be removed.
              </p>
            </div>
          </div>
        )}

        {/* Level filter */}
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>From level:</span>
            <select
              value={minLevel}
              onChange={(e) => setMinLevel(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <option key={l} value={l}>H{l}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>To level:</span>
            <select
              value={maxLevel}
              onChange={(e) => setMaxLevel(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {[1, 2, 3, 4, 5, 6]
                .filter((l) => l >= minLevel)
                .map((l) => (
                  <option key={l} value={l}>H{l}</option>
                ))}
            </select>
          </label>
        </div>

        {/* Preview — mirrors the flex layout of a real tocEntry */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Preview</div>
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No headings found for the selected levels. Add headings to your document first.
              </p>
            ) : (
              <div className="space-y-1">
                {entries.map((entry, i) => (
                  <div
                    key={i}
                    className="toc-entry text-xs"
                    style={{ paddingLeft: `${(entry.level - minLevel) * 16}px` }}
                  >
                    <span className="toc-entry-link text-blue-600 hover:underline cursor-pointer">
                      {entry.text || '(empty heading)'}
                    </span>
                    <span className="toc-leader" />
                    <span className="toc-page text-gray-700">{entry.page}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {entries.length} heading{entries.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 text-[11px] text-gray-500 bg-blue-50 border border-blue-100 rounded p-2">
          The TOC is generated from heading styles in your document. Each entry links to its
          heading and shows the page number. Replace the TOC at any time to refresh it.
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          {existingToc ? (
            <button
              type="button"
              onClick={handleReplace}
              disabled={entries.length === 0}
              className="px-4 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replace TOC
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInsert}
              disabled={entries.length === 0}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Insert TOC
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
