/**
 * THE DICTIONARY — the buyer-speak series. Deadpan translations of the things
 * buyers say. One card per entry, numbered, on-brand (bile / ink, Anton quote,
 * Space Mono translation, barcode, "more translations at getgross.co.uk").
 *
 * Add an entry to ENTRIES and re-run — that's the whole workflow:
 *   node scripts/gen-dictionary.mjs
 * Renders 1200x1200 PNGs to marketing/linkedin/dictionary/.
 */
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FONTS = resolve(ROOT, 'public/fonts')
const OUT = resolve(ROOT, 'marketing/linkedin/dictionary')
mkdirSync(OUT, { recursive: true })

const b64 = (p) => readFileSync(p).toString('base64')
const anton = b64(resolve(FONTS, 'Anton-400.woff2'))
const mono = b64(resolve(FONTS, 'SpaceMono-400.woff2'))
const monoB = b64(resolve(FONTS, 'SpaceMono-700.woff2'))

const BILE = '#C6F215'
const INK = '#0A0A0A'

// The series. `phrase` renders in quotes (Anton); `translation` deadpan below.
// `size` optional override for a long phrase.
const ENTRIES = [
  {
    n: 2,
    slug: 'investing-in-price',
    phrase: 'we’re investing in price',
    translation: 'you’re investing in our price.',
    size: 128,
  },
]

// EAN-style bar widths (ink bars on bile), same rhythm as the site's Barcode.
const BARS = [
  2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2, 4, 1, 3, 1,
  2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4,
]
const barcode = BARS.map((w) => `<div style="width:${w * 3}px;background:${INK}"></div>`).join('')

function card({ n, phrase, translation, size = 128 }) {
  const no = String(n).padStart(2, '0')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2');}
    @font-face{font-family:'Space Mono';font-weight:400;src:url(data:font/woff2;base64,${mono}) format('woff2');}
    @font-face{font-family:'Space Mono';font-weight:700;src:url(data:font/woff2;base64,${monoB}) format('woff2');}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:1200px}
    body{background:${BILE};color:${INK}}
    .pad{position:absolute;inset:0;padding:88px;display:flex;flex-direction:column;justify-content:space-between}
    .row{display:flex;justify-content:space-between;align-items:baseline}
    .mark{font-family:'Anton';font-size:40px;letter-spacing:-.02em}
    .eyebrow{font-family:'Space Mono';font-weight:700;font-size:26px;letter-spacing:.14em}
    .quote{font-family:'Anton';font-size:${size}px;line-height:.94;letter-spacing:-.01em}
    .trans{font-family:'Space Mono';font-weight:700;font-size:46px;margin-top:36px}
    .barcode{display:flex;gap:3px;align-items:stretch;height:60px;margin-bottom:22px}
    .foot{font-family:'Space Mono';font-weight:700;font-size:30px;letter-spacing:.02em}
  </style></head><body>
    <div class="pad">
      <div class="row"><span class="mark">GROSS.</span><span class="eyebrow">THE DICTIONARY / ${no}</span></div>
      <div>
        <div class="quote">‘${phrase.toUpperCase()}’</div>
        <div class="trans">— ${translation}</div>
      </div>
      <div>
        <div class="barcode">${barcode}</div>
        <div class="foot">more translations at getgross.co.uk</div>
      </div>
    </div>
  </body></html>`
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } })
await page.goto(pathToFileURL(resolve(OUT, '..')).href)
for (const entry of ENTRIES) {
  await page.setContent(card(entry), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const name = `${String(entry.n).padStart(2, '0')}-${entry.slug}`
  await page.screenshot({ path: resolve(OUT, `${name}.png`) })
  console.log('dictionary:', name + '.png')
}
await browser.close()
console.log('done —', ENTRIES.length, 'card(s)')
