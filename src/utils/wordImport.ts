// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import mammoth from 'mammoth';

export interface WordImportResult {
  html: string;
  messages: { type: string; message: string }[];
}

export async function importWordDocument(file: File): Promise<WordImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Subtitle'] => h3:fresh",
        // Convert Word page breaks to our page break marker
        'br[type=page] => div[data-type=page-break]:fresh',
      ],
    }
  );

  return {
    html: result.value,
    messages: result.messages,
  };
}
