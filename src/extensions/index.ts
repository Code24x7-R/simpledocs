// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from './FontSize';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { BackgroundColor } from '@tiptap/extension-text-style';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { TemplateField } from './TemplateField';
import { PageBreak } from './PageBreak';
import { ParagraphStyle } from './ParagraphStyle';
import { TableOfContents } from './TableOfContents';

export function createExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: false,
    }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    BackgroundColor,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    TemplateField,
    PageBreak,
    ParagraphStyle,
    TableOfContents,
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
    }),
    Placeholder.configure({
      placeholder: 'Start typing...',
    }),
    CharacterCount.configure({}),
  ];
}
