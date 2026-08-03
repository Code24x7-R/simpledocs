// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Pagination types — shared between pagination utilities and context.
 */

export type MeasurementUnit = 'pt' | 'px' | 'mm' | 'in';
export type FontType = 'proportional' | 'fixed';

export interface PageGeometry {
  unit: MeasurementUnit;
  width: number;
  height: number;
  margins: { top: number; bottom: number; left: number; right: number };
  headerHeight: number;
  footerHeight: number;
}

export interface TypographyDefaults {
  fontFamily: string;
  fontType: FontType;
  fontSize: number;
  lineHeightMultiplier: number;
  fixedCharacterWidth?: number;
}
