// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Privileged `app://simpledocs` protocol for the packaged renderer.
 *
 * A registered standard/secure scheme gives the app a stable origin, so
 * localStorage, IndexedDB, secure-context clipboard APIs and ES modules behave
 * exactly as they do on the web build. `file://` would give a null origin and
 * break those APIs.
 */
import { protocol } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import { APP_HOST, APP_SCHEME, mimeTypeFor, resolveAppPath } from './paths';

/**
 * Production CSP. The renderer is fully local; network access is limited to
 * HTTPS APIs (Gemini) and local AI servers (LM Studio).
 */
export const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/** Must be called before `app.whenReady()`. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        codeCache: true,
      },
    },
  ]);
}

async function serveFile(filePath: string): Promise<Response> {
  const body = await readFile(filePath);
  const headers = new Headers({
    'Content-Type': mimeTypeFor(filePath),
    'Content-Security-Policy': APP_CSP,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
  });
  return new Response(body, { status: 200, headers });
}

/** Install the request handler. Must be called after `app.whenReady()`. */
export function installAppProtocol(distDir: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      if (url.host !== APP_HOST) {
        return new Response('Not found', { status: 404 });
      }

      const filePath = resolveAppPath(distDir, url.pathname);
      if (!filePath) {
        return new Response('Forbidden', { status: 403 });
      }

      try {
        const info = await stat(filePath);
        if (info.isFile()) return await serveFile(filePath);
      } catch {
        // fall through to the SPA shell
      }

      // SPA fallback: serve the shell for unknown non-asset paths.
      const indexPath = resolveAppPath(distDir, '/index.html');
      if (indexPath) return await serveFile(indexPath);
      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('[app://] Request failed:', err);
      return new Response('Internal error', { status: 500 });
    }
  });
}
