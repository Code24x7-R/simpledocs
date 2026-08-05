// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { DocState } from '../store/useDocStore';
import { convertToPdfmake, collectImageSources, setImageDimensions, type PageSetup } from './pdfmakeConverter';

/**
 * Load an image and return its natural dimensions in pixels.
 * Works for both data URLs and remote URLs.
 */
function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 50)}`));
    img.src = src;
  });
}

/**
 * Export the current document to a **searchable** PDF using pdfmake.
 *
 * Unlike the old html2pdf.js approach (which rasterized the DOM to a bitmap
 * image), pdfmake produces real text with embedded fonts — the resulting PDF
 * is fully searchable, selectable, and accessible.
 *
 * pdfmake and font data are lazy-loaded (~20MB total) so they don't bloat
 * the main bundle — they're only fetched when the user exports.
 */
export async function exportToPdf(
  doc: DocState,
  _pageElements: HTMLElement[]
): Promise<void> {
  const { settings } = doc;

  const pageSetup: PageSetup = {
    pageFormat: settings.pageFormat,
    orientation: settings.orientation,
    margins: settings.margins,
    header: settings.header,
    footer: settings.footer,
    title: doc.title,
  };

  // Load images to get their natural dimensions for accurate scaling
  const content = doc.content as unknown as Parameters<typeof convertToPdfmake>[0];
  const imageSources = collectImageSources(content);
  const dimensions: Record<string, { width: number; height: number }> = {};
  await Promise.all(
    Array.from(imageSources).map(async (src) => {
      try {
        const dims = await loadImageDimensions(src);
        dimensions[src] = dims;
      } catch {
        // Image failed to load — scaling will use fallback
      }
    })
  );
  setImageDimensions(dimensions);

  // Convert TipTap JSON content → pdfmake document definition
  const pdfDoc = convertToPdfmake(content, pageSetup);

  // Lazy-load pdfmake + custom fonts to keep them out of the main bundle
  const pdfMake = await import('pdfmake/build/pdfmake');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMakeInstance: any = pdfMake.default || pdfMake;

  // Load custom fonts (lazy-loaded JSON with base64-encoded TTF data)
  // Falls back to Roboto only if custom fonts are not available
  let vfs: Record<string, string> = {};
  let fontConfigs: Array<{ name: string; normal: string; bold: string; italics: string; bolditalics: string }> = [];
  try {
    const fonts = await import('./pdfFonts.json');
    vfs = fonts.vfs;
    fontConfigs = fonts.fontConfigs;
  } catch (e) {
    console.warn('Custom fonts not found. Run: npx tsx scripts/generateFontVfs.ts fonts');
  }

  // Add font data to pdfmake's virtual filesystem
  if (typeof pdfMakeInstance.addVirtualFileSystem === 'function') {
    pdfMakeInstance.addVirtualFileSystem(vfs);
  } else {
    pdfMakeInstance.vfs = vfs;
  }

  // Register font families with pdfmake
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fonts: Record<string, any> = {};
  for (const config of fontConfigs) {
    fonts[config.name] = {
      normal: config.normal,
      bold: config.bold,
      italics: config.italics,
      bolditalics: config.bolditalics,
    };
  }
  pdfMakeInstance.fonts = fonts;

  // Create and download PDF
  const pdf = pdfMakeInstance.createPdf(pdfDoc);
  const filename = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  // pdfmake v0.3.x: download() is async and uses file-saver internally
  if (typeof pdf.download === 'function') {
    await pdf.download(filename);
  } else {
    // Legacy pdfmake v0.2.x API: getBuffer(callback)
    await new Promise<void>((resolve, reject) => {
      pdf.getBuffer((blob: Blob) => {
        try {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}
