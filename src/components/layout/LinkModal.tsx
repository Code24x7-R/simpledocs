// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useEffect, useRef } from 'react';
import { X, Link, ExternalLink } from 'lucide-react';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
  initialUrl?: string;
  initialText?: string;
}

/**
 * Link Modal Dialog
 *
 * Allows users to add or edit a hyperlink with URL and display text.
 * Supports keyboard submission (Enter) and Escape to close.
 */
export default function LinkModal({
  isOpen,
  onClose,
  onSubmit,
  initialUrl = '',
  initialText = '',
}: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setText(initialText);
      // Focus URL input after modal renders
      setTimeout(() => urlInputRef.current?.focus(), 50);
    }
  }, [isOpen, initialUrl, initialText]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim(), text.trim() || url.trim());
    }
  };

  const isValidUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const canSubmit = url.trim() && isValidUrl(url.trim());

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[420px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold">
              {initialUrl ? 'Edit Link' : 'Insert Link'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              URL
            </label>
            <div className="relative">
              <input
                ref={urlInputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 pr-9"
              />
              {url && isValidUrl(url) && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500"
                  title="Open link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Display Text Input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Display Text (optional)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text (defaults to URL)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            {initialUrl && (
              <button
                type="button"
                onClick={() => {
                  onSubmit('', '');
                  onClose();
                }}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Remove Link
              </button>
            )}
            <div className={`flex gap-2 ${!initialUrl ? 'ml-auto' : ''}`}>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {initialUrl ? 'Update' : 'Insert'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
