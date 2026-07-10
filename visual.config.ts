import { defineConfig, devices } from '@playwright/test'

/**
 * VISUAL REGRESSION GATE — "the brand is the pixels".
 *
 * Snapshots every calculator's till receipt (the `.print-block` from
 * Receipt.tsx) at two widths, so a stray padding/colour/type change on the
 * result surface cannot land unseen. Runs against `vite preview` on its own
 * port (4183) so it never collides with the e2e journeys (4173) or the a11y
 * gate's dev server (5177). Preview serves the ALREADY-BUILT dist/ — this
 * config never rebuilds.
 *
 * Run with: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *   npx playwright test --config visual.config.ts
 *
 * ─── BASELINE AUTHORITY (read before trusting a diff) ────────────────────────
 * Font rasterisation differs between this sandbox's Chromium and the GitHub
 * runners, so pixel baselines are only AUTHORITATIVE when generated inside the
 * pinned Playwright Docker image:
 *
 *     mcr.microsoft.com/playwright:v1.61.1-jammy
 *
 * The CI job runs the suite inside that image and stores its baselines as the
 * source of truth. Any baselines generated locally / in this sandbox are a
 * STARTING POINT only — CI must regenerate (`--update-snapshots`) on first run
 * in the container, then the committed container baselines gate every PR.
 * maxDiffPixelRatio below absorbs sub-pixel antialiasing; a real brand drift
 * (colour, spacing, glyph) moves far more than that.
 */
export default defineConfig({
  testDir: './e2e-visual',
  fullyParallel: true,
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4183',
    trace: 'off',
    // The sandbox ships chromium build 1194 in /opt/pw-browsers; point at it
    // directly rather than downloading (browser installs are not available
    // here). Mirrors a11y.config.ts. In the CI container the bundled browser
    // is used, so this path is simply ignored there.
    launchOptions: { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'chromium',
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
    command: 'npx vite preview --port 4183 --strictPort',
    url: 'http://localhost:4183',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
