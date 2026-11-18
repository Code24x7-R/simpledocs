// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { mimeTypeFor, resolveAppPath } from './paths';

const DIST = path.resolve('dist');

describe('resolveAppPath', () => {
  it('serves the SPA shell at the root', () => {
    expect(resolveAppPath(DIST, '/')).toBe(path.join(DIST, 'index.html'));
  });

  it('maps asset paths inside dist', () => {
    expect(resolveAppPath(DIST, '/assets/index-abc.js')).toBe(path.join(DIST, 'assets', 'index-abc.js'));
  });

  it('decodes percent-encoded names', () => {
    expect(resolveAppPath(DIST, '/assets/R%C3%A9sum%C3%A9.js')).toBe(
      path.join(DIST, 'assets', 'Résumé.js')
    );
  });

  it('rejects traversal with ..', () => {
    expect(resolveAppPath(DIST, '/../package.json')).toBeNull();
    expect(resolveAppPath(DIST, '/assets/../../package.json')).toBeNull();
    expect(resolveAppPath(DIST, '/%2e%2e/package.json')).toBeNull();
  });

  it('rejects NUL bytes and malformed encoding', () => {
    expect(resolveAppPath(DIST, '/a%00b.js')).toBeNull();
    expect(resolveAppPath(DIST, '/%E0%A4%A')).toBeNull();
  });
});

describe('mimeTypeFor', () => {
  it.each([
    ['index.html', 'text/html; charset=utf-8'],
    ['app.js', 'text/javascript; charset=utf-8'],
    ['style.css', 'text/css; charset=utf-8'],
    ['manifest.json', 'application/json; charset=utf-8'],
    ['icon.svg', 'image/svg+xml'],
    ['icon-192.png', 'image/png'],
    ['font.woff2', 'font/woff2'],
  ])('%s → %s', (file, expected) => {
    expect(mimeTypeFor(file)).toBe(expected);
  });

  it('falls back to octet-stream', () => {
    expect(mimeTypeFor('unknown.bin')).toBe('application/octet-stream');
  });
});
