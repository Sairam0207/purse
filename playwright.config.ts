import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const CLOUD_PORT = 4174
/** The cloud build points at an address nothing listens on; tests mock Supabase's HTTP API with page.route. */
export const FAKE_SUPABASE = 'http://127.0.0.1:54399'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Optional: point at an existing Chromium instead of the one `playwright install` downloads.
    ...(process.env.CHROMIUM_PATH && { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /cloud\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /cloud\.spec/ },
    {
      name: 'cloud',
      testMatch: /cloud\.spec/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${CLOUD_PORT}` },
    },
  ],
  // Test the production build, which is what users actually get.
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Same app built with cloud sync enabled.
      command: `npx vite build --outDir dist-cloud && npx vite preview --outDir dist-cloud --port ${CLOUD_PORT} --strictPort`,
      port: CLOUD_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_SUPABASE_URL: FAKE_SUPABASE, VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
    },
  ],
})
