/**
 * Generate the static OG share cards — one 1200×630 PNG per routable page.
 *
 * These are brand-static (they don't depend on a user's model), so we render
 * them once with the pre-installed Chromium and commit the PNGs. The Vercel
 * build never needs a browser. Re-run locally if the brand or copy changes:
 *   node scripts/gen-og.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FONTS = resolve(ROOT, 'public/fonts')
const OUT = resolve(ROOT, 'public/og')

// The page registry is TS; pull the fields we need without a TS loader.
const pagesTs = readFileSync(resolve(ROOT, 'src/config/pages.ts'), 'utf8')
function field(block, name) {
  const m = block.match(new RegExp(`${name}:\\s*'((?:[^'\\\\]|\\\\.)*)'`))
  return m ? m[1].replace(/\\'/g, "'") : ''
}
// Split on each object literal that has an id/slug/navTitle
const entries = [...pagesTs.matchAll(/\{\s*id:\s*'[^']*'[\s\S]*?indexed:\s*(?:true|false),?\s*\}/g)].map((m) => {
  const b = m[0]
  return {
    slug: field(b, 'slug') || 'home',
    navTitle: field(b, 'navTitle'),
    group: field(b, 'seoTitle'),
  }
})

const b64 = (p) => readFileSync(p).toString('base64')
const anton = b64(resolve(FONTS, 'Anton-400.woff2'))
const mono = b64(resolve(FONTS, 'SpaceMono-400.woff2'))

// Short deadpan taglines per slug (kept here so the card copy is card-shaped)
const TAGLINE = {
  home: 'Do the gross maths.',
  'the-shelf': 'Your range, defined once.',
  'the-pnl': 'What the retailer really makes on you.',
  'the-waterfall': 'Every deduction between shelf and bank.',
  'the-floor': 'The lowest price that still clears margin.',
  'the-listing': 'Model the range review first.',
  'the-payback': 'How much volume pays the promo back.',
  'the-stock-answer': 'What to order. When. Before you run out.',
  'the-amazon-cut': 'What FBA takes before you see a penny.',
  'the-tiktok-cut': 'What TikTok takes on every sale.',
  'the-line-up': 'Every channel, side by side.',
  'the-range': 'The whole portfolio on one till roll.',
  'the-rate-card': 'Every fee, dated and sourced.',
}

function cardHtml({ slug, navTitle }) {
  const isHome = slug === 'home'
  const wordmark = isHome ? 'GROSS.' : navTitle
  const tagline = TAGLINE[slug] || ''
  const bg = isHome ? '#C6F215' : '#F7F5EF'
  const bar = isHome ? '#0A0A0A' : '#C6F215'
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2');}
    @font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${mono}) format('woff2');}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    body{background:${bg};color:#0A0A0A;font-family:'Space Mono',monospace;
      border:16px solid #0A0A0A;display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;font-size:26px;letter-spacing:.08em}
    .mark{font-family:'Anton';font-size:120px;line-height:.9;letter-spacing:-.03em;margin-top:40px}
    .tag{font-size:34px;margin-top:26px;max-width:20ch}
    .foot{display:flex;justify-content:space-between;align-items:center;font-size:24px}
    .bar{height:34px;background:${bar};border:3px solid #0A0A0A;flex:1;margin-right:28px}
  </style></head><body>
    <div class="top"><span>GROSS.</span><span>${isHome ? 'FMCG COMMERCIAL CALCULATORS' : 'DO THE GROSS MATHS'}</span></div>
    <div><div class="mark">${wordmark}</div><div class="tag">${tagline}</div></div>
    <div class="foot"><div class="bar"></div><span>getgross.co.uk</span></div>
  </body></html>`
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const entry of entries) {
  await page.goto(pathToFileURL(resolve(OUT, '..')).href) // set a base
  await page.setContent(cardHtml(entry), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(OUT, `${entry.slug}.png`) })
  console.log('og:', entry.slug + '.png')
}
await browser.close()
console.log('done —', entries.length, 'cards')
