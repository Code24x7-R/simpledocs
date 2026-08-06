// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Tests for Google Drive API wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock driveAuth
vi.mock('./driveAuth', () => ({
  requestAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
  initDriveAuth: vi.fn(() => Promise.resolve()),
}));

describe('driveApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'fetch').mockReset();
  });

  describe('listFiles', () => {
    it('fetches files with correct query', async () => {
      const mockFiles = [
        { id: 'file1', name: 'Doc1.sdjson', mimeType: 'application/vnd.simpledocs+json', createdTime: '2026-01-01', modifiedTime: '2026-01-02' },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ files: mockFiles }), { status: 200 })
      );

      const { listFiles } = await import('./driveApi');
      const result = await listFiles();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('file1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('files?'),
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
    });

    it('includes parent folder in query when provided', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ files: [] }), { status: 200 })
      );

      const { listFiles } = await import('./driveApi');
      await listFiles('folder123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('folder123'),
        expect.any(Object)
      );
    });

    it('throws on error response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Not found', { status: 404 })
      );

      const { listFiles } = await import('./driveApi');
      await expect(listFiles()).rejects.toThrow('Drive API error');
    });
  });

  describe('createFile', () => {
    it('uploads file with multipart request', async () => {
      const mockResponse = {
        id: 'new-file-id',
        name: 'Test.sdjson',
        mimeType: 'application/vnd.simpledocs+json',
        createdTime: '2026-01-01',
        modifiedTime: '2026-01-01',
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { createFile } = await import('./driveApi');
      const result = await createFile('Test.sdjson', '{"content": "test"}', 'parent-folder');

      expect(result.id).toBe('new-file-id');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('uploadType=multipart'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': expect.stringContaining('multipart/related'),
          }),
        })
      );
    });

    it('includes parent folder in metadata', async () => {
      let requestBody = '';
      vi.spyOn(global, 'fetch').mockImplementation((_, init) => {
        requestBody = (init as RequestInit).body as string;
        return Promise.resolve(
          new Response(JSON.stringify({ id: 'file-id', name: 'test.sdjson' }), { status: 200 })
        );
      });

      const { createFile } = await import('./driveApi');
      await createFile('test.sdjson', '{}', 'folder-abc');

      expect(requestBody).toContain('folder-abc');
    });
  });

  describe('downloadFile', () => {
    it('downloads file content as text', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{"content": "document data"}', { status: 200 })
      );

      const { downloadFile } = await import('./driveApi');
      const content = await downloadFile('file-id');

      expect(content).toBe('{"content": "document data"}');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('file-id'),
        expect.any(Object)
      );
    });
  });

  describe('updateFile', () => {
    it('patches file content', async () => {
      const mockResponse = { id: 'file-id', name: 'updated.sdjson', modifiedTime: '2026-01-02' };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { updateFile } = await import('./driveApi');
      const result = await updateFile('file-id', '{"updated": true}');

      expect(result.modifiedTime).toBe('2026-01-02');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('file-id'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('deleteFile', () => {
    it('sends DELETE request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 })
      );

      const { deleteFile } = await import('./driveApi');
      await deleteFile('file-to-delete');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('file-to-delete'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('renameFile', () => {
    it('patches file with new name', async () => {
      const mockResponse = { id: 'file-id', name: 'NewName.sdjson' };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { renameFile } = await import('./driveApi');
      const result = await renameFile('file-id', 'NewName.sdjson');

      expect(result.name).toBe('NewName.sdjson');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('file-id'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'NewName.sdjson' }),
        })
      );
    });
  });

  describe('createFolder', () => {
    it('creates folder with correct MIME type', async () => {
      const mockResponse = { id: 'folder-id', name: 'My Folder', mimeType: 'application/vnd.google-apps.folder' };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const { createFolder } = await import('./driveApi');
      const result = await createFolder('My Folder');

      expect(result.mimeType).toBe('application/vnd.google-apps.folder');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/files'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'My Folder', mimeType: 'application/vnd.google-apps.folder' }),
        })
      );
    });
  });

  describe('listFolders', () => {
    it('fetches folders with correct MIME type filter', async () => {
      const mockFolders = [
        { id: 'folder1', name: 'Documents', createdTime: '2026-01-01', modifiedTime: '2026-01-01' },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ files: mockFolders }), { status: 200 })
      );

      const { listFolders } = await import('./driveApi');
      const result = await listFolders();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('folder1');
      // The MIME type filter is in the URL query string
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('folder'),
        expect.any(Object)
      );
    });
  });

  describe('getFileMetadata', () => {
    it('fetches file metadata', async () => {
      const mockMetadata = {
        id: 'file-id',
        name: 'Document.sdjson',
        mimeType: 'application/vnd.simpledocs+json',
        createdTime: '2026-01-01',
        modifiedTime: '2026-01-02',
        size: '1234',
      };

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockMetadata), { status: 200 })
      );

      const { getFileMetadata } = await import('./driveApi');
      const result = await getFileMetadata('file-id');

      expect(result.name).toBe('Document.sdjson');
      expect(result.size).toBe('1234');
    });
  });
});
