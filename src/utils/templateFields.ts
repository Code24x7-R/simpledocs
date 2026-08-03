// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { Page } from '../types/page';
import type { DocState } from '../store/useDocStore';

/**
 * Template field resolution and merge logic.
 *
 * Supports common field types for document templates:
 * - current_date: Current date with configurable format
 * - document_title: Document title from store
 * - page_number: Current page number (per-page context)
 * - total_pages: Total page count
 * - custom fields: User-defined values
 */

export type FieldType =
  | 'current_date'
  | 'document_title'
  | 'page_number'
  | 'total_pages'
  | 'custom';

export interface FieldDefinition {
  type: FieldType;
  label: string;
  description: string;
}

/** Standard field definitions for the insert dialog */
export const STANDARD_FIELDS: FieldDefinition[] = [
  { type: 'current_date', label: 'Current Date', description: 'Displays the current date' },
  { type: 'document_title', label: 'Document Title', description: 'Displays the document title' },
  { type: 'page_number', label: 'Page Number', description: 'Displays the current page number' },
  { type: 'total_pages', label: 'Total Pages', description: 'Displays the total page count' },
];

/** Field patterns that match template field syntax */
const FIELD_PATTERN = /^\w+$/;

/** Validate a field name */
export function isValidFieldName(name: string): boolean {
  return FIELD_PATTERN.test(name) && name.length <= 50;
}

/** Get the field type from a field name */
export function getFieldType(fieldName: string): FieldType {
  const normalized = fieldName.toLowerCase().replace(/[-\s]/g, '_');
  if (normalized === 'current_date' || normalized === 'date') return 'current_date';
  if (normalized === 'document_title' || normalized === 'title') return 'document_title';
  if (normalized === 'page_number' || normalized === 'page') return 'page_number';
  if (normalized === 'total_pages' || normalized === 'pages') return 'total_pages';
  return 'custom';
}

/** Format options for date fields */
export type DateFormat = 'short' | 'long' | 'iso';

const DATE_FORMATS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  iso: { year: 'numeric', month: '2-digit', day: '2-digit' },
};

/** Resolve a single field value */
export function resolveField(
  fieldName: string,
  docState: DocState,
  pageIndex?: number,
  customValues?: Record<string, string>
): string {
  const fieldType = getFieldType(fieldName);

  switch (fieldType) {
    case 'current_date':
      return resolveDate(new Date(), 'short');

    case 'document_title':
      return docState.title || 'Untitled Document';

    case 'page_number':
      return pageIndex !== undefined ? String(pageIndex + 1) : '?';

    case 'total_pages':
      return String(docState.pages.length);

    case 'custom':
    default:
      // Check custom values first, then return placeholder
      if (customValues && customValues[fieldName]) {
        return customValues[fieldName];
      }
      return `[${fieldName}]`;
  }
}

/** Resolve a date with the specified format */
export function resolveDate(date: Date, format: DateFormat = 'short'): string {
  if (format === 'iso') {
    return date.toISOString().split('T')[0];
  }
  return date.toLocaleDateString('en-AU', DATE_FORMATS[format]);
}

/** Resolve all fields in a text string */
export function resolveText(
  text: string,
  docState: DocState,
  pageIndex?: number,
  customValues?: Record<string, string>
): string {
  // Match {{field_name}} pattern
  return text.replace(/\{\{(\w+)\}\}/g, (_match, fieldName) => {
    return resolveField(fieldName, docState, pageIndex, customValues);
  });
}

/** Result of a merge operation */
export interface MergeResult {
  pages: Page[];
  replacedCount: number;
  fieldsReplaced: Record<string, number>;
}

/**
 * Merge all template fields in a document, replacing them with resolved values.
 * Returns a new pages array with fields replaced by their values.
 */
export function mergeFields(
  pages: Page[],
  docState: DocState,
  customValues?: Record<string, string>
): MergeResult {
  const fieldsReplaced: Record<string, number> = {};

  const mergedPages = pages.map((page, pageIndex) => {
    const content = page.content as any;
    if (!content || !content.content) return page;

    const mergedContent = mergeNodeContent(content, docState, pageIndex, customValues, fieldsReplaced);

    return {
      ...page,
      content: mergedContent,
    };
  });

  // Sum up all replaced fields
  const totalReplaced = Object.values(fieldsReplaced).reduce((sum, count) => sum + count, 0);

  return {
    pages: mergedPages,
    replacedCount: totalReplaced,
    fieldsReplaced,
  };
}

/** Recursively merge fields in a content node */
function mergeNodeContent(
  node: any,
  docState: DocState,
  pageIndex: number,
  customValues: Record<string, string> | undefined,
  fieldsReplaced: Record<string, number>
): any {
  if (!node) return node;

  // If node is a templateField inline node, replace with resolved text
  if (node.type === 'templateField' && node.attrs?.fieldName) {
    const fieldName = node.attrs.fieldName;
    const resolved = resolveField(fieldName, docState, pageIndex, customValues);
    fieldsReplaced[fieldName] = (fieldsReplaced[fieldName] || 0) + 1;
    return { type: 'text', text: resolved };
  }

  // If node is a text node, also resolve any {{field_name}} patterns in the text
  if (node.type === 'text' && node.text) {
    const fieldPattern = /\{\{(\w+)\}\}/;
    if (fieldPattern.test(node.text)) {
      const resolved = resolveText(node.text, docState, pageIndex, customValues);
      const matches = node.text.match(/\{\{(\w+)\}\}/g);
      if (matches) {
        for (const match of matches) {
          const fieldName = match.slice(2, -2);
          fieldsReplaced[fieldName] = (fieldsReplaced[fieldName] || 0) + 1;
        }
      }
      return { ...node, text: resolved };
    }
  }

  // Recursively process child content
  if (node.content && Array.isArray(node.content)) {
    return {
      ...node,
      content: node.content.map((child: any) =>
        mergeNodeContent(child, docState, pageIndex, customValues, fieldsReplaced)
      ),
    };
  }

  return node;
}

/** Count template fields in a content tree */
function countFields(node: any): number {
  if (!node) return 0;
  let count = 0;

  // Check if this node has template field marks
  if (node.marks) {
    count += node.marks.filter((mark: any) => mark.type === 'templateField').length;
  }

  // Recursively count in children
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      count += countFields(child);
    }
  }

  return count;
}

/** Extract all unique field names from a document */
export function extractFieldNames(pages: Page[]): string[] {
  const fieldNames = new Set<string>();

  for (const page of pages) {
    extractFieldNamesFromNode(page.content, fieldNames);
  }

  return Array.from(fieldNames).sort();
}

/** Recursively extract field names from a content node */
function extractFieldNamesFromNode(node: any, fieldNames: Set<string>): void {
  if (!node) return;

  // Check for templateField inline nodes
  if (node.type === 'templateField' && node.attrs?.fieldName) {
    fieldNames.add(node.attrs.fieldName);
  }

  // Check text nodes for field patterns
  if (node.type === 'text' && node.text) {
    const matches = node.text.match(/\{\{(\w+)\}\}/g);
    if (matches) {
      for (const match of matches) {
        const fieldName = match.slice(2, -2); // Remove {{ and }}
        fieldNames.add(fieldName);
      }
    }
  }

  // Recursively process children
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      extractFieldNamesFromNode(child, fieldNames);
    }
  }
}
