// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * Type declarations for pdfmake (no @types/pdfmake available).
 * Only the subset of the API used by this project is declared.
 *
 * Covers pdfmake v0.3.x API (async getBuffer/getBlob/download, addVirtualFileSystem).
 */
declare module 'pdfmake/build/pdfmake' {
  interface PdfMake {
    /** Virtual filesystem containing font data */
    virtualfs: {
      existsSync(path: string): boolean;
      readFileSync(path: string): string;
    };
    /** Font registry */
    fonts: Record<string, unknown>;
    /** Add font data from vfs_fonts.js */
    addVirtualFileSystem(fonts: Record<string, string>): void;
    /** URL access policies (unused) */
    urlAccessPolicy: unknown;
    localAccessPolicy: unknown;
    /** Create a PDF document from a definition */
    createPdf(docDefinition: unknown): PdfDocument;
  }

  interface PdfDocument {
    /** Get PDF as a Blob (browser only) */
    getBlob(): Promise<Blob>;
    /** Get PDF as a Buffer/Uint8Array */
    getBuffer(): Promise<Uint8Array>;
    /** Download the PDF file (browser only, uses file-saver) */
    download(filename?: string): Promise<void>;
    /** Open the PDF in a new window */
    open(win?: Window): Promise<void>;
    /** Print the PDF */
    print(): Promise<void>;
    /** Get PDF as base64 string */
    getBase64(): Promise<string>;
    /** Get PDF as data URL */
    getDataUrl(): Promise<string>;
  }

  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  // pdfmake v0.3.x exports as { pdfMake: { vfs } }
  export const pdfMake: { vfs: Record<string, string> };
  // pdfmake v0.2.x exports as default { [filename]: base64 }
  const fonts: Record<string, string>;
  export default fonts;
}
