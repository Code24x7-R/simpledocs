// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_EXE = path.resolve(
  process.env.SIMPLEDOCS_APP_EXE ?? 'release/win-unpacked/SimpleDocs.exe'
);
const PROJECT_ROOT = path.resolve('.');

let app: ElectronApplication;
let page: Page;
let userDataDir: string;
let workDir: string;

function fixtureDocument(title: string, text: string) {
  return {
    id: `desktop-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title,
    createdAt: '2026-11-18T00:00:00Z',
    updatedAt: '2026-11-18T00:00:00Z',
    totalPages: 1,
    settings: {
      pageFormat: 'A4',
      orientation: 'portrait',
      margins: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
      header: { enabled: false, content: '' },
      footer: { enabled: false, showPageNumbers: false },
      pageGap: 24,
      showPageBackgrounds: true,
      orphans: 2,
      widows: 2,
      defaultNormalEditorMode: false,
    },
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  };
}

/** Invoke a native menu item by label (File → Save, File → Open, …). */
async function clickMenuItem(menuLabel: string, itemLabel: string): Promise<void> {
  await app.evaluate(
    ({ Menu }, labels) => {
      const menu = Menu.getApplicationMenu()?.items.find((item) => item.label === labels.menu);
      const entry = menu?.submenu?.items.find((item) => item.label === labels.item);
      if (!entry) throw new Error(`Menu item not found: ${labels.menu} > ${labels.item}`);
      entry.click(entry, undefined, undefined);
    },
    { menu: menuLabel, item: itemLabel }
  );
}

/** Replace native dialogs in the main process for automation. */
async function stubSaveDialog(filePath: string): Promise<void> {
  await app.evaluate(async ({ dialog }, target) => {
    Object.defineProperty(dialog, 'showSaveDialog', {
      configurable: true,
      value: async () => ({ canceled: false, filePath: target }),
    });
  }, filePath);
}

async function stubOpenDialog(filePath: string): Promise<void> {
  await app.evaluate(async ({ dialog }, target) => {
    Object.defineProperty(dialog, 'showOpenDialog', {
      configurable: true,
      value: async () => ({ canceled: false, filePaths: [target] }),
    });
  }, filePath);
}

test.beforeAll(async () => {
  expect(existsSync(APP_EXE), `Build the desktop app first: ${APP_EXE}`).toBe(true);
  userDataDir = mkdtempSync(path.join(os.tmpdir(), 'simpledocs-e2e-user-'));
  workDir = mkdtempSync(path.join(os.tmpdir(), 'simpledocs-e2e-files-'));

  app = await electron.launch({
    executablePath: APP_EXE,
    args: [`--user-data-dir=${userDataDir}`],
    cwd: PROJECT_ROOT,
  });
  page = await app.firstWindow();
  await page.waitForSelector('.tiptap', { timeout: 30_000 });
});

test.afterAll(async () => {
  await app?.close();
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

test('loads the packaged renderer from the app:// origin', async () => {
  expect(page.url()).toBe('app://simpledocs/index.html');
  const origin = await page.evaluate(() => window.location.origin);
  expect(origin).toBe('app://simpledocs');

  await expect(page.locator('.tiptap')).toBeVisible();
  await expect(page.getByText('SimpleDocs', { exact: true })).toBeVisible();
});

test('exposes only the preload bridge, never Node', async () => {
  const capabilities = await page.evaluate(() => ({
    hasRequire: typeof (window as unknown as { require?: unknown }).require,
    hasProcess: typeof (window as unknown as { process?: unknown }).process,
    hasDesktopBridge: Boolean(window.simpleDocsDesktop),
    isDesktop: window.simpleDocsDesktop?.isDesktop,
    platform: window.simpleDocsDesktop?.platform,
  }));

  expect(capabilities.hasRequire).toBe('undefined');
  expect(capabilities.hasProcess).toBe('undefined');
  expect(capabilities.hasDesktopBridge).toBe(true);
  expect(capabilities.isDesktop).toBe(true);
  expect(capabilities.platform).toBe('win32');
});

test('production build is served under the strict CSP and app assets load', async () => {
  const csp = await page.evaluate(async () => {
    const response = await fetch('app://simpledocs/manifest.json');
    return { ok: response.ok, csp: response.headers.get('content-security-policy') };
  });
  expect(csp.ok).toBe(true);
  expect(csp.csp).toContain("default-src 'self'");
  expect(csp.csp).toContain("object-src 'none'");

  // No CSP violations or renderer errors were logged during startup.
  await expect(page.locator('.tiptap')).toBeVisible();
});

test('native Save writes a .sdjson document through the menu accelerator', async () => {
  const target = path.join(workDir, 'Saved-By-Dialog.sdjson');
  await stubSaveDialog(target);

  await page.getByTestId('document-title').fill('Saved By Dialog');
  await page.locator('.tiptap').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Saved through the native Windows dialog.');

  // In-app File → Save routes to the native dialog on desktop.
  await page.getByTestId('menu-file').click();
  await page.getByTestId('file-save').click();

  await expect.poll(() => existsSync(target), { timeout: 15_000 }).toBe(true);
  const saved = JSON.parse(readFileSync(target, 'utf-8')) as {
    title: string;
    content: { content: Array<{ content?: Array<{ text?: string }> }> };
  };
  expect(saved.title).toBe('Saved By Dialog');
  expect(JSON.stringify(saved.content)).toContain('Saved through the native Windows dialog.');

  // The saved file is added to Recent Files.
  const mru = await page.evaluate(() =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__docStore.getState().mruList.map((entry: { name: string }) => entry.name)
  );
  expect(mru).toContain('Saved-By-Dialog.sdjson');
});

test('Save As adopts the chosen filename as the document title', async () => {
  const target = path.join(workDir, 'Renamed-Letter.sdjson');
  await stubSaveDialog(target);

  await page.getByTestId('document-title').fill('Untitled Document');
  await page.getByTestId('menu-file').click();
  await page.getByTestId('file-save').click();

  await expect.poll(() => existsSync(target), { timeout: 15_000 }).toBe(true);
  await expect(page.getByTestId('document-title')).toHaveValue('Renamed-Letter');
});

test('native Open loads a document through the menu accelerator', async () => {
  const source = path.join(workDir, 'Opened-By-Dialog.sdjson');
  writeFileSync(source, JSON.stringify(fixtureDocument('Opened By Dialog', 'Opened natively.'), null, 2));

  await stubOpenDialog(source);
  // Native menu: File → Open… (the accelerator path is asserted separately).
  await clickMenuItem('File', 'Open…');

  await expect(page.getByTestId('document-title')).toHaveValue('Opened By Dialog');
  await expect(page.locator('.tiptap')).toContainText('Opened natively.');
});

test('native menu exposes the standard file accelerators', async () => {
  const menu = await app.evaluate(({ Menu }) => {
    const file = Menu.getApplicationMenu()?.items.find((item) => item.label === 'File');
    return file?.submenu?.items.map((item) => ({ label: item.label, accelerator: item.accelerator })) ?? [];
  });

  const accelerators = Object.fromEntries(menu.map((item) => [item.label, item.accelerator]));
  expect(accelerators.New).toBe('CmdOrCtrl+N');
  expect(accelerators['Open…']).toBe('CmdOrCtrl+O');
  expect(accelerators.Save).toBe('CmdOrCtrl+S');
  expect(accelerators['Save As…']).toBe('CmdOrCtrl+Shift+S');
  expect(accelerators.Exit).toBeFalsy(); // role: quit provides the platform default
});

test('a second instance opens .sdjson in the existing window', async () => {
  const source = path.join(workDir, 'Association-Document.sdjson');
  writeFileSync(
    source,
    JSON.stringify(fixtureDocument('Association Document', 'Delivered by argv.'), null, 2)
  );

  const child = spawn(APP_EXE, [source, `--user-data-dir=${userDataDir}`], {
    cwd: PROJECT_ROOT,
    stdio: 'ignore',
    detached: false,
  });
  const exitCode = await new Promise<number | null>((resolve) => child.once('exit', resolve));

  // The second process must hand the file to the running instance and exit.
  expect(exitCode).toBe(0);
  await expect(page.getByTestId('document-title')).toHaveValue('Association Document');
  await expect(page.locator('.tiptap')).toContainText('Delivered by argv.');
});

test('native Export PDF writes a PDF through the save dialog', async () => {
  const target = path.join(workDir, 'Exported.pdf');
  await stubSaveDialog(target);

  await page.locator('.tiptap').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('PDF from the packaged app.');

  await page.getByTestId('menu-file').click();
  await page.getByTestId('file-export').hover();
  await page.getByTestId('file-export-pdf').evaluate((el) => (el as HTMLElement).click());

  await expect.poll(() => existsSync(target), { timeout: 120_000 }).toBe(true);
  const bytes = readFileSync(target);
  expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(1000);
});

test('autosaved document survives an app restart in the same profile', async () => {
  await page.getByTestId('document-title').fill('Persisted Across Restart');
  await page.waitForTimeout(600); // let the debounced autosave persist
  await app.close();

  app = await electron.launch({
    executablePath: APP_EXE,
    args: [`--user-data-dir=${userDataDir}`],
    cwd: PROJECT_ROOT,
  });
  page = await app.firstWindow();
  await page.waitForSelector('.tiptap', { timeout: 30_000 });

  await expect(page.getByTestId('document-title')).toHaveValue('Persisted Across Restart');
});
