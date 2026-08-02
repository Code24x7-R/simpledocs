// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useDocStore } from '../../store/useDocStore';

interface PageBackgroundProps {
  pageNumber: number;
  top: number;
  height: number;
}

/**
 * Visual Page Background
 *
 * Renders a white card with drop shadow that represents a single page.
 * Positioned absolutely within the scroll container.
 */
export default function PageBackground({
  pageNumber,
  top,
  height,
}: PageBackgroundProps) {
  const { docState } = useDocStore();
  const { settings } = docState;
  const { orientation, margins, header, footer } = settings;

  const marginPx = {
    top: parseFloat(margins.top) || 20,
    bottom: parseFloat(margins.bottom) || 20,
    left: parseFloat(margins.left) || 25,
    right: parseFloat(margins.right) || 25,
  };

  // Convert mm to px for display (approximate)
  const mmToPx = (mm: number) => mm * 3.7795275591;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{
        top: `${top}px`,
        width: orientation === 'landscape' ? '1010px' : '794px',
        height: `${height}px`,
      }}
    >
      {/* White page card with shadow */}
      <div
        className="w-full h-full bg-white shadow-lg rounded-sm"
        style={{
          paddingTop: `${mmToPx(marginPx.top)}px`,
          paddingBottom: `${mmToPx(marginPx.bottom)}px`,
          paddingLeft: `${mmToPx(marginPx.left)}px`,
          paddingRight: `${mmToPx(marginPx.right)}px`,
        }}
      >
        {/* Header */}
        {header.enabled && (
          <div
            className="absolute left-0 right-0 text-xs text-gray-500 border-b border-gray-200 pb-1"
            style={{
              top: `${mmToPx(marginPx.top) / 2}px`,
              left: `${mmToPx(marginPx.left)}px`,
              right: `${mmToPx(marginPx.right)}px`,
            }}
          >
            {header.content || docState.title}
          </div>
        )}

        {/* Content area - intentionally empty.
             Editor content renders behind this overlay.
             No pointer-events-auto here — that would block clicks/keystrokes
             from reaching the Tiptap editor underneath. */}

        {/* Footer */}
        {footer.enabled && footer.showPageNumbers && (
          <div
            className="absolute left-0 right-0 text-xs text-gray-500 text-center border-t border-gray-200 pt-1"
            style={{
              bottom: `${mmToPx(marginPx.bottom) / 2}px`,
              left: `${mmToPx(marginPx.left)}px`,
              right: `${mmToPx(marginPx.right)}px`,
            }}
          >
            Page {pageNumber}
          </div>
        )}
      </div>
    </div>
  );
}
