// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encodeDocToUrl,
  loadDocFromUrl,
  estimateShareSize,
  canShareViaUrl,
  MAX_SHARE_SIZE,
} from './shareUrl';
import type { DocState } from '../store/useDocStore';

const mockDoc: DocState = {
  id: 'test-123',
  title: 'Test Document',
  createdAt: '2026-08-02T00:00:00Z',
  updatedAt: '2026-08-02T00:00:00Z',
  totalPages: 1,
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
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
  },
};

describe('shareUrl', () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    window.location.hash = '';
    vi.stubGlobal('location', {
      origin: 'https://simpledocs.app',
      pathname: '/',
      hash: '',
    });
  });

  afterEach(() => {
    window.location.hash = originalHash;
    vi.unstubAllGlobals();
  });

  describe('MAX_SHARE_SIZE', () => {
    it('is 30 KB (keeps Safari hash-read reliable)', () => {
      expect(MAX_SHARE_SIZE).toBe(30 * 1024);
    });
  });

  describe('encodeDocToUrl', () => {
    it('returns a URL with the #doc= fragment', () => {
      const url = encodeDocToUrl(mockDoc);
      expect(url).toContain('#doc=');
      expect(url.startsWith('https://simpledocs.app/#doc=')).toBe(true);
    });

    it('produces a URL-safe fragment (no spaces or raw unicode)', () => {
      const url = encodeDocToUrl(mockDoc);
      const fragment = url.split('#doc=')[1];
      // lz-string URI-component encoding must not produce raw spaces or chars
      // that break a URL.
      expect(fragment).not.toContain(' ');
      expect(fragment).not.toContain('#');
      expect(fragment).not.toContain('"');
      expect(encodeURI(fragment)).toBe(fragment);
    });

    it('round-trips: loadDocFromUrl can reconstruct the original doc', () => {
      const url = encodeDocToUrl(mockDoc);
      const fragment = url.slice(url.indexOf('#doc=') + '#doc='.length);
      window.location.hash = `#doc=${fragment}`;
      vi.stubGlobal('location', { ...location, hash: `#doc=${fragment}` });
      const loaded = loadDocFromUrl();
      expect(loaded).not.toBeNull();
      expect(loaded).toEqual(mockDoc);
    });

    it('produces a shorter string than pretty-printed JSON for repetitive content', () => {
      const bigDoc: DocState = {
        ...mockDoc,
        content: {
          type: 'doc',
          content: Array(50).fill({
            type: 'paragraph',
            content: [{ type: 'text', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }],
          }),
        },
      };
      const json = JSON.stringify(bigDoc);
      const url = encodeDocToUrl(bigDoc);
      const fragment = url.split('#doc=')[1];
      // Compression should beat raw JSON for repetitive content.
      expect(fragment.length).toBeLessThan(json.length);
    });
  });

  describe('loadDocFromUrl', () => {
    it('returns null when the hash has no #doc= fragment', () => {
      window.location.hash = '';
      expect(loadDocFromUrl()).toBeNull();
    });

    it('returns null for an unrelated hash fragment', () => {
      window.location.hash = '#section-2';
      expect(loadDocFromUrl()).toBeNull();
    });

    it('returns null when the fragment is garbage (not valid compressed data)', () => {
      window.location.hash = '#doc=%%%not-valid%%%';
      expect(loadDocFromUrl()).toBeNull();
    });

    it('returns null when the fragment decodes but is not valid JSON', () => {
      // Valid lz-string of a non-JSON string: compressToEncodedURIComponent('hello')
      window.location.hash = '#doc=abc';
      // decompressFromEncodedURIComponent('abc') returns null or garbage → null
      expect(loadDocFromUrl()).toBeNull();
    });

    it('parses a valid #doc= fragment into a DocState', () => {
      const url = encodeDocToUrl(mockDoc);
      const fragment = url.slice(url.indexOf('#doc=') + '#doc='.length);
      window.location.hash = `#doc=${fragment}`;
      vi.stubGlobal('location', { ...location, hash: `#doc=${fragment}` });
      const loaded = loadDocFromUrl();
      expect(loaded).toEqual(mockDoc);
    });
  });

  describe('estimateShareSize', () => {
    it('returns the byte length of the compressed fragment', () => {
      const size = estimateShareSize(mockDoc);
      expect(size).toBeGreaterThan(0);
      // Should be well under the limit for a tiny doc.
      expect(size).toBeLessThan(MAX_SHARE_SIZE);
    });

    it('grows monotonically with document size', () => {
      const small = estimateShareSize(mockDoc);
      const bigDoc: DocState = {
        ...mockDoc,
        content: {
          type: 'doc',
          content: Array(100).fill({
            type: 'paragraph',
            content: [{ type: 'text', text: 'Superlongword'.repeat(100) }],
          }),
        },
      };
      const big = estimateShareSize(bigDoc);
      expect(big).toBeGreaterThan(small);
    });
  });

  describe('canShareViaUrl', () => {
    it('returns true for a small document', () => {
      expect(canShareViaUrl(mockDoc)).toBe(true);
    });

    it('returns false when the compressed payload exceeds MAX_SHARE_SIZE', () => {
      // Build a document whose compressed payload is guaranteed to exceed 30 KB.
      // Random base64 bytes are essentially incompressible, so the compressed
      // size tracks the raw size — this is the worst case for URL sharing.
      const randomBytes = Array.from({ length: 60000 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='[
          Math.floor(Math.random() * 64)
        ]
      ).join('');
      const hugeDoc: DocState = {
        ...mockDoc,
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: randomBytes }] }],
        },
      };
      expect(canShareViaUrl(hugeDoc)).toBe(false);
    });
  });
});
