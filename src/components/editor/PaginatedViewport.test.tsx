// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PaginatedViewport from './PaginatedViewport';

const mockSetCurrentPage = vi.fn();
const mockSetTotalPages = vi.fn();
const mockSetEditor = vi.fn();
let mockNormalEditorMode = false;
// Mutable page so navigation-driven changes can be simulated. The mock
// setCurrentPage writes here; the selector reads it back via the getter.
let mockCurrentPage = 1;

vi.mock('../../store/useDocStore', () => ({
  useDocStore: () => ({
    zoom: 1,
    get currentPage() {
      return mockCurrentPage;
    },
    setCurrentPage: (page: number) => {
      mockSetCurrentPage(page);
      mockCurrentPage = page;
    },
    setTotalPages: mockSetTotalPages,
    docState: {
      settings: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
        header: { enabled: true, content: '' },
        footer: { enabled: true, showPageNumbers: true },
        pageGap: 24,
        orphans: 2,
        widows: 2,
        defaultNormalEditorMode: false,
      },
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    normalEditorMode: mockNormalEditorMode,
    setEditor: mockSetEditor,
  }),
}));

// Mock ResizeObserver. observe() fires its measurement callback on a
// microtask so tests can set the content height before the first measurement
// runs (jsdom reports scrollHeight as 0, which would otherwise collapse the
// document to a single page).
class MockResizeObserver {
  private cb: (() => void) | null = null;
  constructor(cb: () => void) {
    this.cb = cb;
  }
  observe() {
    queueMicrotask(() => this.cb?.());
  }
  unobserve() {}
  disconnect() {
    this.cb = null;
  }
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock DocumentEditor since it needs Tiptap
vi.mock('./DocumentEditor', () => ({
  default: () => <div data-testid="document-editor" />,
}));

describe('PaginatedViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNormalEditorMode = false;
    mockCurrentPage = 1;
  });

  // jsdom has no layout engine, so scroll metrics are all 0. These helpers
  // override the viewport/content geometry so the pagination math can be
  // exercised deterministically.
  const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

  function setViewportGeometry(
    viewport: HTMLElement,
    { scrollTop, scrollHeight, clientHeight }: { scrollTop: number; scrollHeight: number; clientHeight: number },
  ) {
    Object.defineProperty(viewport, 'scrollTop', { value: scrollTop, writable: true, configurable: true });
    Object.defineProperty(viewport, 'scrollHeight', { value: scrollHeight, configurable: true });
    Object.defineProperty(viewport, 'clientHeight', { value: clientHeight, configurable: true });
  }

  it('renders with paginated layout by default (not normal editor)', () => {
    render(<PaginatedViewport />);
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    // In paginated mode, maxWidth should be set (not full width)
    expect(content.style.maxWidth).toBeTruthy();
    expect(content.style.maxWidth).not.toBe('');
  });

  it('renders document editor inside viewport', () => {
    render(<PaginatedViewport />);
    expect(screen.getByTestId('document-editor')).toBeTruthy();
  });

  it('renders the scrollable viewport container', () => {
    render(<PaginatedViewport />);
    const viewport = document.getElementById('paginated-viewport');
    expect(viewport).toBeTruthy();
  });

  it('removes maxWidth and applies normal-editor padding when normalEditorMode is true', () => {
    mockNormalEditorMode = true;
    render(<PaginatedViewport />);
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    // In normal-editor mode, maxWidth should be empty
    expect(content.style.maxWidth).toBe('');
    // Should have normal-editor padding
    expect(content.style.paddingLeft).toBe('80px');
    expect(content.style.paddingRight).toBe('80px');
  });

  it('does not apply mx-auto class in normal-editor mode', () => {
    mockNormalEditorMode = true;
    render(<PaginatedViewport />);
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    expect(content.classList.contains('mx-auto')).toBe(false);
  });

  it('uses top-left transform origin in normal-editor mode (prevents LHS truncation on zoom)', () => {
    mockNormalEditorMode = true;
    render(<PaginatedViewport />);
    // The zoom scale container is the parent of the content div
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    const zoomContainer = content.parentElement as HTMLElement;
    expect(zoomContainer.style.transformOrigin).toBe('top left');
  });

  it('uses top-center transform origin in paginated mode', () => {
    mockNormalEditorMode = false;
    render(<PaginatedViewport />);
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    const zoomContainer = content.parentElement as HTMLElement;
    expect(zoomContainer.style.transformOrigin).toBe('top center');
  });

  it('clips horizontal overflow in normal-editor mode (prevents scrollbar on zoom)', () => {
    mockNormalEditorMode = true;
    render(<PaginatedViewport />);
    const viewport = document.getElementById('paginated-viewport') as HTMLElement;
    expect(viewport.classList.contains('overflow-x-hidden')).toBe(true);
  });

  it('does not clip horizontal overflow in paginated mode', () => {
    mockNormalEditorMode = false;
    render(<PaginatedViewport />);
    const viewport = document.getElementById('paginated-viewport') as HTMLElement;
    expect(viewport.classList.contains('overflow-x-hidden')).toBe(false);
  });

  // --- Scroll vs. navigation: the origin flag that stops the bounce/ratchet ---

  it('tracks the page on natural scroll without snapping back (no bounce)', async () => {
    // Render synchronously so the viewport element commits to the DOM before
    // we read it (render() inside act() defers the commit and yields null).
    const { rerender } = render(<PaginatedViewport />);
    const viewport = document.getElementById('paginated-viewport') as HTMLElement;
    const content = viewport.querySelector('.document-content') as HTMLElement;
    // Tall content → multiple pages (stride ≈ 1146px with A4 + 24px gap).
    Object.defineProperty(content, 'scrollHeight', { value: 8000, configurable: true });
    // The page-count measurement fires on a microtask and calls setPageCount,
    // so flush it inside act() to avoid an act warning.
    await act(async () => {
      await flushMicrotasks();
    });
    // Place scrollTop mid-way through page 2 (page 1 spans 0-1146).
    setViewportGeometry(viewport, { scrollTop: 1500, scrollHeight: 8000, clientHeight: 700 });
    const scrollToSpy = vi.fn();
    Object.defineProperty(viewport, 'scrollTo', { value: scrollToSpy, configurable: true });

    // fireEvent is wrapped in act(); the store mock is not reactive so a
    // manual re-render is what drives the currentPage effect to (not) snap.
    // Wrap the re-render (which runs the effect) in act() too.
    act(() => {
      fireEvent.scroll(viewport);
      rerender(<PaginatedViewport />);
    });

    // Page tracking must update the displayed page.
    expect(mockSetCurrentPage).toHaveBeenCalledWith(2);
    // But it must NOT snap the scroll back to the page boundary — that snap
    // was the bounce/ratchet bug.
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('snaps to the page boundary when the page changes via navigation', async () => {
    const { rerender } = render(<PaginatedViewport />);
    const viewport = document.getElementById('paginated-viewport') as HTMLElement;
    const content = viewport.querySelector('.document-content') as HTMLElement;
    Object.defineProperty(content, 'scrollHeight', { value: 8000, configurable: true });
    await act(async () => {
      await flushMicrotasks();
    });
    setViewportGeometry(viewport, { scrollTop: 0, scrollHeight: 8000, clientHeight: 700 });
    const scrollToSpy = vi.fn();
    Object.defineProperty(viewport, 'scrollTo', { value: scrollToSpy, configurable: true });

    // Simulate a Prev/Next/Jump control changing the page directly — this does
    // NOT set the scroll-origin flag, so the effect must snap. The re-render
    // runs the effect, so wrap it in act().
    act(() => {
      mockCurrentPage = 4;
      rerender(<PaginatedViewport />);
    });

    // Navigation must scroll the viewport to page 4's boundary.
    expect(scrollToSpy).toHaveBeenCalled();
  });
});
