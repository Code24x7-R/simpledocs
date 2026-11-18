# Baseline

Verify command: `npm run test` (Vitest, 65 files / 1093 tests).
Last clean run: 2026-11-18, `baseline.py` exit 0.

Supplementary gates (not part of `verify`):
- `npm run test:e2e` — 24/24 (browser, refreshed for the single-editor architecture)
- `npm run test:desktop` — 16/16 (Electron smoke against the packaged/unpacked app)
- `npm run electron:build` — NSIS installer build

## Known failures
