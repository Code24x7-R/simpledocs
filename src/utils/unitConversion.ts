// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
const MM_PER_INCH = 25.4;
const DPI = 96;

export function mmToPx(mm: number): number {
  return (mm / MM_PER_INCH) * DPI;
}

export function pxToMm(px: number): number {
  return (px / DPI) * MM_PER_INCH;
}

export function parseLength(value: string): { value: number; unit: 'mm' | 'in' } {
  const match = value.match(/^([\d.]+)\s*(mm|in)$/i);
  if (!match) return { value: parseFloat(value) || 0, unit: 'mm' };
  return {
    value: parseFloat(match[1]),
    unit: match[2].toLowerCase() as 'mm' | 'in',
  };
}

export function toMm(value: string): number {
  const { value: num, unit } = parseLength(value);
  return unit === 'in' ? num * MM_PER_INCH : num;
}

export const PAGE_FORMATS = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
} as const;

export function getPageDimensions(
  format: 'A4' | 'Letter',
  orientation: 'portrait' | 'landscape'
): { widthMm: number; heightMm: number } {
  const dims = PAGE_FORMATS[format];
  if (orientation === 'landscape') {
    return { widthMm: dims.height, heightMm: dims.width };
  }
  return { widthMm: dims.width, heightMm: dims.height };
}

export function getPagePixelDimensions(
  format: 'A4' | 'Letter',
  orientation: 'portrait' | 'landscape'
): { widthPx: number; heightPx: number } {
  const { widthMm, heightMm } = getPageDimensions(format, orientation);
  return {
    widthPx: mmToPx(widthMm),
    heightPx: mmToPx(heightMm),
  };
}
