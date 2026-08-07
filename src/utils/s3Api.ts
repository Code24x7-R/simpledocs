// SPDX-License-Identifier: MIT
/**
 * S3-compatible API wrapper.
 *
 * Provides CRUD operations for documents stored in any S3-compatible
 * object storage service (AWS S3, MinIO, Wasabi, DigitalOcean Spaces,
 * Backblaze B2, Cloudflare R2, etc.) using lightweight SigV4 signing.
 *
 * No external SDK required — uses native fetch and Web Crypto API.
 */

import { signS3Request } from './s3SigV4';
import { loadS3Config, S3Config } from './s3Config';

export const SIMPLEDOCS_CONTENT_TYPE = 'application/json';

/** A file entry from S3. */
export interface S3Object {
  key: string;
  name: string;
  lastModified: string;
  size: number;
}

// ListObjectsV2 XML is parsed directly in parseListObjectsXml().

/**
 * Build the base URL for S3 operations.
 */
function buildBaseUrl(config: S3Config): string {
  if (config.forcePathStyle) {
    // Path-style: https://endpoint/bucket
    return `${config.endpoint.replace(/\/$/, '')}/${config.bucket}`;
  }
  // Virtual-host-style: https://bucket.endpoint
  return `${config.endpoint.replace(/\/$/, '')}/${config.bucket}`;
}

/**
 * Build the full URL for a given key.
 */
function buildObjectUrl(config: S3Config, key: string): string {
  const base = buildBaseUrl(config);
  return `${base}/${key}`;
}

/**
 * Make an authenticated S3 request.
 */
async function s3Request(
  method: string,
  url: string,
  options: {
    config: S3Config;
    body?: string;
    contentType?: string;
  }
): Promise<Response> {
  const { config, body, contentType } = options;

  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const signedHeaders = await signS3Request({
    method,
    url,
    region: config.region,
    service: 's3',
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    body,
    headers,
  });

  const response = await fetch(url, {
    method,
    headers: signedHeaders,
    body: body && method !== 'GET' && method !== 'HEAD' ? body : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`S3 error (${response.status}): ${errorText}`);
  }

  return response;
}

/**
 * List SimpleDocs files in the S3 bucket.
 * @param maxKeys - Maximum number of keys to return (default 100).
 */
export async function listFiles(maxKeys = 100): Promise<S3Object[]> {
  const config = loadS3Config();
  const prefix = config.prefix || '';

  const params: Record<string, string> = {
    'list-type': '2',
    'max-keys': String(maxKeys),
  };
  if (prefix) {
    params.prefix = prefix;
  }

  const queryStr = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const baseUrl = buildBaseUrl(config);
  const url = `${baseUrl}/?${queryStr}`;

  const response = await s3Request('GET', url, { config });
  const text = await response.text();

  // Parse XML response (S3 uses XML, not JSON)
  const parsed = parseListObjectsXml(text);

  return parsed
    .filter((obj) => obj.name.endsWith('.sdjson'))
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

/**
 * Parse S3 ListObjectsV2 XML response into S3Object[].
 */
function parseListObjectsXml(xml: string): S3Object[] {
  const objects: S3Object[] = [];

  // Extract all <Contents> blocks
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match: RegExpExecArray | null;

  while ((match = contentsRegex.exec(xml)) !== null) {
    const block = match[1];
    const keyMatch = /<Key>(.*?)<\/Key>/.exec(block);
    const modifiedMatch = /<LastModified>(.*?)<\/LastModified>/.exec(block);
    const sizeMatch = /<Size>(\d+)<\/Size>/.exec(block);

    if (keyMatch) {
      const fullKey = keyMatch[1];
      const name = fullKey.split('/').pop() || fullKey;
      objects.push({
        key: fullKey,
        name,
        lastModified: modifiedMatch ? modifiedMatch[1] : '',
        size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
      });
    }
  }

  return objects;
}

/**
 * Download a file's content as text.
 */
export async function downloadFile(key: string): Promise<string> {
  const config = loadS3Config();
  const url = buildObjectUrl(config, key);
  const response = await s3Request('GET', url, { config });
  return response.text();
}

/**
 * Upload/create a file.
 * @param name - File name (e.g., "My Doc.sdjson")
 * @param content - JSON string to save
 */
export async function createFile(name: string, content: string): Promise<S3Object> {
  const config = loadS3Config();
  const key = config.prefix ? `${config.prefix}${name}` : name;
  const url = buildObjectUrl(config, key);

  await s3Request('PUT', url, {
    config,
    body: content,
    contentType: SIMPLEDOCS_CONTENT_TYPE,
  });

  return {
    key,
    name,
    lastModified: new Date().toISOString(),
    size: content.length,
  };
}

/**
 * Delete a file.
 */
export async function deleteFile(key: string): Promise<void> {
  const config = loadS3Config();
  const url = buildObjectUrl(config, key);
  await s3Request('DELETE', url, { config });
}

/**
 * Test the S3 connection by listing the bucket.
 * Returns true if successful, throws on failure.
 */
export async function testConnection(): Promise<boolean> {
  const config = loadS3Config();
  const baseUrl = buildBaseUrl(config);
  const url = `${baseUrl}/?max-keys=1`;

  const response = await s3Request('HEAD', url, { config });
  return response.ok;
}
