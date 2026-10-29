import { defineConfig, devices } from '@playwright/test';

// Same base path the build used (vite.config.ts: process.env.VITE_BASE ?? '/').
const BASE = process.env.VITE_BASE ?? '/';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Specs navigate relative to the base ('./?demo=1').
    baseURL: `http://localhost:3000${BASE}`,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    ...devices['Desktop Chrome'],
  },

  webServer: {
    // Serves the production build (run `pnpm build` first).
    command: 'pnpm exec vite preview --port 3000 --strictPort',
    url: `http://localhost:3000${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'WebKit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});