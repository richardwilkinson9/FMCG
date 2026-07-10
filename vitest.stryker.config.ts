import { defineConfig } from 'vitest/config'

// Used only by the mutation-testing run (stryker.config.json): scopes vitest
// to the maths suites so every mutant of calculations.ts is judged by the
// hand-computed regression suite plus the property-based invariants.
export default defineConfig({
  test: {
    include: ['src/utils/calculations.test.ts', 'src/utils/calculations.property.test.ts'],
  },
})
