// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Recent-file path allowlist for the desktop build.
 *
 * The renderer stores display metadata (name/size) in localStorage, but file
 * paths are only read back by the main process when they appear in this list.
 * Paths enter the list through user actions: native Open/Save dialogs and
 * `.sdjson` file-association launches. A compromised renderer therefore cannot
 * use Recent Files to read arbitrary files.
 */
import path from 'node:path';

export const MAX_RECENT_PATHS = 20;

function pathKey(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/** Sanitise persisted data into absolute, de-duplicated paths. */
export function normalizeRecentPaths(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const resolved = path.resolve(value);
    const key = pathKey(resolved);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(resolved);
    if (result.length >= MAX_RECENT_PATHS) break;
  }

  return result;
}

/** Add a path at the front, removing duplicates and trimming to the cap. */
export function addRecentPath(list: readonly string[], filePath: string): string[] {
  const resolved = path.resolve(filePath);
  const key = pathKey(resolved);
  return [resolved, ...list.filter((entry) => pathKey(entry) !== key)].slice(0, MAX_RECENT_PATHS);
}

/** Whether the path is in the allowlist (case-insensitive on Windows). */
export function isRecentPath(list: readonly string[], filePath: string): boolean {
  const key = pathKey(filePath);
  return list.some((entry) => pathKey(entry) === key);
}
