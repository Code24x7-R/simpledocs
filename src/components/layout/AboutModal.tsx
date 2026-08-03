// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getBuildInfo() {
  const commit = typeof __GIT_COMMIT_HASH__ !== 'undefined' ? __GIT_COMMIT_HASH__ : 'unknown';
  const ts = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : '';
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

  let date = 'dev';
  let time = '';
  let raw = '';
  if (ts) {
    const d = new Date(ts);
    date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    raw = ts;
  }

  return { commit, version, date, time, raw };
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  const { commit, version, date, time, raw } = getBuildInfo();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">About simpledocs</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* App Info */}
          <div className="text-center pb-4 border-b border-gray-100">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-8 h-8" viewBox="0 0 32 32">
                <rect width="32" height="32" rx="6" fill="#2563eb"/>
                <text x="16" y="22" textAnchor="middle" fontSize="16" fontFamily="Arial" fontWeight="bold" fill="white">S</text>
              </svg>
              <span className="text-xl font-bold text-gray-800">simpledocs</span>
            </div>
            <p className="text-sm text-gray-500">Paginated WYSIWYG Document Editor</p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="font-mono text-gray-800">{version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Build</span>
              <span className="font-mono text-gray-800">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Commit</span>
              <span className="font-mono text-gray-800">{commit}</span>
            </div>
          </div>

          {/* Tooltip with full timestamp */}
          {raw && (
            <p className="text-xs text-gray-400 text-center" title={`Build: ${raw}`}>
              Built {date} at {time} ({commit})
            </p>
          )}

          {/* Description */}
          <p className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
            A modern, browser-based document editor with Microsoft Word / Google Docs feature parity.
            Built with React, TypeScript, and Tiptap.
          </p>

          {/* Related Apps */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Related Apps</p>
            <a
              href="https://code24x7-r.github.io/simplesheets/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="6" fill="#16a34a" />
                  <path d="M8 10h16v2H8zm0 5h16v2H8zm0 5h16v2H8z" fill="white" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">SimpleSheet</span>
                  <p className="text-xs text-gray-400">Spreadsheet web app</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <p className="text-xs text-gray-400 text-center pt-2">
            MIT License
          </p>
        </div>
      </div>
    </div>
  );
}
