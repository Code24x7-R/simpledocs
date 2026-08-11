// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for Microsoft OneDrive API wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock onedriveAuth
vi.mock('./onedriveAuth', () => ({
  getAccessToken: vi.fn(() => Promise.resolve('mock-ms-token')),
  signIn: vi.fn(() => Promise.resolve('mock-ms-token')),
  signOut: vi.fn(() => Promise.resolve()),
  isSignedIn: vi.fn(() => false),
}));

describe('onedriveApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'fetch').mockReset();
  });

  describe('listFiles', () => {
    it('fetches files from app folder', async () => {
      const mockItems = [
        { id: 'item1', name: 'Doc1.sdjson', lastModifiedDateTime: '2026-01-02', file: { mimeType: 'application/json' } },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ value: mockItems }), { status: 200 })
      );

      const { listFiles } = await import('./onedriveApi');
      const result = await listFiles();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('approot'),
        expect.any(Object)
      );
    });

    it('throws on error response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Not found', { status: 404 })
      );

      const { listFiles } = await import('./onedriveApi');
      await expect(listFiles()).rejects.toThrow('OneDrive API error');
    });
  });

  describe('downloadFile', () => {
    it('downloads file content as text', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{"content": "document data"}', { status: 200 })
      );

      const { downloadFile } = await import('./onedriveApi');
      const content = await downloadFile('item-id');

      expect(content).toBe('{"content": "document data"}');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('item-id'),
        expect.any(Object)
      );
    });
  });

  describe('downloadFileFast', () => {
    it('uses direct download URL when available', async () => {
      const mockMetadata = {
        id: 'item-id',
        name: 'test.sdjson',
        '@microsoft.graph.downloadUrl': 'https://download.url/file',
      };

      vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (url === 'https://download.url/file') {
          return Promise.resolve(new Response('{"fast": true}', { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify(mockMetadata), { status: 200 }));
      });

      const { downloadFileFast } = await import('./onedriveApi');
      const content = await downloadFileFast('item-id');

      expect(content).toBe('{"fast": true}');
    });

    it('falls back to content endpoint when no download URL', async () => {
      // First call for metadata returns no downloadUrl
      vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/content')) {
          return Promise.resolve(new Response('{"fallback": true}', { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ id: 'item-id' }), { status: 200 }));
      });

      const { downloadFileFast } = await import('./onedriveApi');
      const content = await downloadFileFast('item-id');

      expect(content).toBe('{"fallback": true}');
    });
  });

  describe('createFile', () => {
    it('uploads file with PUT request', async () => {
      const mockResponse = {
        id: 'new-item-id',
        name: 'Test.sdjson',
        lastModifiedDateTime: '2026-01-01',
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { createFile } = await import('./onedriveApi');
      const result = await createFile('Test.sdjson', '{"content": "test"}');

      expect(result.id).toBe('new-item-id');
      // Verify fetch was called with PUT method and correct URL
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[0]).toContain('Test.sdjson');
      expect(fetchCall[1].method).toBe('PUT');
      expect(fetchCall[1].headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('updateFile', () => {
    it('updates file content with PUT', async () => {
      const mockResponse = { id: 'item-id', name: 'updated.sdjson', lastModifiedDateTime: '2026-01-02' };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { updateFile } = await import('./onedriveApi');
      const result = await updateFile('item-id', '{"updated": true}');

      expect(result.lastModifiedDateTime).toBe('2026-01-02');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('item-id'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('deleteFile', () => {
    it('sends DELETE request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 })
      );

      const { deleteFile } = await import('./onedriveApi');
      await deleteFile('item-to-delete');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('item-to-delete'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('renameFile', () => {
    it('patches file with new name', async () => {
      const mockResponse = { id: 'item-id', name: 'NewName.sdjson' };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { renameFile } = await import('./onedriveApi');
      const result = await renameFile('item-id', 'NewName.sdjson');

      expect(result.name).toBe('NewName.sdjson');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('item-id'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'NewName.sdjson' }),
        })
      );
    });
  });

  describe('createFolder', () => {
    it('creates folder with correct structure', async () => {
      const mockResponse = { id: 'folder-id', name: 'My Folder', folder: { childCount: 0 } };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { createFolder } = await import('./onedriveApi');
      const result = await createFolder('My Folder');

      expect(result.folder).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('approot'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('My Folder'),
        })
      );
    });
  });

  describe('getFileMetadata', () => {
    it('fetches file metadata', async () => {
      const mockMetadata = {
        id: 'item-id',
        name: 'Document.sdjson',
        size: 1234,
        lastModifiedDateTime: '2026-01-02',
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockMetadata), { status: 200 })
      );

      const { getFileMetadata } = await import('./onedriveApi');
      const result = await getFileMetadata('item-id');

      expect(result.name).toBe('Document.sdjson');
      expect(result.size).toBe(1234);
    });
  });

  describe('getAppFolder', () => {
    it('returns app folder metadata', async () => {
      const mockFolder = { id: 'approot-id', name: 'Apps/SimpleDocs', folder: { childCount: 5 } };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockFolder), { status: 200 })
      );

      const { getAppFolder } = await import('./onedriveApi');
      const result = await getAppFolder();

      expect(result?.id).toBe('approot-id');
    });

    it('returns null on error', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Not found', { status: 404 })
      );

      const { getAppFolder } = await import('./onedriveApi');
      const result = await getAppFolder();

      expect(result).toBeNull();
    });
  });

  describe('listAllFiles', () => {
    it('fetches files from root', async () => {
      const mockItems = [
        { id: 'item1', name: 'RootDoc.sdjson', lastModifiedDateTime: '2026-01-02', file: { mimeType: 'application/json' } },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ value: mockItems }), { status: 200 })
      );

      const { listAllFiles } = await import('./onedriveApi');
      const result = await listAllFiles();

      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('root'),
        expect.any(Object)
      );
    });
  });
});
