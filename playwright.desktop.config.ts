import { defineConfig } from '@playwright/test';

/**
 * Desktop (Electron) smoke tests.
 *
 * Kept separate from `tests/e2e` because these drive the packaged/unpacked
 * Windows build rather than a browser dev server. Run with `npm run test:desktop`
 * after `npm run electron:dir`.
 */
export default defineConfig({
  testDir: './tests/desktop',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    trace: 'retain-on-failure',
  },
});
