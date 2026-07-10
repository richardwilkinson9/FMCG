import { defineConfig, devices } from '@playwright/test'

/**
 * The e2e matrix. Chromium desktop + an iPhone SE profile run everywhere
 * (Chromium is pre-installed in CI/sandbox). WebKit — the audience's actual
 * phone engine — is one env var away: set PW_WEBKIT=1 once the environment
 * can download the browser (`npx playwright install webkit`). The specs are
 * engine-agnostic; nothing else changes.
 *
 * The suite runs against the production build (`vite preview`), so what is
 * tested is what deploys — prerendered HTML, lazy chunks, the lot.
 */

const projects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    // iPhone SE viewport on the Chromium engine: catches the stacked <901px
    // calculator layout and touch targets even where WebKit can't install
    name: 'iphone-se',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  },
]

if (process.env.PW_WEBKIT) {
  projects.push(
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone-se-webkit', use: { ...devices['iPhone SE (3rd gen)'] } },
  )
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects,
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
