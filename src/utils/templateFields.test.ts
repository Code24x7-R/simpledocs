// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect } from 'vitest';
import {
  getFieldType,
  isValidFieldName,
  resolveField,
  resolveDate,
  resolveText,
  mergeFields,
  extractFieldNames,
} from './templateFields';
import type { DocState } from '../store/useDocStore';

const createMockDocState = (overrides?: Partial<DocState>): DocState => ({
  id: 'test',
  title: 'Test Document',
  createdAt: '2026-08-04T00:00:00Z',
  updatedAt: '2026-08-04T00:00:00Z',
  totalPages: 3,
  settings: {
    pageFormat: 'A4',
    orientation: 'portrait',
    margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
    header: { enabled: false, content: '' },
    footer: { enabled: false, showPageNumbers: false },
    pageGap: 24,
    showPageBackgrounds: true,
    orphans: 2,
    widows: 2,
  },
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  },
  ...overrides,
});

describe('templateFields', () => {
  describe('getFieldType', () => {
    it('identifies current_date variants', () => {
      expect(getFieldType('current_date')).toBe('current_date');
      expect(getFieldType('date')).toBe('current_date');
      expect(getFieldType('Current_Date')).toBe('current_date');
    });

    it('identifies document_title variants', () => {
      expect(getFieldType('document_title')).toBe('document_title');
      expect(getFieldType('title')).toBe('document_title');
    });

    it('identifies page_number variants', () => {
      expect(getFieldType('page_number')).toBe('page_number');
      expect(getFieldType('page')).toBe('page_number');
    });

    it('identifies total_pages variants', () => {
      expect(getFieldType('total_pages')).toBe('total_pages');
      expect(getFieldType('pages')).toBe('total_pages');
    });

    it('returns custom for unknown fields', () => {
      expect(getFieldType('recipient_name')).toBe('custom');
      expect(getFieldType('invoice_number')).toBe('custom');
    });
  });

  describe('isValidFieldName', () => {
    it('accepts valid field names', () => {
      expect(isValidFieldName('current_date')).toBe(true);
      expect(isValidFieldName('fieldName')).toBe(true);
      expect(isValidFieldName('field123')).toBe(true);
    });

    it('rejects invalid field names', () => {
      expect(isValidFieldName('')).toBe(false);
      expect(isValidFieldName('field-name')).toBe(false);
      expect(isValidFieldName('field name')).toBe(false);
      expect(isValidFieldName('field.name')).toBe(false);
    });

    it('rejects field names that are too long', () => {
      expect(isValidFieldName('a'.repeat(51))).toBe(false);
      expect(isValidFieldName('a'.repeat(50))).toBe(true);
    });
  });

  describe('resolveField', () => {
    const docState = createMockDocState({ totalPages: 3 });

    it('resolves current_date to a date string', () => {
      const result = resolveField('current_date', docState);
      expect(result).toMatch(/^\d{1,2}\s+\w+\s+\d{4}$/); // e.g., "4 Aug 2026"
    });

    it('resolves document_title', () => {
      const result = resolveField('document_title', docState);
      expect(result).toBe('Test Document');
    });

    it('resolves document_title for untitled', () => {
      const untitledState = createMockDocState({ title: '' });
      const result = resolveField('document_title', untitledState);
      expect(result).toBe('Untitled Document');
    });

    it('resolves page_number with page index', () => {
      expect(resolveField('page_number', docState, 0)).toBe('1');
      expect(resolveField('page_number', docState, 1)).toBe('2');
      expect(resolveField('page_number', docState, 2)).toBe('3');
    });

    it('resolves page_number without index as ?', () => {
      expect(resolveField('page_number', docState)).toBe('?');
    });

    it('resolves total_pages', () => {
      expect(resolveField('total_pages', docState)).toBe('3');
    });

    it('resolves custom fields with custom values', () => {
      const customValues = { recipient_name: 'John Doe' };
      expect(resolveField('recipient_name', docState, 0, customValues)).toBe('John Doe');
    });

    it('resolves custom fields without values as placeholder', () => {
      expect(resolveField('recipient_name', docState)).toBe('[recipient_name]');
    });
  });

  describe('resolveDate', () => {
    it('formats date in short format', () => {
      const date = new Date(2026, 7, 4); // Aug 4, 2026
      expect(resolveDate(date, 'short')).toBe('4 Aug 2026');
    });

    it('formats date in long format', () => {
      const date = new Date(2026, 7, 4);
      expect(resolveDate(date, 'long')).toBe('4 August 2026');
    });

    it('formats date in ISO format', () => {
      // Use UTC date to avoid timezone issues
      const date = new Date(Date.UTC(2026, 7, 4));
      expect(resolveDate(date, 'iso')).toBe('2026-08-04');
    });
  });

  describe('resolveText', () => {
    const docState = createMockDocState({ title: 'My Doc' });

    it('resolves fields in text', () => {
      const text = 'Title: {{document_title}}, Page: {{page_number}}';
      const result = resolveText(text, docState, 0);
      expect(result).toBe('Title: My Doc, Page: 1');
    });

    it('handles text with no fields', () => {
      const text = 'Plain text without fields';
      expect(resolveText(text, docState)).toBe('Plain text without fields');
    });

    it('handles multiple occurrences of same field', () => {
      const text = '{{page_number}} and {{page_number}}';
      const result = resolveText(text, docState, 2);
      expect(result).toBe('3 and 3');
    });
  });

  describe('mergeFields', () => {
    it('merges templateField nodes in content', () => {
      const docState = createMockDocState({
        title: 'Test Doc',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Title: ' },
                { type: 'templateField', attrs: { fieldName: 'document_title' } },
              ],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Page ' },
                { type: 'templateField', attrs: { fieldName: 'page_number' } },
                { type: 'text', text: ' of ' },
                { type: 'templateField', attrs: { fieldName: 'total_pages' } },
              ],
            },
          ],
        },
      });

      const result = mergeFields(docState.content, docState);

      expect(result.replacedCount).toBe(3);
      const content = result.content as Record<string, unknown>;
      const contentArr = content.content as unknown[];
      expect((contentArr[0] as Record<string, unknown>).content).toEqual(expect.arrayContaining([{ type: 'text', text: 'Test Doc' }]));
    });

    it('handles custom fields with values', () => {
      const docState = createMockDocState({
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                { type: 'templateField', attrs: { fieldName: 'name' } },
              ],
            },
          ],
        },
      });

      const result = mergeFields(docState.content, docState, 0, { name: 'World' });
      const content = result.content as Record<string, unknown>;
      const contentArr = content.content as unknown[];
      expect((contentArr[0] as Record<string, unknown>).content).toEqual(
        expect.arrayContaining([{ type: 'text', text: 'World' }])
      );
    });
  });

  describe('extractFieldNames', () => {
    it('extracts field names from templateField nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'templateField', attrs: { fieldName: 'document_title' } },
              { type: 'text', text: ' ' },
              { type: 'templateField', attrs: { fieldName: 'current_date' } },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'templateField', attrs: { fieldName: 'page_number' } },
              { type: 'text', text: ' of ' },
              { type: 'templateField', attrs: { fieldName: 'total_pages' } },
            ],
          },
        ],
      };

      const fields = extractFieldNames(content);
      expect(fields).toContain('document_title');
      expect(fields).toContain('current_date');
      expect(fields).toContain('page_number');
      expect(fields).toContain('total_pages');
    });

    it('returns empty array for documents without fields', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Plain text' }],
          },
        ],
      };

      expect(extractFieldNames(content)).toEqual([]);
    });

    it('deduplicates field names', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'templateField', attrs: { fieldName: 'name' } },
              { type: 'text', text: ' and ' },
              { type: 'templateField', attrs: { fieldName: 'name' } },
            ],
          },
        ],
      };

      expect(extractFieldNames(content)).toEqual(['name']);
    });
  });
});
