// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import html2pdf from 'html2pdf.js';
import type { DocState } from '../store/useDocStore';
import { toMm } from './unitConversion';

export async function exportToPdf(
  doc: DocState,
  pageElements: HTMLElement[]
): Promise<void> {
  const { settings } = doc;
  const margins = settings.margins;
  const marginMm = [
    toMm(margins.top),
    toMm(margins.right),
    toMm(margins.bottom),
    toMm(margins.left),
  ];

  const opt = {
    margin: marginMm,
    filename: `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: {
      unit: 'mm',
      format: settings.pageFormat.toLowerCase(),
      orientation: settings.orientation,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  // Create a container with all pages
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  pageElements.forEach((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    container.appendChild(clone);
  });
  document.body.appendChild(container);

  try {
    await html2pdf().set(opt).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}
