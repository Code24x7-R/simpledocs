// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaginatedViewport from './PaginatedViewport';

const mockSetCurrentPage = vi.fn();
const mockSetTotalPages = vi.fn();
const mockSetEditor = vi.fn();
let mockFullBleedMode = false;

vi.mock('../../store/useDocStore', () => ({
  useDocStore: () => ({
    zoom: 1,
    currentPage: 1,
    setCurrentPage: mockSetCurrentPage,
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
        defaultFullBleedMode: false,
      },
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    fullBleedMode: mockFullBleedMode,
    setEditor: mockSetEditor,
  }),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock DocumentEditor since it needs Tiptap
vi.mock('./DocumentEditor', () => ({
  default: () => <div data-testid="document-editor" />,
}));

describe('PaginatedViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFullBleedMode = false;
  });

  it('renders with paginated layout by default (not full-bleed)', () => {
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

  it('removes maxWidth and applies full-bleed padding when fullBleedMode is true', () => {
    mockFullBleedMode = true;
    render(<PaginatedViewport />);
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    // In full-bleed mode, maxWidth should be empty
    expect(content.style.maxWidth).toBe('');
    // Should have full-bleed padding
    expect(content.style.paddingLeft).toBe('80px');
    expect(content.style.paddingRight).toBe('80px');
  });

  it('does not apply mx-auto class in full-bleed mode', () => {
    mockFullBleedMode = true;
    render(<PaginatedViewport />);
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    expect(content.classList.contains('mx-auto')).toBe(false);
  });

  it('uses top-left transform origin in full-bleed mode (prevents LHS truncation on zoom)', () => {
    mockFullBleedMode = true;
    render(<PaginatedViewport />);
    // The zoom scale container is the parent of the content div
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    const zoomContainer = content.parentElement as HTMLElement;
    expect(zoomContainer.style.transformOrigin).toBe('top left');
  });

  it('uses top-center transform origin in paginated mode', () => {
    mockFullBleedMode = false;
    render(<PaginatedViewport />);
    const content = screen.getByTestId('document-editor').parentElement as HTMLElement;
    const zoomContainer = content.parentElement as HTMLElement;
    expect(zoomContainer.style.transformOrigin).toBe('top center');
  });

  it('clips horizontal overflow in full-bleed mode (prevents scrollbar on zoom)', () => {
    mockFullBleedMode = true;
    render(<PaginatedViewport />);
    const viewport = document.getElementById('paginated-viewport') as HTMLElement;
    expect(viewport.classList.contains('overflow-x-hidden')).toBe(true);
  });

  it('does not clip horizontal overflow in paginated mode', () => {
    mockFullBleedMode = false;
    render(<PaginatedViewport />);
    const viewport = document.getElementById('paginated-viewport') as HTMLElement;
    expect(viewport.classList.contains('overflow-x-hidden')).toBe(false);
  });
});
