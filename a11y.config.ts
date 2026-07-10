import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

/**
 * The accessibility gate — separate from the main playwright.config.ts on
 * purpose: it runs against the DEV server on its own port (5177), so it never
 * competes with the e2e journeys running `vite preview` on 4173, and src fixes
 * are reflected instantly without a rebuild.
 *
 * Run with: npx playwright test --config a11y.config.ts
 */

// The sandbox ships Chromium build 1194 in /opt/pw-browsers and can't download
// browsers, so point at it — but ONLY when it exists. In the CI Playwright
// container the file is absent, so we fall through to Playwright's own bundled
// browser (setting a non-existent executablePath would make every launch fail).
const SANDBOX_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const launchOptions = existsSync(SANDBOX_CHROME) ? { executablePath: SANDBOX_CHROME } : {}

export default defineConfig({
  testDir: './e2e-a11y',
  fullyParallel: true,
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5177',
    trace: 'off',
    launchOptions,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-375',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npx vite --port 5177 --strictPort',
    url: 'http://localhost:5177',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
