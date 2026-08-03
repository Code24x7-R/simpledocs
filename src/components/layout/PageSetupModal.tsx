// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState } from 'react';
import { X } from 'lucide-react';
import { useDocStore } from '../../store/useDocStore';

export default function PageSetupModal() {
  const { docState, updateSettings, pageSetupOpen, setPageSetupOpen } = useDocStore();
  const settings = docState.settings;

  const [formData, setFormData] = useState({
    pageFormat: settings.pageFormat,
    orientation: settings.orientation,
    marginTop: settings.margins.top,
    marginBottom: settings.margins.bottom,
    marginLeft: settings.margins.left,
    marginRight: settings.margins.right,
    headerEnabled: settings.header.enabled,
    headerContent: settings.header.content,
    footerEnabled: settings.footer.enabled,
    showPageNumbers: settings.footer.showPageNumbers,
    orphans: settings.orphans,
    widows: settings.widows,
  });

  if (!pageSetupOpen) return null;

  const handleApply = () => {
    updateSettings({
      pageFormat: formData.pageFormat as 'A4' | 'Letter',
      orientation: formData.orientation as 'portrait' | 'landscape',
      margins: {
        top: formData.marginTop,
        bottom: formData.marginBottom,
        left: formData.marginLeft,
        right: formData.marginRight,
      },
      header: {
        enabled: formData.headerEnabled,
        content: formData.headerContent,
      },
      footer: {
        enabled: formData.footerEnabled,
        showPageNumbers: formData.showPageNumbers,
      },
      orphans: formData.orphans,
      widows: formData.widows,
    });
    setPageSetupOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Page Setup</h2>
          <button onClick={() => setPageSetupOpen(false)} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Page Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
            <select
              value={formData.pageFormat}
              onChange={(e) => setFormData({ ...formData, pageFormat: e.target.value as 'A4' | 'Letter' })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
            </select>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormData({ ...formData, orientation: 'portrait' as 'portrait' | 'landscape' })}
                className={`flex-1 py-2 px-3 border rounded text-sm ${
                  formData.orientation === 'portrait'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Portrait
              </button>
              <button
                onClick={() => setFormData({ ...formData, orientation: 'landscape' as 'portrait' | 'landscape' })}
                className={`flex-1 py-2 px-3 border rounded text-sm ${
                  formData.orientation === 'landscape'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          {/* Margins */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Margins</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Top</label>
                <input
                  type="text"
                  value={formData.marginTop}
                  onChange={(e) => setFormData({ ...formData, marginTop: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Bottom</label>
                <input
                  type="text"
                  value={formData.marginBottom}
                  onChange={(e) => setFormData({ ...formData, marginBottom: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Left</label>
                <input
                  type="text"
                  value={formData.marginLeft}
                  onChange={(e) => setFormData({ ...formData, marginLeft: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Right</label>
                <input
                  type="text"
                  value={formData.marginRight}
                  onChange={(e) => setFormData({ ...formData, marginRight: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Header */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <input
                type="checkbox"
                checked={formData.headerEnabled}
                onChange={(e) => setFormData({ ...formData, headerEnabled: e.target.checked })}
                className="rounded"
              />
              Header
            </label>
            {formData.headerEnabled && (
              <input
                type="text"
                value={formData.headerContent}
                onChange={(e) => setFormData({ ...formData, headerContent: e.target.value })}
                placeholder="Header text (supports {title})"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            )}
          </div>

          {/* Footer */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <input
                type="checkbox"
                checked={formData.footerEnabled}
                onChange={(e) => setFormData({ ...formData, footerEnabled: e.target.checked })}
                className="rounded"
              />
              Footer
            </label>
            {formData.footerEnabled && (
              <label className="flex items-center gap-2 text-sm text-gray-600 ml-5">
                <input
                  type="checkbox"
                  checked={formData.showPageNumbers}
                  onChange={(e) => setFormData({ ...formData, showPageNumbers: e.target.checked })}
                  className="rounded"
                />
                Show page numbers
              </label>
            )}
          </div>

          {/* Typography — Widow/Orphan Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Widow/Orphan Control</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Widows</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.widows}
                  onChange={(e) => setFormData({ ...formData, widows: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Orphans</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.orphans}
                  onChange={(e) => setFormData({ ...formData, orphans: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Minimum lines to keep together at page breaks (print/PDF)</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={() => setPageSetupOpen(false)}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
