/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the build works on GitHub Pages (/repo-name/), Netlify, Vercel or any static host.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/ui/**', 'src/store/**', 'src/sync/**'],
      // Thin SDK adapters: covered by the cloud E2E suite and the database tests instead.
      exclude: [
        'src/lib/seed.ts',
        'src/lib/monitoring.ts',
        'src/sync/client.ts',
        'src/sync/supabaseApi.ts',
        'src/sync/auth.ts',
        'src/sync/config.ts',
        '**/*.test.*',
      ],
      // CI fails if coverage of core logic and the component library drops below these.
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
})
