import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

const getGitCommitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
};

const GIT_COMMIT_HASH = getGitCommitHash();
const BUILD_TIMESTAMP = new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
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
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
