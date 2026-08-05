// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Font embedding script for pdfmake.
 *
 * Reads TTF files from a directory and generates src/utils/pdfFonts.ts
 * containing base64-encoded font data for pdfmake's virtual filesystem.
 *
 * Usage: npx ts-node scripts/generateFontVfs.ts [font-dir]
 *   font-dir: path to directory containing TTF files (default: ./fonts)
 *
 * The generated file exports a vfs object and font registration config.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FontDefinition {
  name: string;
  file: string;
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
}

const FONTS: FontDefinition[] = [
  // Arial family
  { name: 'Arial', file: 'arial.ttf', weight: 'normal', style: 'normal' },
  { name: 'Arial', file: 'arialbd.ttf', weight: 'bold', style: 'normal' },
  { name: 'Arial', file: 'ariali.ttf', weight: 'normal', style: 'italic' },
  { name: 'Arial', file: 'arialbi.ttf', weight: 'bold', style: 'italic' },
  // Times New Roman family
  { name: 'Times New Roman', file: 'times.ttf', weight: 'normal', style: 'normal' },
  { name: 'Times New Roman', file: 'timesbd.ttf', weight: 'bold', style: 'normal' },
  { name: 'Times New Roman', file: 'timesi.ttf', weight: 'normal', style: 'italic' },
  { name: 'Times New Roman', file: 'timesbi.ttf', weight: 'bold', style: 'italic' },
  // Courier New family
  { name: 'Courier New', file: 'cour.ttf', weight: 'normal', style: 'normal' },
  { name: 'Courier New', file: 'courbd.ttf', weight: 'bold', style: 'normal' },
  { name: 'Courier New', file: 'couri.ttf', weight: 'normal', style: 'italic' },
  { name: 'Courier New', file: 'courbi.ttf', weight: 'bold', style: 'italic' },
  // Georgia family
  { name: 'Georgia', file: 'georgia.ttf', weight: 'normal', style: 'normal' },
  { name: 'Georgia', file: 'georgiab.ttf', weight: 'bold', style: 'normal' },
  { name: 'Georgia', file: 'georgiai.ttf', weight: 'normal', style: 'italic' },
  { name: 'Georgia', file: 'georgiaz.ttf', weight: 'bold', style: 'italic' },
  // Verdana family
  { name: 'Verdana', file: 'verdana.ttf', weight: 'normal', style: 'normal' },
  { name: 'Verdana', file: 'verdanab.ttf', weight: 'bold', style: 'normal' },
  { name: 'Verdana', file: 'verdanai.ttf', weight: 'normal', style: 'italic' },
  { name: 'Verdana', file: 'verdanaz.ttf', weight: 'bold', style: 'italic' },
  // Helvetica (substituted with Arial if not available)
  { name: 'Helvetica', file: 'arial.ttf', weight: 'normal', style: 'normal' },
  { name: 'Helvetica', file: 'arialbd.ttf', weight: 'bold', style: 'normal' },
  { name: 'Helvetica', file: 'ariali.ttf', weight: 'normal', style: 'italic' },
  { name: 'Helvetica', file: 'arialbi.ttf', weight: 'bold', style: 'italic' },
];

function main() {
  const fontDir = process.argv[2] || path.join(__dirname, '..', 'fonts');
  const outFile = path.join(__dirname, '..', 'src', 'utils', 'pdfFonts.json');

  if (!fs.existsSync(fontDir)) {
    console.error(`Font directory not found: ${fontDir}`);
    console.error('Create a fonts/ directory and place TTF files in it.');
    console.error('You can copy TTF files from C:\\Windows\\Fonts\\');
    process.exit(1);
  }

  const vfs: Record<string, string> = {};
  const missing: string[] = [];

  for (const font of FONTS) {
    const filePath = path.join(fontDir, font.file);
    if (!fs.existsSync(filePath)) {
      missing.push(font.file);
      continue;
    }
    const key = `${font.name}-${font.weight}-${font.style}`;
    const data = fs.readFileSync(filePath).toString('base64');
    vfs[key] = data;
    console.log(`  ✓ ${key} (${(data.length / 1024).toFixed(1)} KB)`);
  }

  if (missing.length > 0) {
    console.error(`\nMissing font files:`);
    missing.forEach((f) => console.error(`  ✗ ${f}`));
  }

  // Build font registration configs
  const fontMap: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }> = {};
  for (const font of FONTS) {
    if (missing.includes(font.file)) continue;
    const key = `${font.name}-${font.weight}-${font.style}`;
    if (!fontMap[font.name]) {
      fontMap[font.name] = { normal: '', bold: '', italics: '', bolditalics: '' };
    }
    if (font.weight === 'normal' && font.style === 'normal') fontMap[font.name].normal = key;
    if (font.weight === 'bold' && font.style === 'normal') fontMap[font.name].bold = key;
    if (font.weight === 'normal' && font.style === 'italic') fontMap[font.name].italics = key;
    if (font.weight === 'bold' && font.style === 'italic') fontMap[font.name].bolditalics = key;
  }
  const fontConfigs = Object.entries(fontMap).map(([name, styles]) => ({
    name,
    normal: styles.normal,
    bold: styles.bold,
    italics: styles.italics,
    bolditalics: styles.bolditalics,
  }));

  // Output as JSON for lazy-loading
  const output = JSON.stringify({ vfs, fontConfigs }, null, 2);

  fs.writeFileSync(outFile, output);
  console.log(`\n✓ Generated ${outFile}`);
  console.log(`  Total fonts: ${Object.keys(vfs).length}`);
  console.log(`  Size: ${(output.length / 1024 / 1024).toFixed(1)} MB`);
}

main();
