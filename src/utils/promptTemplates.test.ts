// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadTemplates,
  saveTemplates,
  createTemplate,
  DEFAULT_TEMPLATES,
} from './promptTemplates';
import type { PromptTemplate } from '../types/promptTemplate';

describe('promptTemplates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('DEFAULT_TEMPLATES', () => {
    it('contains at least 3 templates', () => {
      expect(DEFAULT_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    });

    it('has a default general assistant template', () => {
      const defaultTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'default');
      expect(defaultTpl).toBeDefined();
      expect(defaultTpl?.name).toBe('General Assistant');
      expect(defaultTpl?.content.length).toBeGreaterThan(0);
    });

    it('has an executive analyst template', () => {
      const analystTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'executive-analyst');
      expect(analystTpl).toBeDefined();
      expect(analystTpl?.name).toBe('Executive Analyst & Summarizer');
      expect(analystTpl?.content).toContain('Document Overview');
      expect(analystTpl?.content).toContain('Key Takeaways');
    });

    it('has a fiction editor template', () => {
      const fictionTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'fiction-editor');
      expect(fictionTpl).toBeDefined();
      expect(fictionTpl?.name).toBe('Fiction Editor & Narrative Coach');
      expect(fictionTpl?.content).toContain('Narrative Overview');
      expect(fictionTpl?.content).toContain('Character Psychology');
    });
  });

  describe('loadTemplates', () => {
    it('returns default templates when localStorage is empty', () => {
      const result = loadTemplates();
      expect(result).toEqual(DEFAULT_TEMPLATES);
    });

    it('returns saved templates from localStorage', () => {
      const customTemplates: PromptTemplate[] = [
        {
          id: 'custom-1',
          name: 'Custom Template',
          content: 'Custom content',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      saveTemplates(customTemplates);

      const result = loadTemplates();
      expect(result).toEqual(customTemplates);
    });

    it('returns defaults on parse error', () => {
      localStorage.setItem('SIMPLEDOCS_CHAT_TEMPLATES', '{ broken json!');
      const result = loadTemplates();
      expect(result).toEqual(DEFAULT_TEMPLATES);
    });
  });

  describe('saveTemplates', () => {
    it('persists templates to localStorage', () => {
      const templates: PromptTemplate[] = [
        {
          id: 'test',
          name: 'Test',
          content: 'Test content',
          createdAt: 123,
          updatedAt: 456,
        },
      ];

      saveTemplates(templates);

      const raw = localStorage.getItem('SIMPLEDOCS_CHAT_TEMPLATES');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed).toEqual(templates);
    });
  });

  describe('createTemplate', () => {
    it('creates a template with generated ID and timestamps', () => {
      const before = Date.now();
      const template = createTemplate('My Template', 'My content');
      const after = Date.now();

      expect(template.id).toMatch(/^tpl-/);
      expect(template.name).toBe('My Template');
      expect(template.content).toBe('My content');
      expect(template.createdAt).toBeGreaterThanOrEqual(before);
      expect(template.createdAt).toBeLessThanOrEqual(after);
      expect(template.updatedAt).toBe(template.createdAt);
    });

    it('generates unique IDs for each call', () => {
      const t1 = createTemplate('First', 'Content 1');
      const t2 = createTemplate('Second', 'Content 2');
      expect(t1.id).not.toBe(t2.id);
    });
  });
});
