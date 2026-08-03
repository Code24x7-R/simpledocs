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
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/simpledocs/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['html2pdf.js', 'zustand', 'react-dom/client', 'lucide-react'],
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
