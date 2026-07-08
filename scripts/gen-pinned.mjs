/**
 * Pinned-post image concepts — "nobody runs GROSS." (the anonymous insider).
 * Four directions, brand rules held: no photography, 2px ink borders, radius 0,
 * red-pen negatives only, max one reduced-yellow element, no emoji.
 *   node scripts/gen-pinned.mjs → marketing/linkedin/pinned/
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
const REDUCED = '#FFD400'

const BARS = [2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,2,1,2,4,1,3,1,2,1,4,2,1,3,1,2,4,1]
const barcode = (color = INK, h = 54) =>
  `<div style="display:flex;gap:3px;height:${h}px">${BARS.map((w) => `<div style="width:${w * 3}px;background:${color}"></div>`).join('')}</div>`

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

// 1 — THE STAFF BADGE: an ID card with everything redacted
const c1 = shell(BILE, `
  <div class="pad">
    <div class="row"><span class="mark">GROSS.</span><span style="font-weight:700;font-size:24px;letter-spacing:.14em">STAFF RECORD</span></div>
    <div style="display:flex;justify-content:center">
      <div style="width:640px;background:${RECEIPT};border:3px solid ${INK};padding:0">
        <div style="background:${INK};color:${BILE};font-family:'Anton';font-size:34px;padding:16px 26px">STAFF ID — HEAD OFFICE</div>
        <div style="display:flex;gap:26px;padding:28px 26px">
          <div style="width:170px;height:200px;border:3px solid ${INK};background:${INK};display:flex;align-items:center;justify-content:center">
            <span style="color:${BILE};font-family:'Anton';font-size:70px">?</span>
          </div>
          <div style="flex:1;font-size:22px;line-height:2.1">
            <div>NAME: <span style="background:${INK};color:${INK}">██████████</span></div>
            <div>ROLE: COMMERCIAL DIRECTOR</div>
            <div>EMPLOYER: <span style="background:${INK};color:${INK}">████████</span></div>
            <div>SIDE: BOTH</div>
          </div>
        </div>
        <div style="border-top:3px solid ${INK};padding:16px 26px;font-size:19px;font-weight:700">
          Builds free calculators after hours. Would like to keep the badge.
        </div>
      </div>
    </div>
    <div class="row"><span style="font-size:27px;max-width:24ch">Nobody runs GROSS. It appears to run itself.</span><span class="url">getgross.co.uk</span></div>
  </div>`)

// 2 — THE UNSIGNED RECEIPT: the manifesto as line items
const c2 = shell(INK, `
  <div class="pad">
    <div class="row"><span class="mark" style="color:${BILE}">GROSS.</span><span style="color:${BILE};font-weight:700;font-size:24px;letter-spacing:.14em">THE PAPERWORK</span></div>
    <div style="display:flex;justify-content:center">
      <div style="width:560px;background:${RECEIPT};border:3px solid ${INK};padding:34px 38px;color:${INK}">
        <div style="border-top:3px dashed ${INK};margin-bottom:22px"></div>
        <div style="font-size:21px;letter-spacing:.1em;opacity:.6;margin-bottom:16px">GROSS. // WHO RUNS THIS</div>
        <div style="display:flex;justify-content:space-between;font-size:27px;padding:7px 0"><span>The maths</span><span>checked</span></div>
        <div style="display:flex;justify-content:space-between;font-size:27px;padding:7px 0"><span>The fees</span><span>dated</span></div>
        <div style="display:flex;justify-content:space-between;font-size:27px;padding:7px 0"><span>The tools</span><span>&pound;0.00</span></div>
        <div style="display:flex;justify-content:space-between;font-size:27px;padding:7px 0"><span>The name</span><span style="font-weight:700">withheld</span></div>
        <div style="border-top:3px solid ${INK};margin:18px 0"></div>
        <div style="background:${INK};color:${BILE};display:flex;justify-content:space-between;align-items:baseline;padding:16px 20px">
          <span style="font-size:24px">CASHIER</span><span style="font-family:'Anton';font-size:52px">NOBODY</span>
        </div>
        <div style="font-size:20px;margin-top:20px;font-weight:700">Built by a serving commercial director. That's all you get.</div>
      </div>
    </div>
    <div class="row"><span style="font-size:26px;color:${RECEIPT}">Free. No sign-up. No byline.</span><span class="url" style="color:${BILE}">getgross.co.uk</span></div>
  </div>`)

// 3 — TYPE ONLY: the flat statement
const c3 = shell(INK, `
  <div class="pad">
    <span class="mark" style="color:${BILE}">GROSS.</span>
    <div>
      <div class="anton" style="font-size:150px;color:${RECEIPT}">NOBODY<br>RUNS GROSS.</div>
      <div style="font-size:30px;color:${BILE};margin-top:30px;font-weight:700">It appears to run itself.</div>
    </div>
    <div class="row">
      <span style="font-size:27px;color:${RECEIPT};max-width:30ch">Free FMCG calculators, maintained by a serving commercial director who'd like to keep their badge.</span>
      <span class="url" style="color:${BILE}">getgross.co.uk</span>
    </div>
  </div>`)

// 4 — THE ORG CHART: one redacted box, one rat
const c4 = shell(RECEIPT, `
  <div class="pad">
    <div class="row"><span class="mark">GROSS.</span><span style="font-weight:700;font-size:24px;letter-spacing:.14em">THE ORG CHART</span></div>
    <div style="display:flex;flex-direction:column;align-items:center">
      <div style="border:3px solid ${INK};background:${BILE};padding:22px 44px;text-align:center">
        <div style="font-size:18px;letter-spacing:.1em;opacity:.65">FOUNDER, CEO, ENTIRE STAFF</div>
        <div style="font-family:'Anton';font-size:52px;margin-top:6px"><span style="background:${INK};color:${INK}">████████████</span></div>
        <div style="font-size:17px;margin-top:8px">(a serving commercial director)</div>
      </div>
      <div style="width:3px;height:64px;background:${INK}"></div>
      <div style="border:3px solid ${INK};background:${INK};padding:18px 40px;text-align:center">
        <div style="font-size:16px;letter-spacing:.1em;color:${BILE}">HEAD OF MORALE</div>
        <div style="font-family:'Anton';font-size:40px;color:${BILE};margin-top:4px">THE RAT</div>
        <div style="font-size:15px;margin-top:6px;color:${RECEIPT}">(not real)</div>
      </div>
    </div>
    <div class="row">
      <span style="font-size:27px;max-width:26ch">Nobody runs GROSS. The maths runs the maths.</span>
      <span class="url">getgross.co.uk</span>
    </div>
  </div>`)

// 5 — THE NAME BADGE STICKER: "HELLO my name is" gone wrong (reduced yellow, its one appearance)
const c5 = shell(INK, `
  <div class="pad">
    <div class="row"><span class="mark" style="color:${BILE}">GROSS.</span><span style="color:${BILE};font-weight:700;font-size:24px;letter-spacing:.14em">INTRODUCTIONS</span></div>
    <div style="display:flex;justify-content:center">
      <div style="width:620px;border:3px solid ${INK};background:${REDUCED};transform:rotate(-2deg)">
        <div style="background:${INK};color:${RECEIPT};text-align:center;font-weight:700;font-size:26px;letter-spacing:.14em;padding:14px">HELLO — I RUN GROSS.</div>
        <div style="background:${RECEIPT};margin:26px;border:3px solid ${INK};min-height:220px;display:flex;align-items:center;justify-content:center">
          <span style="font-family:'Anton';font-size:110px;color:${INK}">NO.</span>
        </div>
        <div style="text-align:center;font-size:19px;padding:0 26px 24px;color:${INK};font-weight:700">a serving commercial director declined to fill this in</div>
      </div>
    </div>
    <div class="row"><span style="font-size:26px;color:${RECEIPT};max-width:26ch">The tools are free. The name stays out of it.</span><span class="url" style="color:${BILE}">getgross.co.uk</span></div>
  </div>`)

const concepts = [
  ['01-staff-badge', c1],
  ['02-unsigned-receipt', c2],
  ['03-type-only', c3],
  ['04-org-chart', c4],
  ['05-name-badge', c5],
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
