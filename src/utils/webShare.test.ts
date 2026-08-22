// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareDocument, canShareFiles } from './webShare';
import type { DocState } from '../store/useDocStore';

const mockDoc: DocState = {
  id: 'test-123',
  title: 'My Document',
  createdAt: '2026-08-02T00:00:00Z',
  updatedAt: '2026-08-02T00:00:00Z',
  totalPages: 1,
  settings: {
    pageFormat: 'A4',
    orientation: 'portrait',
    margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
    header: { enabled: false, content: '' },
    footer: { enabled: false, showPageNumbers: false },
    pageGap: 24,
    orphans: 2,
    widows: 2,
    defaultNormalEditorMode: false,
  },
  content: { type: 'doc', content: [] },
};

describe('webShare', () => {
  const originalShare = navigator.share;
  const originalCanShare = navigator.canShare;

  beforeEach(() => {
    // @ts-expect-error — test stubs
    navigator.share = undefined;
    // @ts-expect-error — test stubs
    navigator.canShare = undefined;
    // jsdom lacks URL.createObjectURL / revokeObjectURL — define them as
    // spies directly (the methods don't exist, so spyOn would fail).
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue('blob:mock'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(undefined),
    });
  });

  afterEach(() => {
    navigator.share = originalShare;
    navigator.canShare = originalCanShare;
    vi.restoreAllMocks();
  });

  describe('canShareFiles', () => {
    it('returns false when navigator.share is unavailable', () => {
      expect(canShareFiles()).toBe(false);
    });

    it('returns false when navigator.share exists but canShare does not', () => {
      navigator.share = vi.fn();
      expect(canShareFiles()).toBe(false);
    });

    it('returns false when canShare reports files are not shareable', () => {
      navigator.share = vi.fn();
      navigator.canShare = vi.fn().mockReturnValue(false);
      expect(canShareFiles()).toBe(false);
    });

    it('returns true when canShare reports a File is shareable', () => {
      navigator.share = vi.fn();
      navigator.canShare = vi.fn().mockReturnValue(true);
      expect(canShareFiles()).toBe(true);
    });
  });

  describe('shareDocument', () => {
    it('falls back to download when Web Share API is unavailable', async () => {
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      expect(navigator.share).toBeUndefined();
      const result = await shareDocument(mockDoc, 'My Document');

      expect(result).toBe('fallback');
      expect(clickSpy).toHaveBeenCalled();
      // URL.createObjectURL was stubbed in beforeEach; assert it was called.
      expect(URL.createObjectURL).toHaveBeenCalled();

      clickSpy.mockRestore();
    });

    it('calls navigator.share with a .sdjson file when available', async () => {
      const shareSpy = vi.fn().mockResolvedValue(undefined);
      navigator.share = shareSpy;
      navigator.canShare = vi.fn().mockReturnValue(true);

      const result = await shareDocument(mockDoc, 'My Document');

      expect(result).toBe('shared');
      expect(shareSpy).toHaveBeenCalledTimes(1);
      const shareArg = shareSpy.mock.calls[0][0];
      expect(shareArg.files).toBeDefined();
      expect(shareArg.files.length).toBe(1);
      expect(shareArg.files[0].name).toBe('My Document.sdjson');
      expect(shareArg.title).toBe('My Document');
    });

    it('appends .sdjson extension when missing', async () => {
      const shareSpy = vi.fn().mockResolvedValue(undefined);
      navigator.share = shareSpy;
      navigator.canShare = vi.fn().mockReturnValue(true);

      await shareDocument(mockDoc, 'Report');
      const shareArg = shareSpy.mock.calls[0][0];
      expect(shareArg.files[0].name).toBe('Report.sdjson');
    });

    it('does not double the .sdjson extension', async () => {
      const shareSpy = vi.fn().mockResolvedValue(undefined);
      navigator.share = shareSpy;
      navigator.canShare = vi.fn().mockReturnValue(true);

      await shareDocument(mockDoc, 'Report.sdjson');
      const shareArg = shareSpy.mock.calls[0][0];
      expect(shareArg.files[0].name).toBe('Report.sdjson');
    });

    it('uses "Untitled" when the title is empty', async () => {
      const shareSpy = vi.fn().mockResolvedValue(undefined);
      navigator.share = shareSpy;
      navigator.canShare = vi.fn().mockReturnValue(true);

      const noTitleDoc = { ...mockDoc, title: '' };
      await shareDocument(noTitleDoc, '');
      const shareArg = shareSpy.mock.calls[0][0];
      expect(shareArg.title).toBe('Untitled');
      expect(shareArg.files[0].name).toBe('Untitled.sdjson');
    });

    it('returns "cancelled" when the user dismisses the share sheet', async () => {
      const abortError = new DOMException('User cancelled', 'AbortError');
      const shareSpy = vi.fn().mockRejectedValue(abortError);
      navigator.share = shareSpy;
      navigator.canShare = vi.fn().mockReturnValue(true);

      const result = await shareDocument(mockDoc, 'My Document');
      expect(result).toBe('cancelled');
    });

    it('rethrows non-cancellation errors', async () => {
      const shareSpy = vi.fn().mockRejectedValue(new Error('Share failed'));
      navigator.share = shareSpy;
      navigator.canShare = vi.fn().mockReturnValue(true);

      await expect(shareDocument(mockDoc, 'My Document')).rejects.toThrow('Share failed');
    });
  });
});
