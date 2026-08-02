import { describe, it, expect } from 'vitest';
import {
  mmToPx,
  pxToMm,
  parseLength,
  toMm,
  getPageDimensions,
  getPagePixelDimensions,
} from './unitConversion';

describe('unitConversion', () => {
  it('converts mm to px at 96 DPI', () => {
    expect(mmToPx(25.4)).toBeCloseTo(96, 1);
    expect(mmToPx(210)).toBeCloseTo(793.7, 0);
  });

  it('converts px to mm', () => {
    expect(pxToMm(96)).toBeCloseTo(25.4, 1);
    expect(pxToMm(793.7)).toBeCloseTo(210, 0);
  });

  it('parses mm length strings', () => {
    expect(parseLength('20mm')).toEqual({ value: 20, unit: 'mm' });
    expect(parseLength('25.4mm')).toEqual({ value: 25.4, unit: 'mm' });
  });

  it('parses inch length strings', () => {
    expect(parseLength('1in')).toEqual({ value: 1, unit: 'in' });
    expect(parseLength('0.5in')).toEqual({ value: 0.5, unit: 'in' });
  });

  it('converts any length string to mm', () => {
    expect(toMm('25.4mm')).toBeCloseTo(25.4, 1);
    expect(toMm('1in')).toBeCloseTo(25.4, 1);
    expect(toMm('2in')).toBeCloseTo(50.8, 1);
  });

  it('returns A4 portrait dimensions in mm', () => {
    const dims = getPageDimensions('A4', 'portrait');
    expect(dims.widthMm).toBe(210);
    expect(dims.heightMm).toBe(297);
  });

  it('returns A4 landscape dimensions in mm', () => {
    const dims = getPageDimensions('A4', 'landscape');
    expect(dims.widthMm).toBe(297);
    expect(dims.heightMm).toBe(210);
  });

  it('returns Letter portrait dimensions in mm', () => {
    const dims = getPageDimensions('Letter', 'portrait');
    expect(dims.widthMm).toBeCloseTo(215.9, 1);
    expect(dims.heightMm).toBeCloseTo(279.4, 1);
  });

  it('returns A4 portrait dimensions in px', () => {
    const dims = getPagePixelDimensions('A4', 'portrait');
    expect(dims.widthPx).toBeCloseTo(793.7, 0);
    expect(dims.heightPx).toBeCloseTo(1122.5, 0);
  });
});
