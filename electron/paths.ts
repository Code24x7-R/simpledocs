// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Pure path/MIME helpers for the Electron main process.
 *
 * Kept free of `electron` imports so they can be unit-tested under Vitest.
 */
import path from 'node:path';

export const APP_SCHEME = 'app';
export const APP_HOST = 'simpledocs';
export const DOC_EXTENSION = '.sdjson';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

export function mimeTypeFor(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Map a URL pathname to a file inside `distDir`.
 *
 * Returns null when the request escapes the renderer root (`..`, encoded
 * traversal, absolute paths, NUL bytes). Directory paths resolve to
 * `index.html` so the SPA shell is served at `/`.
 */
export function resolveAppPath(distDir: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;

  // Strip the leading slash and any hash/query remnants.
  let relative = decoded.replace(/^\/+/, '').split('#')[0].split('?')[0];
  if (relative === '' || relative.endsWith('/')) relative += 'index.html';

  const root = path.resolve(distDir);
  const resolved = path.resolve(root, relative);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}
