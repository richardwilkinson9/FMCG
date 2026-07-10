#!/usr/bin/env node
/**
 * The performance budget, enforced. Reads the built dist/ and fails if the
 * first-load payload or the fonts exceed the ceilings written in
 * PERF_BUDGET.md. Deterministic, no browser — the honest half of the perf
 * gate (Lighthouse covers the field-metric half). Run after `npm run build`.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIST = 'dist'
const ASSETS = join(DIST, 'assets')
const FONTS = join(DIST, 'fonts')

// Ceilings — keep in step with PERF_BUDGET.md.
const BUDGET = {
  entryJsGz: 120 * 1024, // first-load JS, gzipped
  cssGz: 10 * 1024, // first-load CSS, gzipped
  fontsTotal: 90 * 1024, // all woff2 files, raw (already compressed)
}

if (!existsSync(ASSETS)) {
  console.error('No dist/assets — run `npm run build` first.')
  process.exit(1)
}

const gzOf = (path) => gzipSync(readFileSync(path)).length
const files = readdirSync(ASSETS)

// The entry chunk: the index-*.js Vite emits as the eager first-load bundle.
const entry = files.find((f) => /^index-.*\.js$/.test(f))
const css = files.find((f) => /\.css$/.test(f))
if (!entry) {
  console.error('Could not find the entry chunk (index-*.js) in dist/assets.')
  process.exit(1)
}

const entryGz = gzOf(join(ASSETS, entry))
const cssGz = css ? gzOf(join(ASSETS, css)) : 0
const fontsTotal = existsSync(FONTS)
  ? readdirSync(FONTS)
      .filter((f) => f.endsWith('.woff2'))
      .reduce((a, f) => a + statSync(join(FONTS, f)).size, 0)
  : 0

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
const rows = [
  ['first-load JS (gzip)', entryGz, BUDGET.entryJsGz],
  ['first-load CSS (gzip)', cssGz, BUDGET.cssGz],
  ['fonts, all woff2 (raw)', fontsTotal, BUDGET.fontsTotal],
]

let failed = false
console.log('Performance budget (dist/):\n')
for (const [label, actual, budget] of rows) {
  const ok = actual <= budget
  if (!ok) failed = true
  console.log(
    `  ${ok ? 'OK  ' : 'OVER'}  ${label.padEnd(24)} ${kb(actual).padStart(10)} / ${kb(budget).padStart(10)} budget`,
  )
}

console.log()
if (failed) {
  console.error('Over budget — see PERF_BUDGET.md. The change is wrong, not the budget.')
  process.exit(1)
}
console.log('Within budget.')
