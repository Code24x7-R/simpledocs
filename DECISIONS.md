# simpleDocs — Engineering Decisions

Living document. Code is the source of truth; this records the stack, commands, environment
limits, and decisions that code alone does not explain.

## Stack

- React 18 + TypeScript 5 (strict), Vite 5, Tiptap 3, Zustand, Tailwind CSS 3.
- Pure client-side SPA; no backend. JSON document format (`.sdjson`), PDF via pdfmake,
  Word import via mammoth, sharing via URL fragment + file.
- Tests: Vitest + Testing Library (jsdom), Playwright (Chromium) for E2E.
- Deployment: GitHub Pages via `.github/workflows/deploy.yml` (Node 20), custom domain.

## Commands

| Purpose | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:5173) |
| Unit/integration tests (`verify`) | `npm run test` |
| E2E | `npm run test:e2e` (builds, then preview on :4173) |
| Typecheck | `npm run type-check` |
| Lint | `npm run lint` |
| Production build | `npm run build` → `dist/` |
| Font VFS regeneration | `npm run setup:fonts` (needs `./fonts`, git-ignored) |

## Isolated profiles and fixtures

- Browser E2E: Playwright uses its own bundled Chromium profile under
  `%LOCALAPPDATA%\ms-playwright`; no user Chrome data is touched.
- Desktop tests: always launch with `--user-data-dir=<temp>`; never test against the
  real `%APPDATA%\SimpleDocs`. `SIMPLEDOCS_APP_EXE` lets the same smoke suite run against
  `release/win-unpacked/SimpleDocs.exe` or an installed copy.
- Documents: use generated `.sdjson` fixtures (`tests/e2e`, temp dirs); never the user's files.

## Environment (audited 2026-11-18, Windows 11 25H2, AMD64)

- Node v23.11.0, npm 11.16.0 (npm reported as `null` by the skill's
  `snapshot_env.py`: it probes `npm`, not `npm.cmd`, on Windows — known tooling false negative).
- Python 3.13, git 2.54, ImageMagick 7 (`magick`) available for `.ico` generation.
- `baseline.py` on Windows needs `PYTHONUTF8=1`; otherwise decoding Vitest's ANSI output
  crashes on cp1252.
- Playwright 1.62.1 + Chromium installed locally (2026-11-18).
- CI uses Node 20; local Node 23 works. Electron 45 bundles its own Node.
- `tsc -b` used to emit `vite.config.js`, which Vite then preferred over the TypeScript
  config. `tsconfig.node.json` now emits to `node_modules/.cache/tsconfig-node`; never
  commit a root `vite.config.js`.

## Verification status (2026-11-18, after Phase 43)

| Gate | Result |
|---|---|
| `npm run type-check` | pass (renderer + Electron) |
| `npm run lint` | pass (0 warnings) |
| `npm run build` | pass (large chunks: `pdfFonts` 21 MB, `index` 1.66 MB) |
| `npm run test` (`verify`) | **1093/1093 pass, 65 files, exit 0** |
| `npm run test:e2e` | **24/24 pass** |
| `npm run test:desktop` | **16/16 pass** (win-unpacked and installed app) |
| Installer smoke | install → association → smoke → uninstall → registry cleanup verified |
| `npm run electron:build` | `release/SimpleDocs-1.0.0-x64-setup.exe` (~126 MB) |

### Resolved: E2E suite predated the single-editor refactor

`tests/e2e/*` asserted the removed multi-page-editor DOM and old labels. Rewritten for the
single-editor architecture with stable `data-testid` hooks (S0). Not deleted, and the
invalid-import failure case was added.

## Decisions

- **D-1 — Dependencies are minimal and intentional.** `present@1.0.0`, `scripts@0.1.0`
  and a direct `esbuild@0.21.5` were accidentally added to `dependencies`; none were
  imported. Removed 2026-11-18. The pre-existing `vite` 5.2.11 → 5.4.21 bump is kept
  (patch-level, build/test green). New runtime deps need a decision entry.
- **D-2 — Web build stays the primary target.** Desktop packaging is additive: no change
  to GitHub Pages output or URLs.
- **D-3 — Desktop shell: Electron 45 + electron-builder 26, NSIS x64, per-user install.**
  Implemented with `vite-plugin-electron` (0.29, Vite 5 compatible; 1.x requires Vite 6)
  and Electron pinned exactly. Rationale: existing Chromium-only feature use and no
  native modules. See `docs/ELECTRON_PACKAGING_PLAN.md`.
- **D-4 — Desktop loads the renderer from a privileged `app://` scheme, not `file://`.**
  Needed for a stable secure origin (`localStorage`, IndexedDB, `navigator.clipboard`,
  ES modules) without rewriting Vite's `base`.
- **D-5 — Cloud OAuth (Google Drive, OneDrive, S3) is out of scope for desktop v1.**
  Both flows bind to `window.location.origin` (GIS authorized JS origins, MSAL redirect
  URIs), which cannot be the custom `app://` origin. Desktop v1 keeps local files,
  copy-link, PDF/Markdown export, and LM Studio; cloud entries are hidden with a
  "browser only" note. A loopback/custom-scheme OAuth slice follows after v1.
- **D-6 — No auto-update or code signing in v1.** Unsigned NSIS installers trigger
  SmartScreen ("Unknown publisher"). Signing/auto-update is a later decision with cost
  implications and requires explicit authorization.
- **D-7 — App version comes from `package.json`.** `vite.config.ts` reads it into
  `__APP_VERSION__`, so installer, About dialog and app version cannot drift.
- **D-8 — Native document CRUD uses main-process dialogs.** File → Open/Save/Save As,
  Export PDF and Export Markdown call `dialog.showOpenDialog`/`showSaveDialog` through the
  preload bridge. The web build keeps its existing modal/download paths; `isDesktop()`
  selects the branch. Renderer never receives filesystem paths except the chosen file.
- **D-9 — Single-instance file association.** `.sdjson` launches are parsed from argv in
  the main process (first launch and `second-instance`), size-capped (64 MB), and delivered
  over IPC after a renderer-ready handshake. No second window is created.
- **D-10 — Installer cleanup is explicit.** electron-builder removed the ProgID but left
  the `.sdjson` extension default behind. `build/installer.nsh` (`customUnInstall`)
  removes the extension key when it still points at `SimpleDocs.sdjson`; verified by
  install/uninstall on Windows 11.
- **D-12 — Closed modals must do no work.** `CloudStorageModal` was compressing
  the entire document with lz-string on every render to show the share-link size,
  even when closed. With inline images this cost seconds per keystroke. The modal now
  returns null before building its tree and memoizes the size guard; the app only
  serializes the document while the modal is open. Benchmark (150 inline PNGs,
  1.45 MB JSON): load 1.68 s → 0.09 s, 10 keystrokes 6.65 s → 0.17 s.
  Regression test: "does no compression or parsing while closed".
- **D-13 — Save As names the document.** When the user picks a filename different from
  the suggested one (or the document is untitled), the title becomes the filename stem
  (underscores → spaces). Untitled files opened from disk also adopt a meaningful
  filename. `Untitled_Document.sdjson` never becomes a title. This keeps the title
  meaningful after restart/reinstall instead of showing "Untitled Document".
- **D-16 — Word files launch like documents.** The argv parser only accepted
  `.sdjson`, so a `.docx` association launch was silently ignored and the previous
  autosave stayed open. Launches now accept `.docx`; the main process reads bytes and
  delivers base64, and the renderer converts with the same mammoth + Tiptap pipeline as
  File → Import Word (shared `importWordIntoStore`). Cold start, second-instance, native
  Open and Recent Files all support Word files; the title comes from the filename.
- **D-17 — Never hijack Word's default .docx handler.** The installer registers
  `SimpleDocs.docx` under `.docx\OpenWithProgids` (an "Open with" entry) instead of
  setting the default association. Uninstall removes only that entry/ProgID and clears
  the default only if the user explicitly chose SimpleDocs.
- **D-15 — Recent Files are real on desktop.** MRU entries now carry the absolute
  path. Reopening goes through `desktop:open-recent`, and the main process only reads
  paths it has seen through a native Open/Save dialog or a `.sdjson` association,
  persisted in `userData/recent-files.json` (20-entry cap). This avoids giving the
  renderer arbitrary file-read access. Missing files are removed from MRU with a
  message; browser builds keep the old "use File → Open" notice because they have no
  persistent path access.
- **D-14 — Windows icon comes from the web favicon.** `public/favicon.svg`
  (blue rounded square, white "S") is the source for `public/icon-192/512.png` and
  `build/icon.ico`/`build/sdjson.ico`; the previous cream/dark PWA raster looked blank
  in the taskbar and shortcuts. Re-run the ImageMagick commands when the favicon changes.
- **D-11 — Native menu is intentionally minimal.** File (New/Open/Save/Save As/Export
  PDF/Exit), Edit (cut/copy/paste/select all), View (fullscreen; dev-only reload/devtools),
  Help (About). The menu bar is auto-hidden (Alt reveals). Document commands are forwarded
  to the renderer so the in-app UI stays the single source of truth. Undo/redo are *not*
  menu roles; Ctrl+Z stays on ProseMirror's history.

## Cannot verify here (short list)

- SmartScreen reputation and code signing (installer is deliberately unsigned).
- Auto-update, enterprise/MSI deployment.
- User-data survival across a real uninstall: the config sets
  `deleteAppDataOnUninstall: false`, but tests avoid writing to the real
  `%APPDATA%\SimpleDocs` profile.
- OS-level double-click delivery (registry command is verified; automated tests use argv
  and the second-instance path).
- Native keyboard accelerators via synthetic input (CDP key events do not reach Electron's
  native menu). Accelerator configuration and menu handlers are covered; real key presses
  are on the manual checklist.
- Real Google/Microsoft OAuth against a custom desktop origin (deferred by D-5).
- macOS/Linux packaging (out of scope; builder config keeps it possible).
