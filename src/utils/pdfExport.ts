// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import type { DocState } from '../store/useDocStore';
import { convertToPdfmake, type PageSetup } from './pdfmakeConverter';

/**
 * Export the current document to a **searchable** PDF using pdfmake.
 *
 * Unlike the old html2pdf.js approach (which rasterized the DOM to a bitmap
 * image), pdfmake produces real text with embedded fonts — the resulting PDF
 * is fully searchable, selectable, and accessible.
 *
 * pdfmake is lazy-loaded (~1MB) so it doesn't bloat the main bundle.
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

  // Convert TipTap JSON content → pdfmake document definition
  const content = doc.content as unknown as Parameters<typeof convertToPdfmake>[0];
  const pdfDoc = convertToPdfmake(content, pageSetup);

  // Lazy-load pdfmake to keep it out of the main bundle
  const pdfMake = await import('pdfmake/build/pdfmake');
  const pdfFonts = await import('pdfmake/build/vfs_fonts');

  // pdfmake v0.3.x uses named exports; v0.2.x uses module.exports.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMakeInstance: any = pdfMake.default || pdfMake;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fonts: any = pdfFonts;
  pdfMakeInstance.vfs = fonts.pdfMake ? fonts.pdfMake.vfs : fonts.default ? fonts.default.vfs : fonts.vfs;

  return new Promise<void>((resolve, reject) => {
    try {
      const pdf = pdfMakeInstance.createPdf(pdfDoc);
      const filename = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      // Use getBuffer for broad browser compatibility
      pdf.getBuffer((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}
