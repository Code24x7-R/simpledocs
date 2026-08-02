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

  it('parses mm with space before unit', () => {
    expect(parseLength('20 mm')).toEqual({ value: 20, unit: 'mm' });
    expect(parseLength('1.5 in')).toEqual({ value: 1.5, unit: 'in' });
  });

  it('parses uppercase unit strings', () => {
    expect(parseLength('20MM')).toEqual({ value: 20, unit: 'mm' });
    expect(parseLength('1IN')).toEqual({ value: 1, unit: 'in' });
    expect(parseLength('10Mm')).toEqual({ value: 10, unit: 'mm' });
    expect(parseLength('5In')).toEqual({ value: 5, unit: 'in' });
  });

  it('falls back to number parse for invalid format (no unit)', () => {
    // When regex doesn't match, falls back to parseFloat
    expect(parseLength('20')).toEqual({ value: 20, unit: 'mm' });
    expect(parseLength('3.14')).toEqual({ value: 3.14, unit: 'mm' });
  });

  it('returns 0 for non-numeric strings (catch branch)', () => {
    // parseFloat('abc') is NaN, then || 0 kicks in
    expect(parseLength('abc')).toEqual({ value: 0, unit: 'mm' });
    expect(parseLength('')).toEqual({ value: 0, unit: 'mm' });
    expect(parseLength('mm')).toEqual({ value: 0, unit: 'mm' });
  });

  it('handles unsupported units by falling back', () => {
    // 'cm' doesn't match regex, falls back to parseFloat
    expect(parseLength('10cm')).toEqual({ value: 10, unit: 'mm' });
    expect(parseLength('5px')).toEqual({ value: 5, unit: 'mm' });
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

  it('returns A4 landscape dimensions in px', () => {
    const dims = getPagePixelDimensions('A4', 'landscape');
    expect(dims.widthPx).toBeCloseTo(1122.5, 0);
    expect(dims.heightPx).toBeCloseTo(793.7, 0);
  });

  it('returns Letter landscape dimensions in px', () => {
    const dims = getPagePixelDimensions('Letter', 'landscape');
    expect(dims.widthPx).toBeCloseTo(1056, 0);
    expect(dims.heightPx).toBeCloseTo(816, 0);
  });

  it('returns Letter landscape dimensions in mm', () => {
    const dims = getPageDimensions('Letter', 'landscape');
    expect(dims.widthMm).toBeCloseTo(279.4, 1);
    expect(dims.heightMm).toBeCloseTo(215.9, 1);
  });

  // toMm branch coverage
  describe('toMm', () => {
    it('converts mm values directly', () => {
      expect(toMm('10mm')).toBeCloseTo(10, 1);
      expect(toMm('0mm')).toBeCloseTo(0, 1);
      expect(toMm('100mm')).toBeCloseTo(100, 1);
    });

    it('converts inch values to mm', () => {
      expect(toMm('1in')).toBeCloseTo(25.4, 1);
      expect(toMm('0in')).toBeCloseTo(0, 1);
      expect(toMm('10in')).toBeCloseTo(254, 1);
    });

    it('handles invalid format via fallback', () => {
      // No unit → falls back to parseFloat → treated as mm
      expect(toMm('42')).toBeCloseTo(42, 1);
    });

    it('returns 0 for non-numeric', () => {
      expect(toMm('abc')).toBeCloseTo(0, 1);
    });
  });
});
