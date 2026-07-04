/**
 * Post-build: give every route its own static HTML so social scrapers and
 * search engines see the correct <title>, description, OG card — and real,
 * crawlable page content with internal links (React replaces it on mount).
 * Also emits sitemap.xml (with lastmod) and JSON-LD structured data.
 * Runs after `vite build` (see package.json). FAILS LOUDLY if the page
 * registry can't be parsed — a silent skip would quietly wreck SEO.
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const SITE = 'https://getgross.co.uk'

// Parse the page registry (avoid a TS loader in the build step).
const pagesTs = readFileSync(resolve(ROOT, 'src/config/pages.ts'), 'utf8')
const SUFFIX = (pagesTs.match(/const SUFFIX = '([^']*)'/) || [])[1] || 'GROSS.'
const str = (block, name) => {
  // Handles single-quoted, double-quoted and backtick (template) string values.
  const m = block.match(new RegExp(
    `${name}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|\`([^\`]*)\`)`,
  ))
  const raw = m ? (m[1] ?? m[2] ?? m[3]) : ''
  return raw.replace(/\$\{SUFFIX\}/g, SUFFIX).replace(/\\'/g, "'").replace(/\\"/g, '"')
}
const bool = (block, name) => new RegExp(`${name}:\\s*true`).test(block)
const PAGES = [...pagesTs.matchAll(/\{\s*id:\s*'[^']*'[\s\S]*?indexed:\s*(?:true|false),?\s*\}/g)].map((m) => ({
  id: str(m[0], 'id'),
  slug: str(m[0], 'slug'),
  navTitle: str(m[0], 'navTitle'),
  seoTitle: str(m[0], 'seoTitle'),
  description: str(m[0], 'description'),
  intro: str(m[0], 'intro'),
  indexed: bool(m[0], 'indexed'),
}))

// Fail the build if the registry parse looks wrong — never ship broken SEO silently.
if (PAGES.length < 10) {
  throw new Error(`prerender: parsed only ${PAGES.length} pages from config/pages.ts — the registry format changed; fix the parser before shipping.`)
}
for (const p of PAGES) {
  if (!p.seoTitle || !p.description) {
    throw new Error(`prerender: page '${p.id}' is missing seoTitle or description — refusing to ship empty meta.`)
  }
}

const html = readFileSync(resolve(DIST, 'index.html'), 'utf8')
if (!html.includes('<div id="root">')) throw new Error('prerender: dist/index.html has no #root — build output changed.')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// lastmod = last commit date (deploy-accurate without faking freshness)
let LASTMOD = new Date().toISOString().slice(0, 10)
try {
  LASTMOD = execSync('git log -1 --format=%cd --date=short', { cwd: ROOT }).toString().trim() || LASTMOD
} catch { /* not a git checkout (fine) */ }

/** JSON-LD: the site + org on home; each tool as a free WebApplication. */
function jsonLd(page) {
  const url = page.slug ? `${SITE}/${page.slug}` : SITE
  if (!page.slug) {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'GROSS.',
        url: SITE,
        description: page.description,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'GROSS.',
        url: SITE,
        logo: `${SITE}/og/home.png`,
      },
    ]
  }
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: page.navTitle,
      url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: page.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
      publisher: { '@type': 'Organization', name: 'GROSS.', url: SITE },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GROSS.', item: SITE },
        { '@type': 'ListItem', position: 2, name: page.navTitle, item: url },
      ],
    },
  ]
}

/**
 * Static, crawlable body content injected INSIDE #root — React replaces it on
 * mount, so users never notice, but a JS-blind crawler sees a real page: the
 * H1, the description, and links to every other tool (the internal-link mesh).
 * Inline styles only (the app CSS is class-scanned and can't be relied on here).
 */
function staticBody(page) {
  const others = PAGES.filter((p) => p.indexed && p.slug !== page.slug)
  const links = others
    .map((p) => `<li style="margin:4px 0"><a href="${p.slug ? `/${p.slug}` : '/'}" style="color:#0A0A0A">${esc(p.navTitle)}</a> — ${esc(p.intro || p.description).slice(0, 110)}</li>`)
    .join('\n        ')
  const h1 = page.slug ? esc(page.navTitle) : 'GROSS.'
  return `
    <div style="font-family:ui-monospace,monospace;background:#F7F5EF;color:#0A0A0A;min-height:100vh;padding:32px;max-width:820px">
      <p style="font-weight:700;letter-spacing:.04em">GROSS. — free commercial calculators for UK FMCG brand teams</p>
      <h1 style="font-size:2.4em;line-height:1;margin:16px 0 8px">${h1}</h1>
      <p>${esc(page.description)}</p>
      ${page.intro ? `<p>${esc(page.intro)}</p>` : ''}
      <h2 style="font-size:1.1em;margin-top:24px">The other calculators</h2>
      <ul style="padding-left:18px">
        ${links}
      </ul>
      <p style="opacity:.6;font-size:.85em;margin-top:24px">Free, no sign-up. The maths is checked; the defaults are dated and sourced on <a href="/the-rate-card" style="color:#0A0A0A">The Rate Card</a>. VAT number: not applicable. This is a website.</p>
    </div>`
}

function rewrite(base, page) {
  const url = page.slug ? `${SITE}/${page.slug}` : SITE
  const img = `${SITE}/og/${page.slug || 'home'}.png`
  const t = esc(page.seoTitle)
  const d = esc(page.description)
  const ld = `<script type="application/ld+json">${JSON.stringify(jsonLd(page))}</script>`
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
    .replace('</head>', `${ld}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${staticBody(page)}</div>`)
  return out
}

let written = 0
for (const page of PAGES) {
  const out = rewrite(html, page)
  if (page.slug) {
    const dir = resolve(DIST, page.slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, 'index.html'), out)
  } else {
    // Home gets the static body + JSON-LD too
    writeFileSync(resolve(DIST, 'index.html'), out)
  }
  written++
}

// sitemap.xml with lastmod
const urls = PAGES.filter((p) => p.indexed).map((p) => {
  const loc = p.slug ? `${SITE}/${p.slug}` : SITE
  return `  <url><loc>${loc}</loc><lastmod>${LASTMOD}</lastmod></url>`
}).join('\n')
writeFileSync(resolve(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)

console.log(`prerender: ${written} routes (static body + JSON-LD) + sitemap (${PAGES.filter((p) => p.indexed).length} urls, lastmod ${LASTMOD})`)
