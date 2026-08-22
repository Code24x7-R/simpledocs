// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * Shared color palettes for text color and highlight pickers.
 * Used by both the Toolbar and the BubbleMenu to ensure consistency.
 */

export const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

/**
 * Line height options for the Layout menu.
 * Used by the Navbar's Layout dropdown.
 */
export const LINE_HEIGHTS = [
  { label: 'Default', value: '' },
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3' },
];

/**
 * Paragraph spacing options for the Layout menu.
 * before/after are in pt-ish units consumed by the paragraphSpacing extension.
 */
export const PARAGRAPH_SPACING = [
  { label: 'Default', before: 0, after: 0 },
  { label: '0pt / 0pt', before: 0, after: 0 },
  { label: '6pt / 6pt', before: 8, after: 8 },
  { label: '12pt / 12pt', before: 16, after: 16 },
  { label: '18pt / 18pt', before: 24, after: 24 },
  { label: '12pt / 6pt', before: 16, after: 8 },
  { label: '6pt / 12pt', before: 8, after: 16 },
];

export const HIGHLIGHT_COLORS = [
  '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', // Yellows
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', // Greens
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', // Blues
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', // Indigos
  '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', // Reds
  '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', // Purples
  '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', // Oranges
];
