/**
 * SEO + internal-link graph audit — offline, deterministic, CI-ready.
 *
 * Walks the prerendered dist/ (dist/<slug>/index.html + dist/index.html) and,
 * per route, verifies the SEO surface the crawlers actually see: one <h1>,
 * a real <title> + meta description, a correct cleanUrls canonical, the OG /
 * Twitter card tags, and JSON-LD that parses and carries the @type the route
 * is supposed to carry (WebSite/Organization on home, WebApplication +
 * BreadcrumbList per tool, Article + FAQPage on guides, Article on the ledger).
 * Then it audits the internal-link mesh across every page (no indexed orphan,
 * no href to an unknown slug) and validates sitemap.xml.
 *
 * Reads dist/ ONLY — no browser, no network. Prints a per-route PASS/FAIL
 * table + a summary and exits non-zero on any FAIL. Source of truth for what
 * each route SHOULD contain is src/config/pages.ts, parsed the same way
 * scripts/prerender.mjs parses it.
 *
 * Usage: node scripts/seo-audit.mjs
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const SITE = 'https://getgross.co.uk'

// ---------------------------------------------------------------------------
// Guard: dist must exist and be prerendered.
// ---------------------------------------------------------------------------
if (!existsSync(DIST) || !existsSync(resolve(DIST, 'index.html'))) {
  console.error('dist/ is missing or not built — run npm run build first')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Parse the page registry the same way prerender.mjs does (no TS loader).
// ---------------------------------------------------------------------------
const pagesTs = readFileSync(resolve(ROOT, 'src/config/pages.ts'), 'utf8')
const SUFFIX = (pagesTs.match(/const SUFFIX = '([^']*)'/) || [])[1] || 'GROSS.'
const strField = (block, name) => {
  const m = block.match(new RegExp(
    `${name}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|\`([^\`]*)\`)`,
  ))
  const raw = m ? (m[1] ?? m[2] ?? m[3]) : ''
  return raw.replace(/\$\{SUFFIX\}/g, SUFFIX).replace(/\\'/g, "'").replace(/\\"/g, '"')
}
const boolField = (block, name) => new RegExp(`${name}:\\s*true`).test(block)
const PAGES = [...pagesTs.matchAll(/\{\s*id:\s*'[^']*'[\s\S]*?indexed:\s*(?:true|false),?\s*\}/g)].map((m) => ({
  id: strField(m[0], 'id'),
  slug: strField(m[0], 'slug'),
  navTitle: strField(m[0], 'navTitle'),
  seoTitle: strField(m[0], 'seoTitle'),
  description: strField(m[0], 'description'),
  indexed: boolField(m[0], 'indexed'),
}))

if (PAGES.length < 10) {
  console.error(`seo-audit: parsed only ${PAGES.length} pages from config/pages.ts — the registry format changed; fix the parser.`)
  process.exit(1)
}

// The clean path a route lives at ('/' for home, '/<slug>' otherwise).
const pathFor = (p) => (p.slug ? `/${p.slug}` : '/')
// The absolute canonical URL under cleanUrls (SITE, no trailing slash).
const urlFor = (p) => (p.slug ? `${SITE}/${p.slug}` : SITE)
// The OG image path prerender emits.
const ogImageFor = (p) => `${SITE}/og/${(p.slug || 'home').replace(/\//g, '-')}.png`
// The file on disk for a route.
const fileFor = (p) => (p.slug ? resolve(DIST, p.slug, 'index.html') : resolve(DIST, 'index.html'))

// Expected top-level JSON-LD @types per route, mirroring prerender.mjs.
function expectedLdTypes(p) {
  if (p.id.startsWith('guide-')) return ['Article', 'FAQPage', 'BreadcrumbList']
  if (p.id.startsWith('ledger-')) return ['Article', 'BreadcrumbList']
  if (!p.slug) return ['WebSite', 'Organization']
  return ['WebApplication', 'BreadcrumbList']
}

// Known route paths (for broken-link detection): '/' + every slug.
const knownPaths = new Set(PAGES.map(pathFor))
const pageByPath = new Map(PAGES.map((p) => [pathFor(p), p]))

// ---------------------------------------------------------------------------
// Tiny HTML helpers (regex — the prerender output is deterministic & flat).
// ---------------------------------------------------------------------------
const attr = (html, tagRe) => {
  const m = html.match(tagRe)
  return m ? m[1] : null
}
// Reverse prerender's esc() so title cross-checks compare like-for-like.
const decode = (s) => (s == null ? s : s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'))
const metaContent = (html, key, kind = 'name') => {
  // Match <meta name/property="key" content="..."> in either attribute order.
  const a = html.match(new RegExp(`<meta[^>]*\\b${kind}="${key}"[^>]*\\bcontent="([^"]*)"`, 'i'))
  if (a) return a[1]
  const b = html.match(new RegExp(`<meta[^>]*\\bcontent="([^"]*)"[^>]*\\b${kind}="${key}"`, 'i'))
  return b ? b[1] : null
}

// Collect internal route-like hrefs from a page (skip assets & absolute URLs).
const ASSET_RE = /\.(css|js|mjs|json|svg|png|jpe?g|webp|gif|ico|xml|txt|woff2?|ttf|eot|map|pdf)$/i
const ASSET_DIR_RE = /^\/(assets|fonts|og|linkedin)\//i
function routeHrefs(html) {
  const out = new Set()
  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    let h = m[1]
    if (!h.startsWith('/') || h.startsWith('//')) continue // internal only
    h = h.split('#')[0].split('?')[0]
    if (h === '') continue
    if (ASSET_DIR_RE.test(h) || ASSET_RE.test(h)) continue
    if (h !== '/') h = h.replace(/\/+$/, '') // strip trailing slash (cleanUrls)
    if (h === '') h = '/'
    out.add(h)
  }
  return out
}

// ---------------------------------------------------------------------------
// Per-route checks.
// ---------------------------------------------------------------------------
const rows = []
const brokenLinks = [] // { from, href }
const inbound = new Map(PAGES.map((p) => [pathFor(p), 0])) // route path -> inbound link count

for (const p of PAGES) {
  const file = fileFor(p)
  const checks = []
  const fail = (msg) => checks.push({ ok: false, msg })
  const pass = () => {}

  if (!existsSync(file)) {
    rows.push({ p, file, checks: [{ ok: false, msg: 'prerendered file missing' }] })
    continue
  }
  const html = readFileSync(file, 'utf8')

  // (1) exactly one <h1>
  const h1n = (html.match(/<h1[\s>]/gi) || []).length
  if (h1n !== 1) fail(`h1 count = ${h1n} (want 1)`)

  // (2) title + meta description present & non-empty
  const title = decode(attr(html, /<title>([\s\S]*?)<\/title>/))
  if (!title || !title.trim()) fail('empty <title>')
  else if (title.trim() !== p.seoTitle.trim()) fail(`title mismatch (got "${title.trim().slice(0, 40)}…")`)
  const desc = metaContent(html, 'description', 'name')
  if (!desc || !desc.trim()) fail('empty meta description')

  // (3) canonical present, correct, no trailing slash (cleanUrls)
  const canon = attr(html, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)
  if (!canon) fail('no canonical')
  else {
    if (canon !== SITE && canon.endsWith('/')) fail(`canonical has trailing slash: ${canon}`)
    if (canon !== urlFor(p)) fail(`canonical = ${canon} (want ${urlFor(p)})`)
  }

  // (4) OG + Twitter card tags present & non-empty
  const ogTitle = metaContent(html, 'og:title', 'property')
  const ogDesc = metaContent(html, 'og:description', 'property')
  const ogImg = metaContent(html, 'og:image', 'property')
  const twCard = metaContent(html, 'twitter:card', 'name')
  if (!ogTitle || !ogTitle.trim()) fail('missing og:title')
  if (!ogDesc || !ogDesc.trim()) fail('missing og:description')
  if (!ogImg || !ogImg.trim()) fail('missing og:image')
  else if (ogImg !== ogImageFor(p)) fail(`og:image = ${ogImg} (want ${ogImageFor(p)})`)
  if (!twCard || !twCard.trim()) fail('missing twitter:card')

  // (5) JSON-LD: present, valid JSON, expected @types
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  if (ldBlocks.length === 0) fail('no JSON-LD')
  else {
    const topTypes = new Set()
    let parseOk = true
    for (const b of ldBlocks) {
      try {
        const parsed = JSON.parse(b[1])
        const arr = Array.isArray(parsed) ? parsed : [parsed]
        for (const node of arr) if (node && node['@type']) topTypes.add(node['@type'])
      } catch (e) {
        parseOk = false
        fail(`JSON-LD invalid JSON: ${e.message}`)
      }
    }
    if (parseOk) {
      for (const want of expectedLdTypes(p)) {
        if (!topTypes.has(want)) fail(`JSON-LD missing @type ${want} (got ${[...topTypes].join(', ') || 'none'})`)
      }
    }
  }

  // (5b) noindex pages must carry a robots noindex meta; indexed must not.
  const robots = metaContent(html, 'robots', 'name')
  const hasNoindex = !!robots && /noindex/i.test(robots)
  if (!p.indexed && !hasNoindex) fail('non-indexed route missing robots noindex')
  if (p.indexed && hasNoindex) fail('indexed route wrongly marked noindex')

  // (6) internal-link mesh — record hrefs & broken links, tally inbound.
  const hrefs = routeHrefs(html)
  for (const h of hrefs) {
    if (!knownPaths.has(h)) {
      brokenLinks.push({ from: pathFor(p), href: h })
    } else if (h !== pathFor(p)) {
      inbound.set(h, (inbound.get(h) || 0) + 1)
    }
  }

  rows.push({ p, file, checks })
  void pass
}

// ---------------------------------------------------------------------------
// (6) Orphan check — every INDEXED route must be linked from another page.
// Non-indexed routes (e.g. The Till) are intentionally unlinked; not orphans.
// ---------------------------------------------------------------------------
const orphans = PAGES.filter((p) => p.indexed && (inbound.get(pathFor(p)) || 0) === 0)

// Attach mesh findings to the relevant rows so they print in the table.
for (const b of brokenLinks) {
  const row = rows.find((r) => pathFor(r.p) === b.from)
  if (row) row.checks.push({ ok: false, msg: `broken internal link → ${b.href}` })
}
for (const p of orphans) {
  const row = rows.find((r) => r.p === p)
  if (row) row.checks.push({ ok: false, msg: 'orphan: no inbound internal links' })
}

// ---------------------------------------------------------------------------
// (7) sitemap.xml — exists, lists exactly the indexed URLs, valid lastmods.
// ---------------------------------------------------------------------------
const sitemapChecks = []
const smPath = resolve(DIST, 'sitemap.xml')
if (!existsSync(smPath)) {
  sitemapChecks.push('sitemap.xml missing')
} else {
  const sm = readFileSync(smPath, 'utf8')
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
  const lastmods = [...sm.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1])
  const expected = PAGES.filter((p) => p.indexed).map(urlFor)
  const locSet = new Set(locs)
  for (const u of expected) if (!locSet.has(u)) sitemapChecks.push(`sitemap missing ${u}`)
  const expSet = new Set(expected)
  for (const u of locs) if (!expSet.has(u)) sitemapChecks.push(`sitemap has unexpected/​non-indexed url ${u}`)
  if (locs.length !== lastmods.length) sitemapChecks.push(`loc/lastmod count mismatch (${locs.length}/${lastmods.length})`)
  for (const d of lastmods) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) sitemapChecks.push(`invalid lastmod: ${d}`)
  }
  // A noindex route must NOT appear.
  for (const p of PAGES.filter((p) => !p.indexed)) {
    if (locSet.has(urlFor(p))) sitemapChecks.push(`noindex route in sitemap: ${urlFor(p)}`)
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n)
let failed = 0
console.log('\nSEO AUDIT — offline, against dist/\n')
console.log(pad('ROUTE', 26) + pad('PATH', 26) + 'RESULT')
console.log('-'.repeat(78))
for (const r of rows) {
  const bad = r.checks.filter((c) => !c.ok)
  if (bad.length) failed++
  const status = bad.length ? `FAIL (${bad.length})` : 'PASS'
  console.log(pad(r.p.id, 26) + pad(pathFor(r.p), 26) + status)
  for (const c of bad) console.log('    - ' + c.msg)
}
console.log('-'.repeat(78))

// Mesh summary
console.log('\nINTERNAL-LINK GRAPH')
console.log(`  routes in registry:     ${PAGES.length}`)
console.log(`  indexed routes:         ${PAGES.filter((p) => p.indexed).length}`)
console.log(`  broken internal links:  ${brokenLinks.length}`)
console.log(`  orphaned indexed routes:${orphans.length ? ' ' + orphans.map(pathFor).join(', ') : ' 0'}`)

// Sitemap summary
console.log('\nSITEMAP')
if (sitemapChecks.length === 0) {
  console.log('  PASS — all indexed URLs present, lastmods valid, no noindex leaks')
} else {
  failed++
  for (const s of sitemapChecks) console.log('  - ' + s)
}

const routesFailed = rows.filter((r) => r.checks.some((c) => !c.ok)).length
console.log('\nSUMMARY')
console.log(`  ${rows.length - routesFailed}/${rows.length} routes clean`)
console.log(`  ${sitemapChecks.length === 0 ? 'sitemap OK' : 'sitemap FAILED'}`)

if (failed > 0) {
  console.log(`\nRESULT: FAIL — ${routesFailed} route(s) with issues${sitemapChecks.length ? ' + sitemap' : ''}\n`)
  process.exit(1)
}
console.log('\nRESULT: PASS — every route is SEO-clean and the link graph is whole\n')
process.exit(0)
