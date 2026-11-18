// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Extract `.sdjson` document paths from a process argv array.
 *
 * Windows launches an associated file as `SimpleDocs.exe "C:\Docs\file.sdjson"`.
 * The same parser serves first launch and the `second-instance` event.
 */
import path from 'node:path';
import { DOC_EXTENSION, WORD_EXTENSION } from './paths';

/** Remove surrounding quotes and trim whitespace. */
function normalizeArgument(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Return absolute, de-duplicated document paths from argv, preserving order.
 * Flags (`--flag`) and non-document arguments are ignored.
 */
export function extractDocumentPaths(argv: readonly string[]): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();

  for (const raw of argv.slice(1)) {
    if (!raw || raw.startsWith('-')) continue;
    const candidate = normalizeArgument(raw);
    if (!candidate) continue;
    const extension = path.extname(candidate).toLowerCase();
    if (extension !== DOC_EXTENSION && extension !== WORD_EXTENSION) continue;

    const absolute = path.resolve(candidate);
    const key = process.platform === 'win32' ? absolute.toLowerCase() : absolute;
    if (!seen.has(key)) {
      seen.add(key);
      paths.push(absolute);
    }
  }

  return paths;
}
