/**
 * Five single-image LinkedIn teaser concepts for GROSS.
 * On-brand: bile / ink / receipt, Anton display, Space Mono numerals, 2px Ink
 * rules, radius 0, sentence case, no emoji, no exclamation marks. One idea each.
 *
 *   node scripts/gen-linkedin.mjs
 * Renders 1200x1200 PNGs to marketing/linkedin/.
 */
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FONTS = resolve(ROOT, 'public/fonts')
const OUT = resolve(ROOT, 'marketing/linkedin')
mkdirSync(OUT, { recursive: true })

const b64 = (p) => readFileSync(p).toString('base64')
const anton = b64(resolve(FONTS, 'Anton-400.woff2'))
const mono = b64(resolve(FONTS, 'SpaceMono-400.woff2'))
const monoB = b64(resolve(FONTS, 'SpaceMono-700.woff2'))
const inter = b64(resolve(FONTS, 'Inter-var.woff2'))

const BILE = '#C6F215'
const INK = '#0A0A0A'
const RECEIPT = '#F7F5EF'
const REDPEN = '#E4002B'

const shell = (bg, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2');}
  @font-face{font-family:'Space Mono';font-weight:400;src:url(data:font/woff2;base64,${mono}) format('woff2');}
  @font-face{font-family:'Space Mono';font-weight:700;src:url(data:font/woff2;base64,${monoB}) format('woff2');}
  @font-face{font-family:'Inter';src:url(data:font/woff2;base64,${inter}) format('woff2');}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:1200px}
  body{background:${bg};color:${INK};font-family:'Inter',sans-serif;position:relative;overflow:hidden}
  .pad{position:absolute;inset:0;padding:88px;display:flex;flex-direction:column;justify-content:space-between}
  .mark{font-family:'Anton';font-size:40px;letter-spacing:-.02em}
  .eyebrow{font-family:'Space Mono';font-size:24px;letter-spacing:.14em;text-transform:uppercase}
  .anton{font-family:'Anton';letter-spacing:-.01em;line-height:.94}
  .mono{font-family:'Space Mono'}
  .url{font-family:'Space Mono';font-weight:700;font-size:30px;letter-spacing:.02em}
  .foot{display:flex;justify-content:space-between;align-items:center}
  .rule{height:4px;background:${INK}}
</style></head><body>${body}</body></html>`

// ── Concept 1 — the provocation (grocery P&L angle) ─────────────────────────
const c1 = shell(BILE, `
  <div class="pad">
    <div class="foot"><span class="mark">GROSS.</span><span class="eyebrow">The P&amp;L</span></div>
    <div>
      <div class="anton" style="font-size:132px">DO YOU ACTUALLY KNOW WHAT THE RETAILER MAKES ON YOU</div>
    </div>
    <div class="foot">
      <span class="mono" style="font-size:28px">Free commercial calculators for FMCG.</span>
      <span class="url">getgross.co.uk</span>
    </div>
  </div>`)

// ── Concept 2 — the receipt (show the product) ──────────────────────────────
const c2 = shell(INK, `
  <div class="pad">
    <div class="foot"><span class="mark" style="color:${BILE}">GROSS.</span><span class="eyebrow" style="color:${BILE}">The receipt</span></div>
    <div style="display:flex;justify-content:center">
      <div style="width:560px;background:${RECEIPT};border:3px solid ${INK};padding:36px 40px;font-family:'Space Mono';color:${INK}">
        <div style="border-top:3px dashed ${INK};margin-bottom:24px"></div>
        <div style="font-size:22px;letter-spacing:.1em;opacity:.6;margin-bottom:18px">GROSS. // THE P&amp;L</div>
        <div style="display:flex;justify-content:space-between;font-size:30px;padding:7px 0"><span>Consumer pays</span><span>£1.50</span></div>
        <div style="display:flex;justify-content:space-between;font-size:30px;padding:7px 0;opacity:.7"><span>less VAT</span><span>−£0.25</span></div>
        <div style="display:flex;justify-content:space-between;font-size:30px;padding:7px 0;opacity:.7"><span>less retailer</span><span>−£0.44</span></div>
        <div style="display:flex;justify-content:space-between;font-size:30px;padding:7px 0;opacity:.7"><span>less cost price</span><span>−£0.32</span></div>
        <div style="border-top:3px solid ${INK};margin:18px 0"></div>
        <div style="background:${INK};color:${BILE};display:flex;justify-content:space-between;align-items:baseline;padding:16px 20px">
          <span style="font-size:26px">You bank</span><span style="font-family:'Anton';font-size:64px">49p</span>
        </div>
        <div style="font-size:22px;margin-top:20px;font-weight:700">On a £1.50 bestseller, you keep 49p. Do the gross maths.</div>
      </div>
    </div>
    <div class="foot"><span class="mono" style="font-size:26px;color:${RECEIPT}">Free. No sign-up.</span><span class="url" style="color:${BILE}">getgross.co.uk</span></div>
  </div>`)

// ── Concept 3 — one blunt truism (maximum simplicity) ───────────────────────
const c3 = shell(INK, `
  <div class="pad">
    <span class="mark" style="color:${BILE}">GROSS.</span>
    <div>
      <div class="anton" style="font-size:150px;color:${RECEIPT}">MARGIN IS AN OPINION.</div>
      <div class="anton" style="font-size:150px;color:${BILE};margin-top:8px">CASH IS A FACT.</div>
    </div>
    <div class="foot">
      <span class="mono" style="font-size:28px;color:${RECEIPT}">Free FMCG calculators. Do the gross maths.</span>
      <span class="url" style="color:${BILE}">getgross.co.uk</span>
    </div>
  </div>`)

// ── Concept 4 — one big number (curiosity gap) ──────────────────────────────
const c4 = shell(BILE, `
  <div class="pad">
    <div class="foot"><span class="mark">GROSS.</span><span class="eyebrow">The Floor</span></div>
    <div style="display:flex;flex-direction:column;align-items:flex-start">
      <div class="eyebrow" style="font-size:29px;letter-spacing:.1em;margin-bottom:40px">The margin that survives a halved forecast</div>
      <div class="anton" style="font-size:360px;line-height:.78">48p</div>
    </div>
    <div class="foot">
      <span class="mono" style="font-size:28px;max-width:22ch">Yours is different. That is the point. Work it out free.</span>
      <span class="url">getgross.co.uk</span>
    </div>
  </div>`)

// ── Concept 5 — the dual-meaning 35% (the Ledger 001 hook) ───────────────────
const c5 = shell(RECEIPT, `
  <div class="pad">
    <div class="foot"><span class="mark">GROSS.</span><span class="eyebrow">The Waterfall</span></div>
    <div>
      <div class="anton" style="font-size:120px">THEIR 35%</div>
      <div class="anton" style="font-size:120px;position:relative;display:inline-block">
        ISN'T YOUR 35%
      </div>
      <div class="rule" style="width:520px;margin-top:26px"></div>
      <div class="mono" style="font-size:30px;margin-top:24px;max-width:26ch">Same number, two different bases. One of you is measuring off the wrong one.</div>
    </div>
    <div class="foot">
      <span class="mono" style="font-size:26px">Free calculators for FMCG brand teams.</span>
      <span class="url">getgross.co.uk</span>
    </div>
  </div>`)

const concepts = [
  ['01-provocation', c1],
  ['02-receipt', c2],
  ['03-truism', c3],
  ['04-big-number', c4],
  ['05-thirty-five', c5],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } })
await page.goto(pathToFileURL(resolve(OUT, '..')).href)
for (const [name, htmlDoc] of concepts) {
  await page.setContent(htmlDoc, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(OUT, `${name}.png`) })
  console.log('linkedin:', name + '.png')
}
await browser.close()
console.log('done —', concepts.length, 'concepts')
