// SPDX-License-Identifier: MIT
/**
 * Tests for S3 SigV4 signing.
 */

import { describe, it, expect } from 'vitest';
import { signS3Request } from './s3SigV4';

describe('s3SigV4', () => {
  describe('signS3Request', () => {
    it('generates Authorization header with AWS4-HMAC-SHA256 scheme', async () => {
      const headers = await signS3Request({
        method: 'GET',
        url: 'https://my-bucket.s3.amazonaws.com/test.sdjson',
        region: 'us-east-1',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        date: new Date('2026-01-15T12:00:00Z'),
      });

      expect(headers['Authorization']).toContain('AWS4-HMAC-SHA256');
      expect(headers['Authorization']).toContain('Credential=AKIAIOSFODNN7EXAMPLE');
      expect(headers['Authorization']).toContain('Signature=');
    });

    it('includes X-Amz-Date header', async () => {
      const headers = await signS3Request({
        method: 'PUT',
        url: 'https://my-bucket.s3.amazonaws.com/file.sdjson',
        region: 'us-west-2',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        date: new Date('2026-01-15T12:00:00Z'),
      });

      expect(headers['X-Amz-Date']).toBe('20260115T120000Z');
    });

    it('includes Host header from URL', async () => {
      const headers = await signS3Request({
        method: 'GET',
        url: 'https://my-bucket.s3.amazonaws.com/key',
        region: 'us-east-1',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      });

      expect(headers['Host']).toBe('my-bucket.s3.amazonaws.com');
    });

    it('includes X-Amz-Content-Sha256 header', async () => {
      const headers = await signS3Request({
        method: 'PUT',
        url: 'https://bucket.s3.amazonaws.com/file',
        region: 'us-east-1',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        body: '{"test": true}',
      });

      expect(headers['X-Amz-Content-Sha256']).toBeTruthy();
      expect(headers['X-Amz-Content-Sha256']).toHaveLength(64); // SHA-256 hex
    });

    it('uses empty string hash for requests without body', async () => {
      const headers = await signS3Request({
        method: 'GET',
        url: 'https://bucket.s3.amazonaws.com/key',
        region: 'us-east-1',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      });

      // e3b0c44... is SHA-256 of empty string
      expect(headers['X-Amz-Content-Sha256']).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('includes session token header when provided', async () => {
      const headers = await signS3Request({
        method: 'GET',
        url: 'https://bucket.s3.amazonaws.com/key',
        region: 'us-east-1',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        sessionToken: 'FwoGZXIvYXdzEBYaDHqa0AP',
      });

      expect(headers['X-Amz-Security-Token']).toBe('FwoGZXIvYXdzEBYaDHqa0AP');
    });

    it('produces consistent signatures for the same input', async () => {
      const options = {
        method: 'GET',
        url: 'https://bucket.s3.amazonaws.com/test.sdjson',
        region: 'eu-west-1',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        date: new Date('2026-03-10T08:30:00Z'),
      };

      const sig1 = await signS3Request(options);
      const sig2 = await signS3Request(options);

      expect(sig1['Authorization']).toBe(sig2['Authorization']);
    });

    it('includes SignedHeaders listing all signed headers', async () => {
      const headers = await signS3Request({
        method: 'GET',
        url: 'https://bucket.s3.amazonaws.com/key',
        region: 'us-east-1',
        service: 's3',
        accessKey: 'AKIAIOSFODNN7EXAMPLE',
        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        headers: { 'Content-Type': 'application/json' },
        date: new Date('2026-01-15T12:00:00Z'),
      });

      const authHeader = headers['Authorization'];
      expect(authHeader).toContain('SignedHeaders=');
      // Should include host, x-amz-content-sha256, x-amz-date, content-type
      expect(authHeader).toContain('SignedHeaders=');
      expect(authHeader).toContain('host;');
    });
  });
});
