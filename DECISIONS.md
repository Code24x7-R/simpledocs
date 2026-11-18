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
- Desktop builds (planned): always launch with `--user-data-dir=<temp>` or
  `SIMPLEDOCS_USER_DATA=<temp>`; never test against the real `%APPDATA%\SimpleDocs`.
- Documents: use generated `.sdjson` fixtures (`tests/e2e`, temp dirs); never the user's files.

## Environment (audited 2026-11-18, Windows 11 25H2, AMD64)

- Node v23.11.0, npm 11.16.0 (npm reported as `null` by the skill's
  `snapshot_env.py`: it probes `npm`, not `npm.cmd`, on Windows — known tooling false negative).
- Python 3.13, git 2.54, ImageMagick 7 (`magick`) available for `.ico` generation.
- `baseline.py` on Windows needs `PYTHONUTF8=1`; otherwise decoding Vitest's ANSI output
  crashes on cp1252.
- Playwright 1.62.1 + Chromium installed locally (2026-11-18).
- CI uses Node 20; local Node 23 works. Align any new tooling with Node 20+ (Electron plan).

## Verification status (2026-11-18)

| Gate | Result |
|---|---|
| `npm run type-check` | pass |
| `npm run lint` | pass (0 warnings) |
| `npm run build` | pass (large chunks: `pdfFonts` 21 MB, `index` 1.66 MB) |
| `npm run test` (`verify`) | **1040/1040 pass, 60 files, exit 0** |
| `npm run test:e2e` | **stale: 7/37 pass** — see known issue |

### Known issue: E2E suite predates the single-editor refactor

`tests/e2e/*` still assert the removed multi-page-editor DOM
(`[data-page-editor="N"] .tiptap`) and old toolbar/menu labels (`Style`, `75%`,
`Export PDF`, `button[title="Insert Table"]`). Serial runs confirm selector staleness,
not flakiness. The suite is *not* part of `verify`, so the baseline stays green, but it
must be refreshed before it can gate Electron packaging. Triage: **Fix (M)** — update
selectors/add `data-testid` hooks; do not delete. Untouched until the packaging plan is
approved.

## Decisions

- **D-1 — Dependencies are minimal and intentional.** `present@1.0.0`, `scripts@0.1.0`
  and a direct `esbuild@0.21.5` were accidentally added to `dependencies`; none were
  imported. Removed 2026-11-18. The pre-existing `vite` 5.2.11 → 5.4.21 bump is kept
  (patch-level, build/test green). New runtime deps need a decision entry.
- **D-2 — Web build stays the primary target.** Desktop packaging is additive: no change
  to GitHub Pages output or URLs.
- **D-3 — Desktop shell: Electron + electron-builder, NSIS x64, per-user install.**
  Rationale: existing Chromium-only feature use (pdfmake, TTS, File API, PWA file
  launch) and no need for native modules. Alternative (Tauri) rejected for v1: WebView2
  differences and Rust toolchain not otherwise used here. See
  `docs/ELECTRON_PACKAGING_PLAN.md`.
- **D-4 — Desktop loads the renderer from a privileged `app://` scheme, not `file://`.**
  Needed for a stable secure origin (`localStorage`, IndexedDB, `navigator.clipboard`,
  ES modules) without rewriting Vite's `base`.
- **D-5 — Cloud OAuth (Google Drive, OneDrive) is out of scope for desktop v1.**
  Both flows bind to `window.location.origin` (GIS authorized JS origins, MSAL redirect
  URIs), which cannot be the custom `app://` origin. Desktop v1 keeps local files,
  copy-link, PDF/Markdown export, and LM Studio; cloud entries are hidden with a
  "browser only" note. A loopback/custom-scheme OAuth slice follows after v1.
- **D-6 — No auto-update or code signing in v1.** Unsigned NSIS installers trigger
  SmartScreen ("Unknown publisher"). Signing/auto-update is a later decision with cost
  implications and requires explicit authorization.
- **D-7 — Version 1.0.0 comes from `package.json`.** `vite.config.ts` currently hardcodes
  `__APP_VERSION__`; packaging work should derive it from `package.json` so the
  installer, About dialog, and app version cannot drift.

## Cannot verify here (short list)

- Clean Windows 11 user/machine install, SmartScreen reputation, uninstall/registry
  cleanup, double-click association after a fresh install.
- Code signing, auto-update, enterprise/MSI deployment.
- Real Google/Microsoft OAuth against a custom desktop origin (deferred by D-5).
- macOS/Linux packaging (out of scope; builder config keeps it possible).
