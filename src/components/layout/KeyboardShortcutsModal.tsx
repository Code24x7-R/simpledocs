// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { category: 'Text Formatting', items: [
    { keys: ['Ctrl', 'B'], description: 'Bold' },
    { keys: ['Ctrl', 'I'], description: 'Italic' },
    { keys: ['Ctrl', 'U'], description: 'Underline' },
    { keys: ['Ctrl', 'Shift', 'S'], description: 'Strikethrough' },
    { keys: ['Ctrl', 'E'], description: 'Inline code' },
    { keys: ['Ctrl', 'K'], description: 'Insert link' },
  ]},
  { category: 'Headings', items: [
    { keys: ['Ctrl', 'Alt', '1'], description: 'Heading 1' },
    { keys: ['Ctrl', 'Alt', '2'], description: 'Heading 2' },
    { keys: ['Ctrl', 'Alt', '3'], description: 'Heading 3' },
    { keys: ['Ctrl', 'Alt', '4'], description: 'Heading 4' },
    { keys: ['Ctrl', 'Alt', '5'], description: 'Heading 5' },
    { keys: ['Ctrl', 'Alt', '6'], description: 'Heading 6' },
  ]},
  { category: 'Paragraph Styles', items: [
    { keys: ['Ctrl', 'Shift', 'B'], description: 'Blockquote' },
    { keys: ['Ctrl', 'Alt', 'C'], description: 'Code block' },
    { keys: ['Ctrl', 'Shift', 'L'], description: 'Align left' },
    { keys: ['Ctrl', 'Shift', 'E'], description: 'Align center' },
    { keys: ['Ctrl', 'Shift', 'R'], description: 'Align right' },
    { keys: ['Ctrl', 'Shift', 'J'], description: 'Justify' },
  ]},
  { category: 'Editing', items: [
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternate)' },
    { keys: ['Ctrl', 'A'], description: 'Select all' },
    { keys: ['Ctrl', 'C'], description: 'Copy' },
    { keys: ['Ctrl', 'V'], description: 'Paste' },
    { keys: ['Ctrl', 'X'], description: 'Cut' },
    { keys: ['Enter'], description: 'New line / split block' },
    { keys: ['Shift', 'Enter'], description: 'Line break (soft return)' },
    { keys: ['Backspace'], description: 'Delete / merge with previous page' },
    { keys: ['Delete'], description: 'Delete forward' },
  ]},
  { category: 'Page Navigation', items: [
    { keys: ['Arrow Down'], description: 'Next line (or next page at end)' },
    { keys: ['Arrow Up'], description: 'Previous line (or prev page at start)' },
    { keys: ['PageDown'], description: 'Jump to next page' },
    { keys: ['PageUp'], description: 'Jump to previous page' },
    { keys: ['Ctrl', 'Enter'], description: 'Insert page break' },
  ]},
  { category: 'Search & Replace', items: [
    { keys: ['Ctrl', 'H'], description: 'Find & Replace' },
    { keys: ['Ctrl', 'F'], description: 'Find (open panel)' },
    { keys: ['F3'], description: 'Find next match' },
    { keys: ['Shift', 'F3'], description: 'Find previous match' },
    { keys: ['Ctrl', 'Enter'], description: 'Replace current match' },
    { keys: ['Escape'], description: 'Close search panel' },
  ]},
  { category: 'View', items: [
    { keys: ['Ctrl', 'Shift', 'F'], description: 'Toggle full-bleed view' },
  ]},
  { category: 'Document', items: [
    { keys: ['Ctrl', 'S'], description: 'Save (browser default)' },
    { keys: ['Ctrl', 'P'], description: 'Print' },
  ]},
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{section.category}</h3>
              <div className="space-y-1">
                {section.items.map((shortcut) => (
                  <div key={shortcut.description} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                    <span className="text-sm text-gray-600">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded shadow-sm min-w-[1.5rem] text-center">
                            {key}
                          </kbd>
                          {idx < shortcut.keys.length - 1 && (
                            <span className="text-xs text-gray-400">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Tip: Many standard browser shortcuts also work for text editing.
          </p>
        </div>
      </div>
    </div>
  );
}
