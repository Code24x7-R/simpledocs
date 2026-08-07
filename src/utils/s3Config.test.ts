// SPDX-License-Identifier: MIT
/**
 * Tests for S3 configuration storage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadS3Config, saveS3Config, clearS3Config, isS3Configured, S3Config } from './s3Config';

const STORAGE_KEY = 'simpledocs_s3_config';

const validConfig: S3Config = {
  endpoint: 'https://s3.amazonaws.com',
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKey: 'AKIAIOSFODNN7EXAMPLE',
  secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  prefix: 'docs/',
  forcePathStyle: false,
};

describe('s3Config', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadS3Config', () => {
    it('returns default config when nothing is stored', () => {
      const config = loadS3Config();
      expect(config.endpoint).toBe('');
      expect(config.region).toBe('us-east-1');
      expect(config.bucket).toBe('');
      expect(config.prefix).toBe('');
      expect(config.forcePathStyle).toBe(false);
    });

    it('loads stored config', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validConfig));
      const config = loadS3Config();
      expect(config.endpoint).toBe('https://s3.amazonaws.com');
      expect(config.bucket).toBe('my-bucket');
      expect(config.accessKey).toBe('AKIAIOSFODNN7EXAMPLE');
    });

    it('merges partial stored config with defaults', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bucket: 'test' }));
      const config = loadS3Config();
      expect(config.bucket).toBe('test');
      expect(config.region).toBe('us-east-1'); // default preserved
    });

    it('handles corrupt JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not valid json{{{');
      const config = loadS3Config();
      expect(config.endpoint).toBe(''); // falls back to defaults
    });
  });

  describe('saveS3Config', () => {
    it('saves config to localStorage', () => {
      saveS3Config(validConfig);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.endpoint).toBe('https://s3.amazonaws.com');
      expect(stored.bucket).toBe('my-bucket');
    });
  });

  describe('clearS3Config', () => {
    it('removes config from localStorage', () => {
      saveS3Config(validConfig);
      clearS3Config();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('isS3Configured', () => {
    it('returns true when all required fields are present', () => {
      expect(isS3Configured(validConfig)).toBe(true);
    });

    it('returns false when endpoint is missing', () => {
      expect(isS3Configured({ ...validConfig, endpoint: '' })).toBe(false);
    });

    it('returns false when bucket is missing', () => {
      expect(isS3Configured({ ...validConfig, bucket: '' })).toBe(false);
    });

    it('returns false when accessKey is missing', () => {
      expect(isS3Configured({ ...validConfig, accessKey: '' })).toBe(false);
    });

    it('returns false when secretKey is missing', () => {
      expect(isS3Configured({ ...validConfig, secretKey: '' })).toBe(false);
    });

    it('returns true even without prefix (optional field)', () => {
      expect(isS3Configured({ ...validConfig, prefix: '' })).toBe(true);
    });
  });
});
