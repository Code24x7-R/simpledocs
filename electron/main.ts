// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * SimpleDocs Electron main process (Windows desktop build).
 *
 * Responsibilities:
 * - create the hardened BrowserWindow (no Node in the renderer)
 * - serve the production build from the privileged `app://simpledocs` origin
 * - single-instance + `.sdjson` file association
 * - native open/save dialogs for document CRUD and exports
 * - external links in the system browser, native menu with standard commands
 */
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  session,
  shell,
  type MenuItemConstructorOptions,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDocumentPaths } from './argv';
import { addRecentPath, isRecentPath, normalizeRecentPaths } from './recent';
import { APP_HOST, DOC_EXTENSION, WORD_EXTENSION } from './paths';
import { installAppProtocol, registerAppScheme } from './protocol';
import type {
  DesktopCommand,
  DesktopFileFilter,
  DesktopLaunchDocument,
  DesktopOpenRecentResult,
  DesktopSaveRequest,
  DesktopSaveResult,
} from '../src/types/desktop';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const APP_ID = 'au.mouseclick.simpledocs';

const MAX_DOCUMENT_BYTES = 64 * 1024 * 1024;
const MAX_SAVE_BYTES = 256 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_SAVE_BYTES * 4) / 3) + 4;

const isDev = Boolean(DEV_URL);

let mainWindow: BrowserWindow | null = null;
let rendererReady = false;
/** Paths the renderer may reopen from Recent Files (see electron/recent.ts). */
let recentPaths: string[] = [];
const pendingDocuments: DesktopLaunchDocument[] = [];

registerAppScheme();
app.setAppUserModelId(APP_ID);

// ---------------------------------------------------------------------------
// Document I/O
// ---------------------------------------------------------------------------

async function readLaunchFile(filePath: string): Promise<DesktopLaunchDocument> {
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error(`Not a file: ${filePath}`);
  if (info.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`Document is larger than ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB`);
  }

  const name = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === WORD_EXTENSION) {
    const bytes = await readFile(filePath);
    return { kind: 'docx', name, path: filePath, base64: bytes.toString('base64') };
  }
  if (extension === DOC_EXTENSION || extension === '.json') {
    return { kind: 'sdjson', name, path: filePath, text: await readFile(filePath, 'utf8') };
  }
  throw new Error(`Unsupported file type: ${extension || '(none)'}`);
}

function deliverDocument(doc: DesktopLaunchDocument): void {
  if (rendererReady && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('desktop:open-document', doc);
  } else {
    pendingDocuments.push(doc);
  }
}

function recentPathsFile(): string {
  return path.join(app.getPath('userData'), 'recent-files.json');
}

async function loadRecentPaths(): Promise<void> {
  try {
    const raw = await readFile(recentPathsFile(), 'utf8');
    const parsed = JSON.parse(raw) as { paths?: unknown };
    recentPaths = normalizeRecentPaths(parsed.paths);
  } catch {
    recentPaths = [];
  }
}

function rememberRecentPath(filePath: string): void {
  const next = addRecentPath(recentPaths, filePath);
  if (next.length === recentPaths.length && next.every((entry, i) => entry === recentPaths[i])) {
    return;
  }
  recentPaths = next;
  void writeFile(recentPathsFile(), JSON.stringify({ version: 1, paths: recentPaths }), 'utf8').catch(
    (err) => console.warn('[desktop] Could not persist recent files:', err)
  );
}

async function queueDocuments(filePaths: readonly string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      const doc = await readLaunchFile(filePath);
      rememberRecentPath(filePath);
      deliverDocument(doc);
    } catch (err) {
      console.warn('[desktop] Could not open document:', filePath, err);
    }
  }
}

function flushPendingDocuments(): void {
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) return;
  while (pendingDocuments.length > 0) {
    const doc = pendingDocuments.shift()!;
    mainWindow.webContents.send('desktop:open-document', doc);
  }
}

function sendCommand(command: DesktopCommand): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('desktop:command', command);
  }
}

function sanitizeSuggestedName(name: string): string {
  // Strip Windows-reserved characters and control codes from dialog names.
  // eslint-disable-next-line no-control-regex
  const base = path.basename(name.trim()).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  return (base || 'Untitled').slice(0, 120);
}

function isFileFilter(value: unknown): value is DesktopFileFilter {
  if (!value || typeof value !== 'object') return false;
  const filter = value as DesktopFileFilter;
  return (
    typeof filter.name === 'string' &&
    Array.isArray(filter.extensions) &&
    filter.extensions.length > 0 &&
    filter.extensions.every((ext) => typeof ext === 'string' && /^[a-z0-9]+$/i.test(ext))
  );
}

function validateSaveRequest(value: unknown): DesktopSaveRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid save request');
  const request = value as Partial<DesktopSaveRequest>;
  if (typeof request.base64 !== 'string') throw new Error('Invalid save payload');
  if (request.base64.length === 0 || request.base64.length > MAX_BASE64_CHARS) {
    throw new Error('Save payload is empty or too large');
  }
  if (typeof request.suggestedName !== 'string' || !request.suggestedName.trim()) {
    throw new Error('Missing suggested filename');
  }
  if (request.filters !== undefined && (!Array.isArray(request.filters) || !request.filters.every(isFileFilter))) {
    throw new Error('Invalid file filters');
  }
  return {
    base64: request.base64,
    suggestedName: sanitizeSuggestedName(request.suggestedName),
    filters: request.filters,
  };
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function hardenWindow(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const isDevOrigin = isDev && DEV_URL && url.startsWith(DEV_URL);
    if (isDevOrigin) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  win.webContents.on('did-start-loading', () => {
    rendererReady = false;
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[desktop] Renderer process gone:', details.reason);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#FAF7F2',
    title: 'SimpleDocs',
    autoHideMenuBar: true,
    ...(isDev ? { icon: path.join(__dirname, '..', 'build', 'icon.ico') } : {}),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true,
    },
  });

  hardenWindow(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
    rendererReady = false;
  });

  if (DEV_URL) {
    void mainWindow.loadURL(DEV_URL);
  } else {
    void mainWindow.loadURL(`app://${APP_HOST}/index.html`);
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerIpc(): void {
  ipcMain.handle('desktop:get-version', () => app.getVersion());

  ipcMain.handle(
    'desktop:open-document',
    async (event): Promise<DesktopLaunchDocument | { canceled: true }> => {
      const owner = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
      const options: OpenDialogOptions = {
        title: 'Open Document',
        properties: ['openFile'],
        filters: [
          { name: 'SimpleDocs Document', extensions: ['sdjson'] },
          { name: 'Word Document', extensions: ['docx'] },
          { name: 'JSON', extensions: ['json'] },
        ],
      };
      const result = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) return { canceled: true };
      const filePath = result.filePaths[0];
      const doc = await readLaunchFile(filePath);
      rememberRecentPath(filePath);
      return doc;
    }
  );

  ipcMain.handle(
    'desktop:open-recent',
    async (_event, rawPath: unknown): Promise<DesktopOpenRecentResult> => {
      if (typeof rawPath !== 'string' || !rawPath.trim()) return { status: 'forbidden' };
      const filePath = path.resolve(rawPath);
      if (!isRecentPath(recentPaths, filePath)) return { status: 'forbidden' };
      const extension = path.extname(filePath).toLowerCase();
      if (
        extension !== DOC_EXTENSION &&
        extension !== '.json' &&
        extension !== WORD_EXTENSION
      ) {
        return { status: 'forbidden' };
      }

      try {
        return { status: 'ok', document: await readLaunchFile(filePath) };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { status: 'missing' };
        throw err;
      }
    }
  );

  ipcMain.handle(
    'desktop:save-file',
    async (event, raw: unknown): Promise<DesktopSaveResult> => {
      const request = validateSaveRequest(raw);
      const owner = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
      const filters = request.filters ?? [
        { name: 'SimpleDocs Document', extensions: ['sdjson'] },
      ];
      const options: SaveDialogOptions = {
        title: 'Save Document',
        defaultPath: path.join(app.getPath('documents'), request.suggestedName),
        filters,
      };
      const result = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return { canceled: true };

      let filePath = result.filePath;
      if (!path.extname(filePath) && filters[0]?.extensions[0]) {
        filePath = `${filePath}.${filters[0].extensions[0]}`;
      }
      await writeFile(filePath, Buffer.from(request.base64, 'base64'));
      rememberRecentPath(filePath);
      return { canceled: false, path: filePath, name: path.basename(filePath) };
    }
  );

  ipcMain.on('desktop:renderer-ready', () => {
    rendererReady = true;
    flushPendingDocuments();
  });
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function buildMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendCommand('new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => sendCommand('open') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save') },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendCommand('save-as'),
        },
        { type: 'separator' },
        { label: 'Export PDF…', click: () => sendCommand('export-pdf') },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        ...(isDev
          ? ([
              { role: 'reload' },
              { role: 'toggleDevTools' },
              { type: 'separator' },
            ] as MenuItemConstructorOptions[])
          : []),
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About SimpleDocs', click: () => sendCommand('about') },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    void queueDocuments(extractDocumentPaths(argv));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (process.platform === 'darwin') {
    app.on('open-file', (event, filePath) => {
      event.preventDefault();
      void queueDocuments(path.extname(filePath).toLowerCase() === DOC_EXTENSION ? [filePath] : []);
    });
  }

  app.whenReady().then(async () => {
    await loadRecentPaths();
    if (!isDev) installAppProtocol(DIST_DIR);
    registerIpc();
    Menu.setApplicationMenu(buildMenu());

    // Deny every renderer permission request by default; the app needs none.
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false);
    });

    createWindow();
    void queueDocuments(extractDocumentPaths(process.argv));

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
