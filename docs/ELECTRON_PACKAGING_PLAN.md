# Phase 43 — Electron Packaging (Windows 11)

**Status:** IMPLEMENTED (2026-11-18) on branch `feat/electron-windows`. Awaiting merge review.
**Created:** 2026-11-18
**Requirement IDs:** FR-15 … FR-19 (continue `docs/requirements.md`)
**Related decisions:** D-1 … D-7 in `DECISIONS.md`

## 1. Goal

Ship SimpleDocs as a signed-ready, installable Windows 11 desktop application that behaves
like the web app plus native file association, without changing the existing web build.

Non-goals for v1: macOS/Linux installers, auto-update, code signing, desktop OAuth for
Google Drive / OneDrive / S3, mobile builds, a second UI/menu implementation.

## 2. Impact check (L)

| Area | Impact |
|---|---|
| Dependencies | Add `electron` (exact pin), `electron-builder`, `vite-plugin-electron`; optionally `@electron/fuses`. ~350 MB in `node_modules`, Electron binary download. No runtime deps added to the renderer. |
| Security | New main process + preload (the only place with Node access). Must be hardened: context isolation, sandbox, no Node in renderer, CSP, navigation/window-open blocking. |
| Installer | NSIS writes HKCU registry entries for the `.sdjson` association and shortcuts; uninstall removes them. User documents are never touched. |
| Renderer behavior | Cloud providers (Drive/OneDrive/S3) are hidden in the desktop build (D-5); copy-link, file save/open, PDF/Markdown/Word, TTS, and LM Studio stay. |
| Persistence | Autosave stays in `localStorage` under the app's `userData` directory. No storage-format change, no migration. Browser and desktop profiles are separate by design; documents move via `.sdjson`. |
| CI | New Windows workflow builds/attests the installer as an artifact. No publishing, signing, or secrets in v1. |
| Web build | Untouched: same Vite output, same GitHub Pages deploy, same `base: '/'`. |

## 3. Architecture

```
SimpleDocs.exe
└─ main process (Node, electron/main.ts)
   ├─ app:// protocol  → serves ./dist (fixed origin app://simpledocs)
   ├─ BrowserWindow    → nodeIntegration:false, contextIsolation:true, sandbox:true
   ├─ single instance + file association (.sdjson)
   ├─ native menu (File/View/Help) and external-link handling
   └─ preload (electron/preload.ts) → window.simpleDocsDesktop (whitelisted IPC only)
        └─ renderer: existing React app (unchanged web build) + desktop adapter hooks
```

**Renderer URL**
- Dev: `http://localhost:5173` (Vite).
- Production: `app://simpledocs/index.html`. Register the scheme as
  `standard: true, secure: true, supportFetchAPI: true, corsEnabled: true` so
  `localStorage`, IndexedDB, `navigator.clipboard`, modules, and `fetch` all work.
  Do **not** use `file://`: it has a null origin, breaks storage/secure-context APIs, and
  would force `base: './'` rewrites of the web build.

**File association**
- `electron-builder` `fileAssociations` registers `.sdjson` (mime `application/json`,
  name "SimpleDocs Document", role Editor).
- Cold start: parse `process.argv` for existing `.sdjson` paths after `whenReady`; queue
  the payload until the renderer signals `renderer-ready`.
- Warm start: `second-instance` event → parse argv → focus the existing window and send
  the document. No second window, no duplicate app instances.

**Preload API (minimum surface)**

```ts
window.simpleDocsDesktop = {
  isDesktop: true,
  platform: 'win32',
  getVersion(): Promise<string>,
  onOpenDocument(cb: (doc: { name: string; text: string }) => void): () => void,
  // v1.1: saveDocument/openDocument via native dialogs
}
```

The renderer never receives `ipcRenderer`, file-system paths outside the dialog results,
or arbitrary channel access. Main validates size (≤64 MB), extension, and UTF-8 decode;
the renderer re-validates the `DocState` shape with a shared pure function.

**Security baseline (FR-18)**
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`,
  `webSecurity: true`, `allowRunningInsecureContent: false`.
- `will-navigate` → deny non-app navigation; `setWindowOpenHandler` → `shell.openExternal`
  for `http(s):`, deny everything else (link clicks and `window.open` already exist in
  `DocumentEditor.tsx` and the TTS/share features).
- CSP injected on every `app://` response:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
   img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:;
   connect-src 'self' https: http://localhost:* http://127.0.0.1:*;
   object-src 'none'; base-uri 'none'; frame-ancestors 'none'`.
- Production: no DevTools opener, no `--inspect` path (optional fuse flips).
- Electron's default download handling shows a native Save dialog; PDF/`.sdjson`/
  Markdown exports keep working without new renderer code.

**Menu (v1)**
Minimal native menu: File (Open…, Exit), View (Zoom, Fullscreen, Reload [dev only],
DevTools [dev only]), Help (About → version dialog). No Edit roles/accelerators that
could shadow ProseMirror's own keymap; verify Ctrl+Z/Y/C/V/A in the packaged smoke test.
The in-app Navbar remains the primary UI.

## 4. Files

| Path | Change |
|---|---|
| `package.json` | `"main": "dist-electron/main.js"`, scripts, devDeps, version source |
| `electron/main.ts` | Window, protocol, CSP, single instance, file association, menu, links |
| `electron/preload.ts` | `contextBridge` API (above) |
| `electron/argv.ts` | Pure argv → `.sdjson` path extraction (unit-testable) |
| `electron/protocol.ts` | `app://` request → file mapping + traversal guard + headers |
| `electron/desktop.d.ts` | Shared IPC payload types |
| `src/types/desktop.d.ts` | `Window.simpleDocsDesktop` typing |
| `src/hooks/useFileLaunch.ts` | Extract shape validation; add desktop bridge path (keep PWA path) |
| `src/utils/desktop.ts` | `isDesktop()`, provider gating helper |
| `src/components/layout/CloudStorageModal.tsx` | Hide Drive/OneDrive/S3 on desktop with "browser only" note |
| `vite.config.ts` | `vite-plugin-electron/simple`, `__APP_VERSION__` from `package.json` |
| `electron-builder.yml` | App ID, NSIS, files, icons, file association |
| `build/icon.ico`, `build/sdjson.ico` | Generated from `public/icon-512.png` (`magick`) |
| `tests/desktop/smoke.spec.ts` | Playwright Electron smoke |
| `playwright.desktop.config.ts` | Separate config (the `tests/e2e` suite is stale) |
| `.github/workflows/release-windows.yml` | Build/test/package/upload artifact |
| `README.md`, `MANUAL.md`, `docs/PLAN.md`, `docs/requirements.md` | Desktop docs + FR-15…19 |

## 5. Slices (each leaves a working app)

### S0 — Refresh the stale E2E suite (completed)
The current suite asserts the removed multi-editor DOM (`[data-page-editor]`) and old menu
labels; 30/37 fail. Add stable `data-testid` hooks to the current UI (Navbar menu buttons,
toolbar controls, editor root) and update specs. No assertions weakened; each spec keeps its
intent. **Evidence:** `npm run test:e2e` green. *If deferred, the suite is quarantined in
`DECISIONS.md` and the new desktop smoke covers the critical path only.*

### S1 — Electron shell, dev + production load
Add devDeps, `electron/main.ts`, `electron/preload.ts`, protocol handler, CSP, security
flags, npm scripts. Window loads the Vite dev server; `npm run electron:dir` loads the
production `app://` build. **Evidence:** window renders editor, zero CSP/console errors,
`npm run test` still green, `electron:dir` launch with `--user-data-dir=<temp>`.

### S2 — File association + single instance (FR-16)
`fileAssociations`, argv parser, `second-instance`, renderer-ready handshake, desktop
adapter in `useFileLaunch`, hidden cloud providers. Unit tests: argv parsing (flags,
quotes, unicode, non-`.sdjson`, duplicates), shape validation, traversal guard.
**Evidence:** rung 2 + unit tests; packaged `--dir` open via command line and second
instance.

### S3 — Native menu, links, exports (FR-16/18)
Menu, external-link policy, download behavior, version from `package.json`.
**Evidence:** unit + Electron smoke; PDF and `.sdjson` save dialogs verified.

### S4 — Installer + icon (FR-15)
`electron-builder.yml` (NSIS x64, per-user, shortcut options, `deleteAppDataOnUninstall:
false`), icon generation, `npm run electron:build`.
**Evidence:** local install/uninstall, Start Menu, file association, app-data survival.

### S5 — CI + docs (FR-19)
Windows workflow (lint/typecheck/test/build → `--dir` smoke → NSIS artifact), README and
MANUAL desktop sections, requirements/PLAN updates.
**Evidence:** workflow green on a PR/tag; artifact downloadable.

### S6 — Post-v1 (separate decisions)
Code signing (SmartScreen), auto-update, OAuth loopback for cloud providers, portable
target/MSI, macOS/Linux.

## 6. Build & packaging config (proposed)

```yaml
# electron-builder.yml
appId: au.mouseclick.simpledocs
productName: SimpleDocs
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - dist-electron/**/*
  - package.json
asar: true
win:
  target:
    - target: nsis
      arch: [x64]
  icon: build/icon.ico
  artifactName: ${productName}-${version}-${arch}-setup.${ext}
nsis:
  oneClick: false
  perMachine: false
  allowElevation: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: SimpleDocs
  deleteAppDataOnUninstall: false
fileAssociations:
  - ext: sdjson
    name: SimpleDocs Document
    description: SimpleDocs document
    mimeType: application/json
    role: Editor
    icon: build/sdjson.ico
```

```jsonc
// package.json additions
"main": "dist-electron/main.js",
"scripts": {
  "electron:dev":  "vite",
  "electron:dir":  "vite build && electron-builder --win --x64 --dir",
  "electron:build":"vite build && electron-builder --win nsis --x64",
  "test:desktop":  "playwright test -c playwright.desktop.config.ts"
},
"devDependencies": {
  "electron": "45.3.4",
  "electron-builder": "^26.18.0",
  "vite-plugin-electron": "^1.2.0"
}
```

`vite-plugin-electron` builds `electron/main.ts` + `electron/preload.ts` to
`dist-electron/` and starts Electron against the dev server; production `vite build`
emits both renderer and main. Fallback if the plugin does not support Vite 5.4: replace it
with a 30-line `scripts/build-electron.mjs` using the esbuild already shipped by Vite (no
new dependency), plus `concurrently`-free `node scripts/dev-desktop.mjs`.

## 7. Verification ladder

| Rung | When | Check |
|---|---|---|
| 0 (new) | every desktop slice | `npm run test` — existing 1040 tests plus desktop unit tests |
| 1/2 | every desktop slice | targeted units + typecheck + lint |
| 3 | before installer work | full `verify` + `npm run build` |
| 3e | S0/S3 | refreshed Playwright E2E against `preview` |
| 4 (required) | S1 onward | packaged `--dir` smoke: isolated `--user-data-dir`, open, type, save PDF + `.sdjson`, restart → autosave restored |
| 4e | S2/S5 | Electron Playwright smoke (`_electron.launch`), also in CI |
| 5 (manual) | S4 | clean Windows 11 user: install, SmartScreen wording, double-click `.sdjson`, second-instance behavior, uninstall, data survival |

New tests (append to the suite, do not replace):
- `electron/argv.test.ts` — path extraction and edge cases.
- `electron/protocol.test.ts` — traversal guard, MIME map, index fallback.
- `src/hooks/useFileLaunch.test.tsx` — desktop bridge path (payload validation, invalid
  shape skipped, unsubscribe on unmount).
- `tests/desktop/smoke.spec.ts` — launch, render, type, save, reopen, version.

## 8. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| OAuth/custom-origin breakage (Drive/OneDrive/S3) | certain | Hide providers on desktop (D-5); loopback OAuth in S6. |
| CSP blocks a runtime feature (GIS, Gemini, LM Studio) | medium | Desktop v1 CSP is `script-src 'self'`; chat providers tested in S3 smoke. If a provider is blocked by CORS from `app://`, proxy through main with a narrow IPC (`net.fetch` to configured provider URL only). |
| `navigator.clipboard`/localStorage missing or per-launch origin | low | Fixed `app://simpledocs` origin registered standard+secure; smoke-verify copy link + restart persistence. |
| Unsigned installer flagged by SmartScreen/AV | high | Expected; document "More info → Run anyway"; signing is S6. |
| Electron adds ~120 MB installer / ~300 MB installed | medium | Accepted (Electron runtime); `pdfFonts` is 21 MB regardless. Optionally lazy-load the PDF font VFS later. |
| Playwright/Electron version drift | medium | Electron pinned exact; smoke runs in CI on `windows-latest`. |
| Registry association hijack or leftover after uninstall | low | NSIS per-user HKCU, builder-managed; verify on clean VM. |
| Stale E2E suite hides renderer regressions | high | S0 refresh (preferred) or explicit quarantine + desktop smoke. |

## 9. Estimates

| Slice | Size | Effort |
|---|---|---|
| S0 E2E refresh | M | 0.5 day |
| S1 shell + protocol + CSP | M | 0.5 day |
| S2 association + single instance | L | 1 day |
| S3 menu/links/exports | M | 0.5 day |
| S4 installer + icon | M | 0.5 day |
| S5 CI + docs | M | 0.5 day |
| **v1 total** | | **~3.5 days** |

## 10. Implementation result

Delivered as planned, with these concrete choices and deviations:

- `vite-plugin-electron@0.29.0` (not 1.x, which requires Vite ≥ 6). Main builds to
  `dist-electron/main.js` (ESM); preload is forced to CommonJS `preload.cjs` because the
  package is `type: module` and sandboxed preloads cannot be ESM.
- `app://` protocol handler serves `dist/` with an explicit MIME map, traversal guard and
  CSP header. `fetch('app://simpledocs/manifest.json')` is verified in the smoke suite.
- Renderer `node_modules` are excluded from the asar (`!node_modules/**/*`), shrinking
  `app.asar` from 113 MB to 23 MB; renderer/main/preload are fully bundled.
- Native dialogs: Open/Save/Save As/Export PDF/Export Markdown. Save payloads are base64
  over IPC, capped at 256 MB, with sanitized suggested names and extension filters.
- Installer: `build/installer.nsh` adds `customUnInstall` cleanup for the `.sdjson`
  extension (electron-builder leaves it behind otherwise).
- Local verification: installer built, installed to a temp dir, association/keys/shortcuts
  inspected, full smoke suite run against the installed exe, then uninstalled and verified
  clean. Data-preservation across uninstall is config-verified only (tests avoid the real
  profile).
- SmartScreen/code signing remains out of scope; the installer is unsigned by design.

### Verified results
- `npm run test` — 1074/1074 (63 files)
- `npm run test:e2e` — 24/24
- `npm run test:desktop` — 9/9 against win-unpacked and installed app
- `npm run electron:build` — NSIS installer produced
- Local install/uninstall — registry association, shortcuts and cleanup verified

## 11. Decisions needed before S1

1. Approve the three devDependencies and the `app://` approach (D-3/D-4).
2. Cloud providers hidden in the desktop build for v1 (D-5) — acceptable?
3. Refresh the stale E2E suite now (S0) or quarantine it and rely on the new desktop smoke?
4. NSIS only, or also ship a portable `.exe` (adds ~80 MB and a second artifact)?
