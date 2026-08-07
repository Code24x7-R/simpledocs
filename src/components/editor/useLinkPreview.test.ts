// SPDX-License-Identifier: MIT
/**
 * Tests for useLinkPreview hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLinkPreview } from './useLinkPreview';

// Helper to create a mock mouse event with a target
function createMouseEvent(target: HTMLElement, clientX = 100, clientY = 200) {
  return {
    target,
    clientX,
    clientY,
  } as unknown as React.MouseEvent;
}

function createAnchor(href: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.setAttribute('href', href);
  document.body.appendChild(anchor);
  return anchor;
}

describe('useLinkPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('returns initial hidden state', () => {
    const { result } = renderHook(() => useLinkPreview());
    expect(result.current.preview.visible).toBe(false);
    expect(result.current.preview.href).toBe('');
  });

  it('shows preview after hovering a link for the delay period', () => {
    const { result } = renderHook(() => useLinkPreview());
    const anchor = createAnchor('https://example.com');

    act(() => {
      result.current.linkHandlers.onMouseOver(
        createMouseEvent(anchor, 50, 60)
      );
    });

    // Not visible yet (delay hasn't elapsed)
    expect(result.current.preview.visible).toBe(false);

    // Advance past the delay
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.preview.visible).toBe(true);
    expect(result.current.preview.href).toBe('https://example.com');
    expect(result.current.preview.x).toBe(50);
    expect(result.current.preview.y).toBe(60);
  });

  it('does not show preview for non-anchor elements', () => {
    const { result } = renderHook(() => useLinkPreview());
    const div = document.createElement('div');
    document.body.appendChild(div);

    act(() => {
      result.current.linkHandlers.onMouseOver(createMouseEvent(div));
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.preview.visible).toBe(false);
  });

  it('does not show preview for anchors without href', () => {
    const { result } = renderHook(() => useLinkPreview());
    const anchor = document.createElement('a');
    // No href set
    document.body.appendChild(anchor);

    act(() => {
      result.current.linkHandlers.onMouseOver(createMouseEvent(anchor));
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.preview.visible).toBe(false);
  });

  it('hides preview on mouse out', () => {
    const { result } = renderHook(() => useLinkPreview());
    const anchor = createAnchor('https://example.com');

    // Show the preview
    act(() => {
      result.current.linkHandlers.onMouseOver(createMouseEvent(anchor));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.preview.visible).toBe(true);

    // Mouse out hides it
    act(() => {
      result.current.linkHandlers.onMouseOut();
    });

    expect(result.current.preview.visible).toBe(false);
  });

  it('cancels pending show on mouse out before delay elapses', () => {
    const { result } = renderHook(() => useLinkPreview());
    const anchor = createAnchor('https://example.com');

    act(() => {
      result.current.linkHandlers.onMouseOver(createMouseEvent(anchor));
    });

    // Mouse out before the delay fires
    act(() => {
      result.current.linkHandlers.onMouseOut();
    });

    // Advance well past the delay — should NOT show
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.preview.visible).toBe(false);
  });

  it('updates position on mouse move when visible', () => {
    const { result } = renderHook(() => useLinkPreview());
    const anchor = createAnchor('https://example.com');

    act(() => {
      result.current.linkHandlers.onMouseOver(createMouseEvent(anchor, 10, 20));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.preview.x).toBe(10);

    // Move to new position
    act(() => {
      result.current.linkHandlers.onMouseMove(
        createMouseEvent(anchor, 150, 250)
      );
    });

    expect(result.current.preview.x).toBe(150);
    expect(result.current.preview.y).toBe(250);
    expect(result.current.preview.href).toBe('https://example.com');
  });

  it('does not update position on mouse move when not visible', () => {
    const { result } = renderHook(() => useLinkPreview());
    const anchor = createAnchor('https://example.com');

    // No hover first — just a move
    act(() => {
      result.current.linkHandlers.onMouseMove(createMouseEvent(anchor, 99, 99));
    });

    expect(result.current.preview.visible).toBe(false);
  });
});
