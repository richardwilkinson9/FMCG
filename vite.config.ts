import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Release id for the error beacon: Vercel sets VERCEL_GIT_COMMIT_SHA at build
// time; take the short SHA, fall back to 'dev' for local builds. No git call,
// no Date.now — deterministic and available in the Vercel build environment.
const release = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __RELEASE__: JSON.stringify(release),
  },
  test: {
    // Playwright suites (journeys in e2e/, the axe gate in e2e-a11y/, the visual
    // regression gate in e2e-visual/) run via their own configs — vitest must
    // not pick their *.spec.ts up (they call Playwright's test(), which throws
    // under vitest).
    exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-a11y/**', 'e2e-visual/**'],
  },
})
