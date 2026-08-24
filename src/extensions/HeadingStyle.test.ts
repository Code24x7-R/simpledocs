// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { HeadingStyle } from './HeadingStyle';

// Mock scrollIntoView for jsdom
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('HeadingStyle', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        HeadingStyle,
      ],
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('setBlockHeading', () => {
    it('should apply heading to current block only', () => {
      // Set up: two paragraphs
      editor.commands.setContent('<p>First paragraph</p><p>Second paragraph</p>');
      // Place cursor in first paragraph
      editor.commands.setTextSelection(5);

      // Apply heading level 1
      const result = editor.commands.setBlockHeading(1);

      expect(result).toBe(true);
      expect(editor.getHTML()).toBe('<h1>First paragraph</h1><p>Second paragraph</p>');
    });

    it('should NOT bleed into paragraph below when cursor is at position 1', () => {
      editor.commands.setContent('<p>My Title</p><p>Paragraph below</p>');
      // Place cursor at position 1 (start of first paragraph)
      editor.commands.setTextSelection(1);

      // Apply heading level 1
      editor.commands.setBlockHeading(1);

      expect(editor.getHTML()).toBe('<h1>My Title</h1><p>Paragraph below</p>');
    });

    it('should change heading level without affecting adjacent blocks', () => {
      editor.commands.setContent('<h1>My Title</h1><p>Paragraph below</p>');
      // Place cursor in the heading
      editor.commands.setTextSelection(5);

      // Change to heading level 2
      editor.commands.setBlockHeading(2);

      expect(editor.getHTML()).toBe('<h2>My Title</h2><p>Paragraph below</p>');
    });

    it('should do nothing when setting same heading level', () => {
      editor.commands.setContent('<h1>My Title</h1><p>Paragraph below</p>');
      editor.commands.setTextSelection(5);

      const result = editor.commands.setBlockHeading(1);

      expect(result).toBe(true);
      expect(editor.getHTML()).toBe('<h1>My Title</h1><p>Paragraph below</p>');
    });

    it('should apply heading to middle paragraph without affecting siblings', () => {
      editor.commands.setContent('<p>First</p><p>Second</p><p>Third</p>');
      // Place cursor in second paragraph
      editor.commands.setTextSelection(10);

      editor.commands.setBlockHeading(2);

      expect(editor.getHTML()).toBe('<p>First</p><h2>Second</h2><p>Third</p>');
    });

    it('should NOT bleed when applying H1 then H2 at position 1', () => {
      editor.commands.setContent('<p>My Title</p><p>Paragraph below</p>');
      editor.commands.setTextSelection(1);

      // Apply H1
      editor.commands.setBlockHeading(1);
      expect(editor.getHTML()).toBe('<h1>My Title</h1><p>Paragraph below</p>');

      // Apply H2 (should only change first block)
      editor.commands.setBlockHeading(2);
      expect(editor.getHTML()).toBe('<h2>My Title</h2><p>Paragraph below</p>');
    });

    it('should NOT bleed with empty paragraph below', () => {
      editor.commands.setContent('<p>My Title</p><p></p>');
      editor.commands.setTextSelection(1);

      editor.commands.setBlockHeading(1);

      expect(editor.getHTML()).toBe('<h1>My Title</h1><p></p>');
    });

    it('should NOT bleed when cursor is at position 0 (before heading)', () => {
      editor.commands.setContent('<p>My Title</p><p>Paragraph below</p>');
      editor.commands.setTextSelection(0);

      editor.commands.setBlockHeading(1);

      expect(editor.getHTML()).toBe('<h1>My Title</h1><p>Paragraph below</p>');
    });

    it('should NOT bleed when applying heading to middle of heading text', () => {
      editor.commands.setContent('<h1>My Title</h1><p>Paragraph below</p>');
      // Cursor in middle of heading text
      editor.commands.setTextSelection(4);

      editor.commands.setBlockHeading(2);

      expect(editor.getHTML()).toBe('<h2>My Title</h2><p>Paragraph below</p>');
    });

    it('should apply heading level 3', () => {
      editor.commands.setContent('<p>My Title</p><p>Paragraph below</p>');
      editor.commands.setTextSelection(1);

      editor.commands.setBlockHeading(3);

      expect(editor.getHTML()).toBe('<h3>My Title</h3><p>Paragraph below</p>');
    });

    it('should handle heading at end of document', () => {
      editor.commands.setContent('<p>First</p><p>Last</p>');
      // Cursor in last paragraph
      editor.commands.setTextSelection(12);

      editor.commands.setBlockHeading(1);

      // Tiptap may add an empty paragraph at the end
      expect(editor.getHTML()).toMatch(/<p>First<\/p><h1>Last<\/h1>/);
    });
  });

  describe('unsetBlockHeading', () => {
    it('should convert heading to paragraph', () => {
      editor.commands.setContent('<h1>My Title</h1><p>Paragraph below</p>');
      editor.commands.setTextSelection(5);

      const result = editor.commands.unsetBlockHeading();

      expect(result).toBe(true);
      expect(editor.getHTML()).toBe('<p>My Title</p><p>Paragraph below</p>');
    });

    it('should NOT affect adjacent blocks when unsetting heading', () => {
      editor.commands.setContent('<p>First</p><h2>Second</h2><p>Third</p>');
      editor.commands.setTextSelection(12);

      editor.commands.unsetBlockHeading();

      expect(editor.getHTML()).toBe('<p>First</p><p>Second</p><p>Third</p>');
    });

    it('should return false when not in a heading', () => {
      editor.commands.setContent('<p>My paragraph</p>');
      editor.commands.setTextSelection(5);

      const result = editor.commands.unsetBlockHeading();

      expect(result).toBe(false);
      expect(editor.getHTML()).toBe('<p>My paragraph</p>');
    });

    it('should unset heading at start of document', () => {
      editor.commands.setContent('<h2>Title</h2><p>Content</p>');
      editor.commands.setTextSelection(3);

      editor.commands.unsetBlockHeading();

      expect(editor.getHTML()).toBe('<p>Title</p><p>Content</p>');
    });
  });
});
