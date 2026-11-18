import { test, expect, Page } from '@playwright/test';
import { openApp } from './helpers';

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
    pageGap: 24,
    showPageBackgrounds: true,
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

async function openFromFile(page: Page, name: string, content: string): Promise<void> {
  await page.getByTestId('menu-file').click();
  await page.getByTestId('file-open').click();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Open from File/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(content, 'utf-8'),
  });
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('JSON import flow: upload a document', async ({ page }) => {
  await openFromFile(page, 'test-doc.sdjson', JSON.stringify(sampleDoc));

  await expect(page.getByTestId('document-title')).toHaveValue('Imported Document', {
    timeout: 5000,
  });
});

test('JSON import updates editor content', async ({ page }) => {
  await openFromFile(page, 'test-doc.sdjson', JSON.stringify(sampleDoc));

  await expect(page.locator('.tiptap')).toContainText('This is imported content!', { timeout: 5000 });
});

test('invalid JSON import is rejected without replacing the document', async ({ page }) => {
  const messages: string[] = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    await dialog.dismiss();
  });

  await openFromFile(page, 'not-a-document.json', JSON.stringify({ hello: 'world' }));

  await expect(page.getByTestId('document-title')).toHaveValue('Untitled Document');
  await expect(page.locator('.tiptap')).not.toContainText('This is imported content!');
  expect(messages.join(' ')).toMatch(/invalid document format/i);
});
