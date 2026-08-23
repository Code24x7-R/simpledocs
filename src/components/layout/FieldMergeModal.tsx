// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useMemo } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';
import Modal from './Modal';
import { extractFieldNames, mergeFields, resolveField } from '../../utils/templateFields';

interface FieldMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Field Merge Dialog
 *
 * Shows all template fields in the document and allows the user to:
 * - Enter values for custom fields
 * - Preview resolved values
 * - Merge all fields into plain text
 */
export default function FieldMergeModal({ isOpen, onClose }: FieldMergeModalProps) {
  const { docState, updateContent } = useDocStore();
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [merged, setMerged] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ count: number; fields: Record<string, number> } | null>(null);

  // Extract all unique field names from the document
  const fieldNames = useMemo(() => extractFieldNames(docState.content), [docState.content]);

  // Separate standard and custom fields
  const standardFields = fieldNames.filter((name) => {
    const type = name.toLowerCase().replace(/[-\s]/g, '_');
    return ['current_date', 'date', 'document_title', 'title', 'page_number', 'page', 'total_pages', 'pages'].includes(type);
  });
  const customFields = fieldNames.filter((name) => !standardFields.includes(name));

  if (!isOpen) return null;

  const handleCustomValueChange = (fieldName: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleMerge = () => {
    const result = mergeFields(docState.content, docState, 0, customValues);
    updateContent(result.content);
    setMerged(true);
    setMergeResult({ count: result.replacedCount, fields: result.fieldsReplaced });
  };

  const handleClose = () => {
    setMerged(false);
    setMergeResult(null);
    setCustomValues({});
    onClose();
  };

  const getPreviewValue = (fieldName: string, pageIndex: number = 0) => {
    return resolveField(fieldName, docState, pageIndex, customValues);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold">Merge Template Fields</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {fieldNames.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No template fields found in this document.</p>
              <p className="text-xs mt-1">Insert fields via Insert → Template Field</p>
            </div>
          ) : merged ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-700">Merge Complete</p>
              <p className="text-xs text-gray-500 mt-1">
                Replaced {mergeResult?.count} field{mergeResult?.count !== 1 ? 's' : ''}
              </p>
              {mergeResult && Object.keys(mergeResult.fields).length > 0 && (
                <div className="mt-3 text-left">
                  <p className="text-xs font-medium text-gray-700 mb-1">Fields replaced:</p>
                  {Object.entries(mergeResult.fields).map(([field, count]) => (
                    <div key={field} className="text-xs text-gray-500 flex justify-between">
                      <span>{`{{${field}}}`}</span>
                      <span>{count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Standard Fields */}
              {standardFields.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Standard Fields</h3>
                  <div className="space-y-2">
                    {standardFields.map((fieldName) => (
                      <div key={fieldName} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-mono text-sm text-blue-600">{`{{${fieldName}}}`}</span>
                          <span className="text-xs text-gray-400 ml-2">→ {getPreviewValue(fieldName)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Custom Fields</h3>
                  <div className="space-y-2">
                    {customFields.map((fieldName) => (
                      <div key={fieldName} className="py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-blue-600">{`{{${fieldName}}}`}</span>
                          <span className="text-xs text-gray-400">
                            {customValues[fieldName] ? `→ ${customValues[fieldName]}` : '→ [not set]'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={customValues[fieldName] || ''}
                          onChange={(e) => handleCustomValueChange(fieldName, e.target.value)}
                          placeholder={`Enter value for ${fieldName}`}
                          className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {fieldNames.length > 0 && !merged && (
          <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Merge All Fields
            </button>
          </div>
        )}
    </Modal>
  );
}
