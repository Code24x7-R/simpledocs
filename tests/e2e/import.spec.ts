import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.tiptap', { timeout: 10000 });
});

const sampleDoc = {
  id: 'test-import-123',
  title: 'Imported Document',
  createdAt: '2026-08-02T00:00:00Z',
  updatedAt: '2026-08-02T00:00:00Z',
  settings: {
    pageFormat: 'A4',
    orientation: 'portrait',
    margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
    header: { enabled: true, content: 'Test Header' },
    footer: { enabled: true, showPageNumbers: true },
  },
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is imported content!' }],
      },
    ],
  },
};

test('JSON import flow: upload a document', async ({ page }) => {
  // Create a temporary file input event
  await page.evaluate((doc) => {
    const file = new File([JSON.stringify(doc)], 'test-doc.json', { type: 'application/json' });
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'hidden-file-input';
    input.style.display = 'none';
    document.body.appendChild(input);

    // Simulate file selection
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, sampleDoc);

  // The title should update after import
  await expect(page.locator('input[placeholder="Document Title"]')).toHaveValue(
    'Imported Document',
    { timeout: 5000 }
  );
});

test('JSON import updates editor content', async ({ page }) => {
  // First clear any existing content
  await page.evaluate((doc) => {
    const file = new File([JSON.stringify(doc)], 'test-doc.json', { type: 'application/json' });
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'hidden-file-input-2';
    input.style.display = 'none';
    document.body.appendChild(input);

    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, sampleDoc);

  await expect(page.locator('.tiptap')).toContainText('This is imported content!', { timeout: 5000 });
});
