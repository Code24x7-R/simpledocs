// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useDocStore } from '../../store/useDocStore';
import { calculatePageGeometry } from '../../utils/pageGeometry';

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
  const { header, footer } = settings;

  // Use shared geometry utility for consistency with PaginatedViewport and PageBreakView
  const geo = calculatePageGeometry(settings);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{
        top: `${top}px`,
        width: `${geo.pageWidthPx}px`,
        height: `${height}px`,
      }}
    >
      {/* White page card with shadow */}
      <div
        className="w-full h-full bg-white shadow-lg rounded-sm"
        style={{
          paddingTop: `${geo.marginTopPx}px`,
          paddingBottom: `${geo.marginBottomPx}px`,
          paddingLeft: `${geo.marginLeftPx}px`,
          paddingRight: `${geo.marginRightPx}px`,
        }}
      >
        {/* Header */}
        {header.enabled && (
          <div
            className="absolute left-0 right-0 text-xs text-gray-500 border-b border-gray-200 pb-1"
            style={{
              top: `${geo.marginTopPx / 2}px`,
              left: `${geo.marginLeftPx}px`,
              right: `${geo.marginRightPx}px`,
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
              bottom: `${geo.marginBottomPx / 2}px`,
              left: `${geo.marginLeftPx}px`,
              right: `${geo.marginRightPx}px`,
            }}
          >
            Page {pageNumber}
          </div>
        )}
      </div>
    </div>
  );
}
