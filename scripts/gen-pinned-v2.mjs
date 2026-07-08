/**
 * Pinned-post concepts, round two — the image shows what GROSS does (or the
 * joke), not the anonymity; the post copy carries that.
 *   node scripts/gen-pinned-v2.mjs → marketing/linkedin/pinned/
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
  .anton{font-family:'Anton';line-height:.92;letter-spacing:-.01em}
  .url{font-weight:700;font-size:28px}
</style></head><body>${body}</body></html>`

// 06 — MARGIN ≠ MARKUP: the correction, huge, with the working shown small
const c6 = shell(BILE, `
  <div class="pad">
    <div class="row"><span class="mark">GROSS.</span><span style="font-weight:700;font-size:24px;letter-spacing:.14em">THE DIFFERENCE</span></div>
    <div>
      <div class="anton" style="font-size:170px">MARGIN</div>
      <div class="anton" style="font-size:170px">&ne; MARKUP</div>
      <div style="display:flex;gap:0;margin-top:44px;border:3px solid ${INK}">
        <div style="flex:1;padding:20px 26px;border-right:3px solid ${INK}">
          <div style="font-size:17px;letter-spacing:.1em;opacity:.65">MARGIN</div>
          <div style="font-size:28px;font-weight:700;margin-top:6px">35% of the SELLING price</div>
        </div>
        <div style="flex:1;padding:20px 26px;background:${INK};color:${BILE}">
          <div style="font-size:17px;letter-spacing:.1em;opacity:.8">THE SAME GAP, AS MARKUP</div>
          <div style="font-size:28px;font-weight:700;margin-top:6px">53.8% of the BUYING price</div>
        </div>
      </div>
      <div style="font-size:21px;margin-top:16px">Same pennies. Different ruler. Expensive to confuse.</div>
    </div>
    <div class="row"><span style="font-size:26px;max-width:24ch">Free calculators that know which is which.</span><span class="url">getgross.co.uk</span></div>
  </div>`)

// 07 — THE £0.00 RECEIPT: everything GROSS does, priced honestly
const c7 = shell(INK, `
  <div class="pad">
    <div class="row"><span class="mark" style="color:${BILE}">GROSS.</span><span style="color:${BILE};font-weight:700;font-size:24px;letter-spacing:.14em">THE FULL SHOP</span></div>
    <div style="display:flex;justify-content:center">
      <div style="width:600px;background:${RECEIPT};border:3px solid ${INK};padding:30px 36px;color:${INK}">
        <div style="border-top:3px dashed ${INK};margin-bottom:18px"></div>
        <div style="font-size:20px;letter-spacing:.1em;opacity:.6;margin-bottom:14px">GROSS. // EVERYTHING WE SELL</div>
        ${[
          ['Retailer margin, decoded', '£0.00'],
          ['Gross-to-net, all of it', '£0.00'],
          ['Promo payback, honestly', '£0.00'],
          ['Cash flow on real terms', '£0.00'],
          ['Amazon’s cut, added up', '£0.00'],
          ['Stock plan, promo-aware', '£0.00'],
          ['The live Excel model', '£0.00'],
        ].map(([l, v]) => `<div style="display:flex;justify-content:space-between;font-size:25px;padding:5px 0"><span>${l}</span><span>${v}</span></div>`).join('')}
        <div style="border-top:3px solid ${INK};margin:14px 0"></div>
        <div style="background:${INK};color:${BILE};display:flex;justify-content:space-between;align-items:baseline;padding:14px 18px">
          <span style="font-size:24px">TOTAL</span><span style="font-family:'Anton';font-size:54px">£0.00</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:22px;padding-top:14px;font-weight:700"><span>CHANGE DUE</span><span>your margin, back</span></div>
      </div>
    </div>
    <div class="row"><span style="font-size:26px;color:${RECEIPT}">No sign-up. No catch. No revenue, frankly.</span><span class="url" style="color:${BILE}">getgross.co.uk</span></div>
  </div>`)

// 08 — THE SHELF: twelve tools as shelf-edge SKU labels
const skuCard = (name, sub) => `
  <div style="border:3px solid ${INK};background:${RECEIPT};padding:16px 18px;display:flex;flex-direction:column;justify-content:space-between;min-height:150px">
    <div>
      <div style="font-family:'Anton';font-size:30px;letter-spacing:-.01em">${name}</div>
      <div style="font-size:15px;margin-top:5px;opacity:.85">${sub}</div>
    </div>
    <div style="font-size:13px;letter-spacing:.08em;border-top:2px solid ${INK};padding-top:7px;margin-top:9px;display:flex;justify-content:space-between"><span>FREE</span><span>&pound;0.00</span></div>
  </div>`
const c8 = shell(BILE, `
  <div class="pad">
    <div class="row"><span class="mark">GROSS.</span><span style="font-weight:700;font-size:24px;letter-spacing:.14em">THE RANGE</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
      ${skuCard('THE P&amp;L', 'what the retailer makes on you')}
      ${skuCard('THE WATERFALL', 'shelf price to your bank')}
      ${skuCard('THE FLOOR', 'the cost price ceiling')}
      ${skuCard('THE LISTING', 'the range review, modelled')}
      ${skuCard('THE PAYBACK', 'does the promo pay')}
      ${skuCard('THE WAIT', 'when the cash lands')}
      ${skuCard('THE AMAZON CUT', 'what Jeff takes')}
      ${skuCard('THE TIKTOK CUT', 'what the algorithm takes')}
      ${skuCard('THE STOCK ANSWER', 'order before you run out')}
    </div>
    <div class="row"><span style="font-size:26px;max-width:26ch">Nine of the twelve. The other three are also &pound;0.00.</span><span class="url">getgross.co.uk</span></div>
  </div>`)

// 09 — THE BUSINESS MODEL: the flowchart with no revenue in it
const c9 = shell(RECEIPT, `
  <div class="pad">
    <div class="row"><span class="mark">GROSS.</span><span style="font-weight:700;font-size:24px;letter-spacing:.14em">THE BUSINESS MODEL</span></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:0">
      <div style="border:3px solid ${INK};background:${RECEIPT};padding:20px 46px;font-size:26px;font-weight:700">You do the gross maths</div>
      <div style="width:3px;height:44px;background:${INK}"></div>
      <div style="border:3px solid ${INK};background:${RECEIPT};padding:20px 46px;font-size:26px;font-weight:700">You keep more of your margin</div>
      <div style="width:3px;height:44px;background:${INK}"></div>
      <div style="border:3px solid ${INK};background:${INK};padding:22px 46px;text-align:center">
        <div style="font-family:'Anton';font-size:44px;color:${BILE}">WE MAKE &pound;0.00</div>
        <div style="font-size:17px;color:${RECEIPT};margin-top:6px">(this is the whole model)</div>
      </div>
    </div>
    <div class="row"><span style="font-size:26px;max-width:26ch">Free calculators for UK FMCG brand teams.</span><span class="url">getgross.co.uk</span></div>
  </div>`)

const concepts = [
  ['06-margin-not-markup', c6],
  ['07-the-full-shop', c7],
  ['08-the-shelf', c8],
  ['09-the-business-model', c9],
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
console.log('done —', concepts.length, 'concepts')
