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
    { keys: ['Ctrl', 'Shift', 'X'], description: 'Strikethrough' },
  ]},
  { category: 'Editing', items: [
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternate)' },
  ]},
  { category: 'Selection', items: [
    { keys: ['Ctrl', 'A'], description: 'Select all' },
    { keys: ['Ctrl', 'C'], description: 'Copy' },
    { keys: ['Ctrl', 'V'], description: 'Paste' },
    { keys: ['Ctrl', 'X'], description: 'Cut' },
  ]},
  { category: 'Document', items: [
    { keys: ['Ctrl', 'Enter'], description: 'Insert page break' },
    { keys: ['Ctrl', 'S'], description: 'Save (browser)' },
    { keys: ['Ctrl', 'P'], description: 'Print' },
  ]},
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-y-auto">
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
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded shadow-sm">
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
