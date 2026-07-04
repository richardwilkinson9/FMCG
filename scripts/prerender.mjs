/**
 * Post-build: give every route its own static HTML so social scrapers and
 * search engines (which don't run JS) see the correct <title>, description and
 * OG card. Each file boots the same SPA bundle; the app then reads the path.
 * Also emits sitemap.xml. Runs after `vite build` (see package.json).
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const SITE = 'https://getgross.co.uk'

// Parse the page registry (avoid a TS loader in the build step).
const pagesTs = readFileSync(resolve(ROOT, 'src/config/pages.ts'), 'utf8')
const SUFFIX = (pagesTs.match(/const SUFFIX = '([^']*)'/) || [])[1] || 'GROSS.'
const str = (block, name) => {
  // Handles both single-quoted and backtick (template) string values.
  const m = block.match(new RegExp(`${name}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|\`([^\`]*)\`)`))
  const raw = m ? (m[1] ?? m[2]) : ''
  return raw.replace(/\$\{SUFFIX\}/g, SUFFIX).replace(/\\'/g, "'")
}
const bool = (block, name) => new RegExp(`${name}:\\s*true`).test(block)
const PAGES = [...pagesTs.matchAll(/\{\s*id:\s*'[^']*'[\s\S]*?indexed:\s*(?:true|false),?\s*\}/g)].map((m) => ({
  slug: str(m[0], 'slug'),
  seoTitle: str(m[0], 'seoTitle'),
  description: str(m[0], 'description'),
  indexed: bool(m[0], 'indexed'),
}))

const html = readFileSync(resolve(DIST, 'index.html'), 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function rewrite(base, { slug, seoTitle, description }) {
  const url = slug ? `${SITE}/${slug}` : SITE
  const img = `${SITE}/og/${slug || 'home'}.png`
  const t = esc(seoTitle)
  const d = esc(description)
  let out = base
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/s, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${img}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${img}$2`)
  return out
}

let written = 0
for (const page of PAGES) {
  if (!page.slug) continue // home is the root index.html already
  const dir = resolve(DIST, page.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'index.html'), rewrite(html, page))
  written++
}

// sitemap.xml
const urls = PAGES.filter((p) => p.indexed).map((p) => {
  const loc = p.slug ? `${SITE}/${p.slug}` : SITE
  return `  <url><loc>${loc}</loc></url>`
}).join('\n')
writeFileSync(resolve(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)

console.log(`prerender: ${written} route files + sitemap (${PAGES.filter((p) => p.indexed).length} urls)`)
