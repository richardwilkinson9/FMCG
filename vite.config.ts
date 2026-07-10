import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Playwright suites (journeys in e2e/, the axe gate in e2e-a11y/) run via
    // their own configs — vitest must not pick their *.spec.ts up.
    exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-a11y/**'],
  },
})
