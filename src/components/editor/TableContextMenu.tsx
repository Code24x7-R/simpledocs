// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEffect, useRef } from 'react';
import { type Editor } from '@tiptap/core';
import {
  Minus,
  Merge,
  Split,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface TableContextMenuProps {
  x: number;
  y: number;
  editor: Editor;
  onClose: () => void;
}

/**
 * TableContextMenu — right-click menu for table cell operations.
 *
 * Features:
 * - Add row above/below
 * - Add column left/right
 * - Delete row/column
 * - Merge cells (when multiple cells selected)
 * - Split cell (when merged cell is selected)
 * - Toggle header row/column
 */
export default function TableContextMenu({ x, y, editor, onClose }: TableContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the right-click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Check if we're in a table and what operations are available
  const isInTable = editor?.isActive('table') ?? false;
  const canMerge = editor?.can().mergeCells?.() ?? false;
  const canSplit = editor?.can().splitCell?.() ?? false;
  const canAddRowBefore = editor?.can().addRowBefore?.() ?? false;
  const canAddRowAfter = editor?.can().addRowAfter?.() ?? false;
  const canAddColumnBefore = editor?.can().addColumnBefore?.() ?? false;
  const canAddColumnAfter = editor?.can().addColumnAfter?.() ?? false;
  const canDeleteRow = editor?.can().deleteRow?.() ?? false;
  const canDeleteColumn = editor?.can().deleteColumn?.() ?? false;

  if (!isInTable) return null;

  // Adjust position to keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  const handleCommand = (command: () => void) => {
    command();
    onClose();
  };

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    danger = false,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  }) => (
    <button
      onClick={() => handleCommand(onClick)}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left rounded transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 disabled:text-red-300'
          : 'text-gray-700 hover:bg-gray-100 disabled:text-gray-300'
      } disabled:cursor-not-allowed`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  );

  const Separator = () => <div className="border-t border-gray-100 my-1" />;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-52"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Row operations */}
      <MenuItem
        icon={ArrowUp}
        label="Add Row Above"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        disabled={!canAddRowBefore}
      />
      <MenuItem
        icon={ArrowDown}
        label="Add Row Below"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!canAddRowAfter}
      />
      <MenuItem
        icon={Minus}
        label="Delete Row"
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!canDeleteRow}
        danger
      />

      <Separator />

      {/* Column operations */}
      <MenuItem
        icon={ArrowLeft}
        label="Add Column Left"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        disabled={!canAddColumnBefore}
      />
      <MenuItem
        icon={ArrowRight}
        label="Add Column Right"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!canAddColumnAfter}
      />
      <MenuItem
        icon={Minus}
        label="Delete Column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!canDeleteColumn}
        danger
      />

      <Separator />

      {/* Cell operations */}
      <MenuItem
        icon={Merge}
        label="Merge Cells"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!canMerge}
      />
      <MenuItem
        icon={Split}
        label="Split Cell"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!canSplit}
      />

      <Separator />

      {/* Header toggles */}
      <MenuItem
        icon={RotateCcw}
        label="Toggle Header Row"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      />
      <MenuItem
        icon={RotateCcw}
        label="Toggle Header Column"
        onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
      />
    </div>
  );
}
