# Baseline

Verify command: `npm run test` (Vitest, 63 files / 1074 tests).
Last clean run: 2026-11-18, `baseline.py` exit 0.

Supplementary gates (not part of `verify`):
- `npm run test:e2e` — 24/24 (browser, refreshed for the single-editor architecture)
- `npm run test:desktop` — 10/10 (Electron smoke against the packaged/unpacked app)
- `npm run electron:build` — NSIS installer build

## Known failures
