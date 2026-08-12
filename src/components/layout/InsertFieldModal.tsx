// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState } from 'react';
import { X } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';

const STANDARD_FIELDS = [
  { label: 'Current Date', value: 'current_date' },
  { label: 'Document Title', value: 'document_title' },
  { label: 'Page Number', value: 'page_number' },
  { label: 'Total Pages', value: 'total_pages' },
];

export default function InsertFieldModal() {
  const { insertFieldOpen, setInsertFieldOpen, editor } = useDocStore();
  const [customField, setCustomField] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  if (!insertFieldOpen) return null;

  const handleInsert = (fieldName: string) => {
    editor?.chain().focus().insertTemplateField(fieldName).run();
    setInsertFieldOpen(false);
    setCustomField('');
    setShowCustom(false);
  };

  const handleCustomInsert = () => {
    if (customField.trim()) {
      handleInsert(customField.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[320px] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Insert Template Field</h2>
          <button onClick={() => setInsertFieldOpen(false)} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 mb-3">
          {STANDARD_FIELDS.map((field) => (
            <button
              key={field.value}
              onClick={() => handleInsert(field.value)}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            >
              <span className="font-mono text-blue-600">{`{{${field.value}}}`}</span>
              <span className="text-gray-400">- {field.label}</span>
            </button>
          ))}
        </div>

        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 text-gray-600 border-t border-gray-200 pt-2"
          >
            + Custom field...
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={customField}
              onChange={(e) => setCustomField(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomInsert()}
              placeholder="field_name"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
              autoFocus
            />
            <button
              onClick={handleCustomInsert}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Insert
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
