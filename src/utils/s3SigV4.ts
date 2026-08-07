// SPDX-License-Identifier: MIT
/**
 * Lightweight AWS Signature Version 4 signing for S3-compatible APIs.
 *
 * Implements enough of SigV4 to sign GET, PUT, DELETE, and List requests
 * against S3-compatible endpoints (AWS S3, MinIO, Wasabi, DigitalOcean
 * Spaces, Backblaze B2, Cloudflare R2, etc.) without any external SDK.
 *
 * Uses the Web Crypto API (SubtleCrypto) for HMAC-SHA256.
 */

const EMPTY_STRING_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Convert a string to a Uint8Array (UTF-8).
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Hex-encode a byte array.
 */
function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash a string, returning hex.
 */
async function sha256Hex(message: string): Promise<string> {
  const data = stringToBytes(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return hexEncode(new Uint8Array(hashBuffer));
}

/**
 * HMAC-SHA256, returning raw bytes.
 */
async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const msgData = stringToBytes(message);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData as BufferSource);
  return new Uint8Array(sig);
}

/**
 * HMAC-SHA256 returning hex string.
 */
async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
  const bytes = await hmacSha256(key, message);
  return hexEncode(bytes);
}

/**
 * URI-encode a string per AWS rules (RFC 3986, but keeping ~ unescaped).
 */
function uriEncode(str: string): string {
  return encodeURIComponent(str).replace(/%2F/g, '/');
}

/**
 * Get the host header from a URL.
 */
function getHost(url: string): string {
  return new URL(url).hostname;
}

/**
 * Build a canonical query string (sorted, encoded).
 */
function canonicalQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(params[k])}`)
    .join('&');
}

/**
 * Sign an S3 request using AWS Signature Version 4.
 *
 * Returns headers that should be added to the fetch request.
 *
 * @param options - Signing parameters
 * @returns Headers to add to the request
 */
export async function signS3Request(options: {
  method: string;
  url: string;
  region: string;
  service: string;
  accessKey: string;
  secretKey: string;
  /** Optional session token (for temporary credentials). */
  sessionToken?: string;
  /** Request body (string or undefined). Defaults to empty. */
  body?: string;
  /** Existing headers to include in signing. */
  headers?: Record<string, string>;
  /** Override date (defaults to now). For testing only. */
  date?: Date;
}): Promise<Record<string, string>> {
  const {
    method,
    url,
    region,
    service,
    accessKey,
    secretKey,
    sessionToken,
    body,
    headers: extraHeaders,
    date,
  } = options;

  const now = date ?? new Date();
  const isoDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = isoDate.slice(0, 8); // YYYYMMDD
  const host = getHost(url);

  // Build headers
  const signedHeaders: Record<string, string> = {
    Host: host,
    'X-Amz-Date': isoDate,
    ...extraHeaders,
  };

  if (sessionToken) {
    signedHeaders['X-Amz-Security-Token'] = sessionToken;
  }

  // Payload hash
  const payloadHash = body ? await sha256Hex(body) : EMPTY_STRING_HASH;
  signedHeaders['X-Amz-Content-Sha256'] = payloadHash;

  // Canonical headers (lowercase keys, sorted)
  const canonicalHeaderKeys = Object.keys(signedHeaders)
    .map((k) => k.toLowerCase())
    .sort();

  const canonicalHeaders = canonicalHeaderKeys
    .map((k) => {
      const value = signedHeaders[Object.keys(signedHeaders).find((key) => key.toLowerCase() === k)!];
      return `${k}:${value.trim().replace(/\s+/g, ' ')}\n`;
    })
    .join('');

  const signedHeaderNames = canonicalHeaderKeys.join(';');

  // Parse URL for path and query
  const parsedUrl = new URL(url);
  // Ensure path is properly encoded — encode each segment, keep forward slashes
  const properlyEncodedPath = parsedUrl.pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const canonicalQuery = canonicalQueryString(
    Object.fromEntries(parsedUrl.searchParams.entries())
  );

  // Canonical request
  const canonicalRequest = [
    method.toUpperCase(),
    properlyEncodedPath,
    canonicalQuery,
    canonicalHeaders,
    signedHeaderNames,
    payloadHash,
  ].join('\n');

  // String to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    isoDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  // Signing key
  const kDate = await hmacSha256(stringToBytes(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  // Signature
  const signature = await hmacSha256Hex(kSigning, stringToSign);

  // Authorization header
  signedHeaders['Authorization'] =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaderNames}, ` +
    `Signature=${signature}`;

  return signedHeaders;
}
