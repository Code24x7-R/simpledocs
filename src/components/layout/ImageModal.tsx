// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useState, useRef, useEffect } from 'react';
import { X, Image, Upload, Link } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (src: string, alt: string, width: number, height: number) => void;
}

type Tab = 'upload' | 'url';

/**
 * Image Modal Dialog
 *
 * Allows users to insert images via file upload (converted to base64)
 * or URL. Supports alt text for accessibility.
 */
export default function ImageModal({ isOpen, onClose, onSubmit }: ImageModalProps) {
  const [tab, setTab] = useState<Tab>('upload');
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('upload');
      setUrl('');
      setAltText('');
      setFileName('');
      setPreviewSrc(null);
      setNaturalWidth(0);
      setNaturalHeight(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, WebP, SVG)');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    setFileName(file.name);
    setAltText(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewSrc(result);
      // Load image to get natural dimensions for PDF export
      const img = new window.Image();
      img.onload = () => {
        console.log('[ImageModal] File loaded:', file.name, 'naturalWidth:', img.naturalWidth, 'naturalHeight:', img.naturalHeight);
        setNaturalWidth(img.naturalWidth);
        setNaturalHeight(img.naturalHeight);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value) {
      setPreviewSrc(value);
      // Load image to get natural dimensions for PDF export
      const img = new window.Image();
      img.onload = () => {
        console.log('[ImageModal] URL image loaded:', value.slice(0, 50), 'naturalWidth:', img.naturalWidth, 'naturalHeight:', img.naturalHeight);
        setNaturalWidth(img.naturalWidth);
        setNaturalHeight(img.naturalHeight);
      };
      img.onerror = () => {
        console.warn('[ImageModal] Failed to load URL image:', value.slice(0, 50));
        setNaturalWidth(0);
        setNaturalHeight(0);
      };
      img.src = value;
    } else {
      setPreviewSrc(null);
      setNaturalWidth(0);
      setNaturalHeight(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const src = tab === 'upload' ? previewSrc : url;
    if (src) {
      console.log('[ImageModal] Submitting image:', { src: src.slice(0, 50), alt: altText.trim(), naturalWidth, naturalHeight });
      onSubmit(src, altText.trim(), naturalWidth, naturalHeight);
    }
  };

  const canSubmit = tab === 'upload' ? !!previewSrc : !!url.trim();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold">Insert Image</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-1.5" />
            Upload
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'url'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="w-4 h-4 inline mr-1.5" />
            URL
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload Tab */}
          {tab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-center"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {fileName || 'Click to upload an image'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, GIF, WebP, SVG (max 5MB)
                </p>
              </button>
            </div>
          )}

          {/* URL Tab */}
          {tab === 'url' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          {/* Alt Text */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Alt Text (accessibility)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Preview */}
          {previewSrc && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Preview
              </label>
              <div className="border border-gray-200 rounded p-2 bg-gray-50">
                <img
                  src={previewSrc}
                  alt={altText || 'Preview'}
                  className="max-h-48 max-w-full mx-auto object-contain"
                  onError={() => setPreviewSrc(null)}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
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
              Insert Image
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
