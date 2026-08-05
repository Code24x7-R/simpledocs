// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * Type declarations for pdfmake (no @types/pdfmake available).
 * Only the subset of the API used by this project is declared.
 */
declare module 'pdfmake/build/pdfmake' {
  interface PdfMake {
    vfs: Record<string, string>;
    createPdf(docDefinition: unknown): PdfDocument;
  }

  interface PdfDocument {
    getBuffer(callback: (blob: Blob) => void): void;
    download(defaultFilename?: string, callback?: () => void, options?: unknown): void;
    open(options?: unknown, target?: unknown): void;
    print(options?: unknown, target?: unknown): void;
    getDataUrl(callback: (url: string) => void, options?: unknown): void;
    getBase64(callback: (base64: string) => void, options?: unknown): void;
    getBlob(callback: (blob: Blob) => void, options?: unknown): void;
  }

  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  interface PdfFonts {
    vfs: Record<string, string>;
  }

  // pdfmake v0.3.x exports as { pdfMake: { vfs } }
  export const pdfMake: PdfFonts;
  // pdfmake v0.2.x exports as default { vfs }
  const fonts: Record<string, string>;
  export default fonts;
}
