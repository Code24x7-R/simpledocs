// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState } from 'react';
import { X } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import Modal from './Modal';

const MAX_GRID = 10;

export default function TableGridModal() {
  const { tableGridOpen, setTableGridOpen, setTableGridSize, editor } = useDocStore();
  const [hoveredCell, setHoveredCell] = useState({ row: 0, col: 0 });

  if (!tableGridOpen) return null;

  const handleSelect = (rows: number, cols: number) => {
    setTableGridSize({ rows, cols });
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setTableGridOpen(false);
  };

  return (
    <Modal isOpen={tableGridOpen} onClose={() => setTableGridOpen(false)} className="w-[340px] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Insert Table</h2>
          <button onClick={() => setTableGridOpen(false)} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-2">
          {hoveredCell.row > 0 && hoveredCell.col > 0
            ? `${hoveredCell.row} × ${hoveredCell.col} table`
            : 'Select grid size'}
        </p>

        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${MAX_GRID}, 1fr)` }}>
          {Array.from({ length: MAX_GRID * MAX_GRID }).map((_, idx) => {
            const row = Math.floor(idx / MAX_GRID) + 1;
            const col = (idx % MAX_GRID) + 1;
            const isHovered = row <= hoveredCell.row && col <= hoveredCell.col;

            return (
              <button
                key={idx}
                className={`w-7 h-7 border rounded-sm transition-colors ${
                  isHovered
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-300 hover:border-blue-400'
                }`}
                onMouseEnter={() => setHoveredCell({ row, col })}
                onMouseLeave={() => setHoveredCell({ row: 0, col: 0 })}
                onClick={() => handleSelect(row, col)}
              />
            );
          })}
      </div>
    </Modal>
  );
}
