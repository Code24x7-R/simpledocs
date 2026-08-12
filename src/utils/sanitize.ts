// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Sanitization utilities for document content.
 *
 * Malicious .json documents can contain crafted attribute values
 * that execute scripts when rendered. These utilities validate and
 * clean attributes at document load time.
 */

/**
 * Allowed URL schemes for links and images.
 * Blocks javascript:, data: (non-image), vbscript:, file:, etc.
 */
const ALLOWED_URL_SCHEMES = ['http', 'https', 'mailto', 'tel', '#'];

/**
 * Validate a URL for use in href/src attributes.
 * Returns the URL if safe, or null if it contains a dangerous scheme.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // Allow relative URLs (start with /, ./, ../, or #)
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('#')) {
    return trimmed;
  }

  // Check for scheme-based URLs
  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (!ALLOWED_URL_SCHEMES.includes(scheme)) {
      return null; // Block dangerous schemes (javascript:, data:, vbscript:, etc.)
    }
    return trimmed;
  }

  // No scheme — treat as relative or http
  return trimmed;
}

/**
 * Sanitize an image src — allows http(s) and data: image/* URIs.
 */
export function sanitizeImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;

  const trimmed = src.trim();

  // Allow data: URIs only for image types
  if (trimmed.startsWith('data:')) {
    if (/^data:image\//i.test(trimmed)) {
      return trimmed;
    }
    return null; // Block data: URIs for non-image types (can contain HTML/JS)
  }

  // For non-data URLs, use the standard URL sanitizer
  return sanitizeUrl(trimmed);
}

/**
 * Validate a CSS line-height value.
 * Accepts: numbers (unitless), px, em, rem, %, or 'normal'/'inherit'.
 * Returns the value if valid, or null if potentially dangerous.
 */
export function sanitizeLineHeight(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const str = String(value).trim();

  // Allow CSS keywords
  if (/^(normal|inherit|initial|unset)$/i.test(str)) {
    return str;
  }

  // Allow unitless numbers (e.g., "1.5", "2")
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num >= 0.5 && num <= 10) {
      return str;
    }
    return null;
  }

  // Allow values with units: px, em, rem, %
  if (/^\d+(\.\d+)?(px|em|rem|%)$/.test(str)) {
    return str;
  }

  return null;
}

/**
 * Validate a CSS font-size value.
 * Accepts: number followed by px, em, rem, or %.
 * Returns the value if valid, or null if potentially dangerous.
 */
export function sanitizeFontSize(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const str = String(value).trim();

  // Must have a unit — unitless font-sizes are invalid CSS
  if (/^\d+(\.\d+)?(px|em|rem|%)$/.test(str)) {
    const num = parseFloat(str);
    if (num >= 1 && num <= 200) {
      return str;
    }
    return null;
  }

  return null;
}

/**
 * Validate a CSS indent/margin value (in px).
 * Returns a clamped integer 0-1000, or 0 if invalid.
 */
export function sanitizePixelValue(value: unknown): number {
  if (value === null || value === undefined) return 0;

  const num = typeof value === 'number' ? value : parseInt(String(value), 10);

  if (isNaN(num) || !isFinite(num)) return 0;

  // Clamp to reasonable range
  return Math.max(0, Math.min(1000, Math.round(num)));
}

/**
 * Sanitize a CSS color value.
 * Accepts: hex (#rgb, #rrggbb), rgb(), rgba(), hsl(), hsla(), or CSS named colors.
 * Returns the value if valid, or null if potentially dangerous.
 */
export function sanitizeColor(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const str = String(value).trim();

  // Hex colors: #rgb, #rrggbb, #rrggbbaa
  if(/^#[0-9a-fA-F]{3,8}$/.test(str)) {
    return str;
  }

  // rgb() / rgba()
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(str)) {
    return str;
  }

  // hsl() / hsla()
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/.test(str)) {
    return str;
  }

  // CSS named colors (limited allowlist of common ones)
  const namedColors = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'maroon',
    'navy', 'olive', 'silver', 'teal', 'aqua', 'fuchsia', 'transparent',
    'inherit', 'initial', 'currentColor',
  ];
  if (namedColors.includes(str.toLowerCase())) {
    return str;
  }

  return null;
}
