// SPDX-License-Identifier: MIT
/**
 * Tests for S3-compatible API wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
// types imported for reference

// Mock s3Config
vi.mock('./s3Config', () => ({
  loadS3Config: vi.fn(() => ({
    endpoint: 'https://s3.amazonaws.com',
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKey: 'AKIAIOSFODNN7EXAMPLE',
    secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    prefix: '',
    forcePathStyle: false,
  })),
  saveS3Config: vi.fn(),
  clearS3Config: vi.fn(),
  isS3Configured: vi.fn(() => true),
}));

describe('s3Api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'fetch').mockReset();
  });

  describe('listFiles', () => {
    it('parses XML response and returns S3Object array', async () => {
      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
          <Contents>
            <Key>doc1.sdjson</Key>
            <LastModified>2026-01-15T12:00:00.000Z</LastModified>
            <Size>1024</Size>
          </Contents>
          <Contents>
            <Key>doc2.sdjson</Key>
            <LastModified>2026-01-14T10:00:00.000Z</LastModified>
            <Size>2048</Size>
          </Contents>
          <Contents>
            <Key>readme.txt</Key>
            <LastModified>2026-01-13T08:00:00.000Z</LastModified>
            <Size>512</Size>
          </Contents>
          <IsTruncated>false</IsTruncated>
        </ListBucketResult>`;

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(xmlResponse, { status: 200 })
      );

      const { listFiles } = await import('./s3Api');
      const result = await listFiles();

      // Should only return .sdjson files
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('doc1.sdjson');
      expect(result[0].size).toBe(1024);
      expect(result[1].name).toBe('doc2.sdjson');
    });

    it('sorts files by lastModified descending', async () => {
      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
          <Contents>
            <Key>old.sdjson</Key>
            <LastModified>2026-01-10T12:00:00.000Z</LastModified>
            <Size>100</Size>
          </Contents>
          <Contents>
            <Key>new.sdjson</Key>
            <LastModified>2026-01-20T12:00:00.000Z</LastModified>
            <Size>100</Size>
          </Contents>
          <IsTruncated>false</IsTruncated>
        </ListBucketResult>`;

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(xmlResponse, { status: 200 })
      );

      const { listFiles } = await import('./s3Api');
      const result = await listFiles();

      expect(result[0].name).toBe('new.sdjson');
      expect(result[1].name).toBe('old.sdjson');
    });

    it('returns empty array when no files', async () => {
      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
          <IsTruncated>false</IsTruncated>
        </ListBucketResult>`;

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(xmlResponse, { status: 200 })
      );

      const { listFiles } = await import('./s3Api');
      const result = await listFiles();

      expect(result).toEqual([]);
    });

    it('includes list-type=2 query parameter', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('<?xml version="1.0"?><ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>', { status: 200 })
      );

      const { listFiles } = await import('./s3Api');
      await listFiles();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('list-type=2'),
        expect.any(Object)
      );
    });
  });

  describe('downloadFile', () => {
    it('downloads file content as text', async () => {
      const content = '{"title": "Test Document"}';
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(content, { status: 200 })
      );

      const { downloadFile } = await import('./s3Api');
      const result = await downloadFile('test.sdjson');

      expect(result).toBe(content);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test.sdjson'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws on error response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      const { downloadFile } = await import('./s3Api');
      await expect(downloadFile('missing.sdjson')).rejects.toThrow('S3 error');
    });
  });

  describe('createFile', () => {
    it('uploads file with PUT request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('', { status: 200 })
      );

      const { createFile } = await import('./s3Api');
      const result = await createFile('MyDoc.sdjson', '{"content": true}');

      expect(result.name).toBe('MyDoc.sdjson');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('MyDoc.sdjson'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('sets Content-Type header', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('', { status: 200 })
      );

      const { createFile } = await import('./s3Api');
      await createFile('test.sdjson', '{}');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('deleteFile', () => {
    it('sends DELETE request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('', { status: 200 })
      );

      const { deleteFile } = await import('./s3Api');
      await deleteFile('old-file.sdjson');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('old-file.sdjson'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('testConnection', () => {
    it('returns true on successful HEAD request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('', { status: 200 })
      );

      const { testConnection } = await import('./s3Api');
      const result = await testConnection();

      expect(result).toBe(true);
    });

    it('throws on connection failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Forbidden', { status: 403 })
      );

      const { testConnection } = await import('./s3Api');
      await expect(testConnection()).rejects.toThrow('S3 error');
    });
  });
});
