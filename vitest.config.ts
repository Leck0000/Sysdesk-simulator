import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Playwright specs run via `pnpm test:e2e`, not Vitest
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
});