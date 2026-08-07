// SPDX-License-Identifier: MIT
/**
 * Link URL preview hook.
 *
 * Tracks hover state over <a> elements and provides the URL + position
 * for rendering a tooltip preview of the link destination.
 */

import { useState, useCallback, useRef } from 'react';

export interface LinkPreviewState {
  href: string;
  x: number;
  y: number;
  visible: boolean;
}

const INITIAL_STATE: LinkPreviewState = {
  href: '',
  x: 0,
  y: 0,
  visible: false,
};

/** Delay (ms) before showing the preview — prevents flicker on quick passes. */
const SHOW_DELAY_MS = 300;

export function useLinkPreview() {
  const [preview, setPreview] = useState<LinkPreviewState>(INITIAL_STATE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;

    // Small delay so brief mouse-overs don't flash the preview
    timeoutRef.current = setTimeout(() => {
      setPreview({
        href,
        x: e.clientX,
        y: e.clientY,
        visible: true,
      });
    }, SHOW_DELAY_MS);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (preview.visible) {
      setPreview((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  }, [preview.visible]);

  const handleMouseOut = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPreview(INITIAL_STATE);
  }, []);

  return {
    preview,
    linkHandlers: {
      onMouseOver: handleMouseOver,
      onMouseMove: handleMouseMove,
      onMouseOut: handleMouseOut,
    },
  };
}
