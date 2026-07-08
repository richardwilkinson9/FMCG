/**
 * Pinned-post concepts, round three — the round-two directions, simplified to
 * one element each.  node scripts/gen-pinned-v3.mjs → marketing/linkedin/pinned/
 */
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FONTS = resolve(ROOT, 'public/fonts')
const OUT = resolve(ROOT, 'marketing/linkedin/pinned')
mkdirSync(OUT, { recursive: true })

const b64 = (p) => readFileSync(p).toString('base64')
const anton = b64(resolve(FONTS, 'Anton-400.woff2'))
const mono = b64(resolve(FONTS, 'SpaceMono-400.woff2'))
const monoB = b64(resolve(FONTS, 'SpaceMono-700.woff2'))

const BILE = '#C6F215'
const INK = '#0A0A0A'
const RECEIPT = '#F7F5EF'

const shell = (bg, body, color = INK) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2');}
  @font-face{font-family:'Space Mono';font-weight:400;src:url(data:font/woff2;base64,${mono}) format('woff2');}
  @font-face{font-family:'Space Mono';font-weight:700;src:url(data:font/woff2;base64,${monoB}) format('woff2');}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:1200px}
  body{background:${bg};color:${color};font-family:'Space Mono',monospace}
  .pad{position:absolute;inset:0;padding:84px;display:flex;flex-direction:column;justify-content:space-between}
  .row{display:flex;justify-content:space-between;align-items:baseline}
  .mark{font-family:'Anton';font-size:40px;letter-spacing:-.02em}
  .anton{font-family:'Anton';line-height:.9;letter-spacing:-.01em}
  .url{font-weight:700;font-size:28px}
</style></head><body>${body}</body></html>`

// 10 — MARGIN ≠ MARKUP, nothing else
const c10 = shell(BILE, `
  <div class="pad">
    <span class="mark">GROSS.</span>
    <div class="anton" style="font-size:210px">MARGIN<br>&ne;<br>MARKUP</div>
    <div class="row"><span style="font-size:26px">If you know, you know. If you don't: free.</span><span class="url">getgross.co.uk</span></div>
  </div>`)

// 11 — THE BUSINESS MODEL: one number
const c11 = shell(INK, `
  <div class="pad">
    <span class="mark" style="color:${BILE}">GROSS.</span>
    <div>
      <div style="font-weight:700;font-size:28px;letter-spacing:.14em;color:${RECEIPT};margin-bottom:24px">THE BUSINESS MODEL</div>
      <div class="anton" style="font-size:340px;color:${BILE};line-height:.8">&pound;0.00</div>
    </div>
    <div class="row"><span style="font-size:26px;color:${RECEIPT}">That's it. That's the model.</span><span class="url" style="color:${BILE}">getgross.co.uk</span></div>
  </div>`)

// 12 — THE RECEIPT: one line item, one total
const c12 = shell(INK, `
  <div class="pad">
    <span class="mark" style="color:${BILE}">GROSS.</span>
    <div style="display:flex;justify-content:center">
      <div style="width:560px;background:${RECEIPT};border:3px solid ${INK};padding:34px 38px;color:${INK}">
        <div style="border-top:3px dashed ${INK};margin-bottom:24px"></div>
        <div style="display:flex;justify-content:space-between;font-size:30px;padding:8px 0"><span>Every calculator</span><span>&pound;0.00</span></div>
        <div style="display:flex;justify-content:space-between;font-size:30px;padding:8px 0"><span>The Excel model</span><span>&pound;0.00</span></div>
        <div style="border-top:3px solid ${INK};margin:20px 0"></div>
        <div style="background:${INK};color:${BILE};display:flex;justify-content:space-between;align-items:baseline;padding:18px 22px">
          <span style="font-size:28px">TOTAL</span><span style="font-family:'Anton';font-size:72px">&pound;0.00</span>
        </div>
        <div style="border-top:3px dashed ${INK};margin-top:24px"></div>
      </div>
    </div>
    <div class="row"><span style="font-size:26px;color:${RECEIPT}">Do the gross maths.</span><span class="url" style="color:${BILE}">getgross.co.uk</span></div>
  </div>`)

// 13 — THE SHELF: names only
const c13 = shell(BILE, `
  <div class="pad">
    <span class="mark">GROSS.</span>
    <div class="anton" style="font-size:74px;line-height:1.18">
      THE P&amp;L<br>THE WATERFALL<br>THE FLOOR<br>THE LISTING<br>THE PAYBACK<br>THE WAIT<br>THE AMAZON CUT
    </div>
    <div class="row"><span style="font-size:26px">Twelve calculators. All free. All blunt.</span><span class="url">getgross.co.uk</span></div>
  </div>`)

const concepts = [
  ['10-margin-markup-simple', c10],
  ['11-business-model-simple', c11],
  ['12-receipt-simple', c12],
  ['13-shelf-simple', c13],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } })
await page.goto(pathToFileURL(OUT).href)
for (const [name, htmlDoc] of concepts) {
  await page.setContent(htmlDoc, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(OUT, `${name}.png`) })
  console.log('pinned:', name + '.png')
}
await browser.close()
console.log('done —', concepts.length)
