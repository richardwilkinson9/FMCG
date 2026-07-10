import { defineConfig, devices } from '@playwright/test'

/**
 * The accessibility gate — separate from the main playwright.config.ts on
 * purpose: it runs against the DEV server on its own port (5177), so it never
 * competes with the e2e journeys running `vite preview` on 4173, and src fixes
 * are reflected instantly without a rebuild.
 *
 * Run with: npx playwright test --config a11y.config.ts
 */
export default defineConfig({
  testDir: './e2e-a11y',
  fullyParallel: true,
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5177',
    trace: 'off',
    // The sandbox ships chromium build 1194 in /opt/pw-browsers; point at it
    // directly rather than downloading (browser installs are not available).
    launchOptions: { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
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
