import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const getGitCommitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
};

const getAppVersion = () => {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const GIT_COMMIT_HASH = getGitCommitHash();
const BUILD_TIMESTAMP = new Date().toISOString();
const APP_VERSION = getAppVersion();

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Desktop shell is opt-in: `vite --mode electron` / `vite build --mode electron`.
    // Plain `npm run dev` and `npm run build` remain web-only.
    ...(mode === 'electron'
      ? [
          electron({
            main: {
              entry: 'electron/main.ts',
            },
            preload: {
              input: 'electron/preload.ts',
              vite: {
                build: {
                  rollupOptions: {
                    // Sandboxed preload scripts must be CommonJS. The package is
                    // `type: module`, so force a .cjs extension as well.
                    output: {
                      format: 'cjs',
                      entryFileNames: '[name].cjs',
                      inlineDynamicImports: true,
                    },
                  },
                },
              },
            },
          }),
        ]
      : []),
    {
      name: 'use-sync-external-store-shim',
      resolveId(id) {
        if (id === 'use-sync-external-store/shim/with-selector.js') {
          return id;
        }
        return null;
      },
      load(id) {
        if (id === 'use-sync-external-store/shim/with-selector.js') {
          return `
            import React from 'react';
            export const useSyncExternalStoreWithSelector = React.useSyncExternalStore
              ? function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
                  const inst = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
                  return selector(inst);
                }
              : function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
                  let inst = getSnapshot();
                  return selector(inst);
                };
            export default { useSyncExternalStoreWithSelector };
          `;
        }
        return null;
      },
    },
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['use-sync-external-store'],
    exclude: ['lucide-react'],
  },
  define: {
    __GIT_COMMIT_HASH__: JSON.stringify(GIT_COMMIT_HASH),
    __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'electron/**/*.test.ts'],
  },
}));
