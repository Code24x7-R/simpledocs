// SPDX-License-Identifier: MIT
/**
 * S3-compatible configuration storage.
 *
 * Stores endpoint, region, bucket, and credentials in localStorage.
 * Supports any S3-compatible service: AWS S3, MinIO, Wasabi,
 * DigitalOcean Spaces, Backblaze B2, Cloudflare R2, etc.
 */

const STORAGE_KEY = 'simpledocs_s3_config';

export interface S3Config {
  /** Service endpoint, e.g. "https://s3.amazonaws.com" or "https://nyc3.digitaloceanspaces.com" */
  endpoint: string;
  /** Region, e.g. "us-east-1" */
  region: string;
  /** Bucket name */
  bucket: string;
  /** Access Key ID */
  accessKey: string;
  /** Secret Access Key */
  secretKey: string;
  /** Optional path prefix (folder) for all files, e.g. "simpledocs/" */
  prefix: string;
  /** Optional: force path-style addressing (needed for MinIO, etc.) */
  forcePathStyle: boolean;
}

const DEFAULT_CONFIG: S3Config = {
  endpoint: '',
  region: 'us-east-1',
  bucket: '',
  accessKey: '',
  secretKey: '',
  prefix: '',
  forcePathStyle: false,
};

/**
 * Load S3 configuration from localStorage.
 */
export function loadS3Config(): S3Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save S3 configuration to localStorage.
 */
export function saveS3Config(config: S3Config): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Clear saved S3 configuration.
 */
export function clearS3Config(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if S3 has been configured (minimum required fields).
 */
export function isS3Configured(config: S3Config): boolean {
  return !!(
    config.endpoint &&
    config.bucket &&
    config.accessKey &&
    config.secretKey
  );
}
