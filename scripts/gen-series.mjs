/**
 * The other LinkedIn series — one-line-of-copy workflows, like the Dictionary:
 *
 *  THE NUMBER   — one huge figure + a source line (curiosity gap)
 *  THE RECEIPT  — a mini till-roll with real maths (product demonstration)
 *  THE BAD DAY  — base year vs bad year, side by side (stress test)
 *
 * Add an entry to the relevant array and re-run:
 *   node scripts/gen-series.mjs
 * Renders 1200x1200 + 1080x1350 portrait to marketing/linkedin/<series>/.
 */
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FONTS = resolve(ROOT, 'public/fonts')
const OUT = resolve(ROOT, 'marketing/linkedin')

const b64 = (p) => readFileSync(p).toString('base64')
const anton = b64(resolve(FONTS, 'Anton-400.woff2'))
const mono = b64(resolve(FONTS, 'SpaceMono-400.woff2'))
const monoB = b64(resolve(FONTS, 'SpaceMono-700.woff2'))

const BILE = '#C6F215'
const INK = '#0A0A0A'
const RECEIPT = '#F7F5EF'
const REDPEN = '#E4002B'

// ── THE NUMBER ───────────────────────────────────────────────────────────────
const NUMBERS = [
  {
    n: 1,
    slug: 'forty-eight-p',
    eyebrow: 'The margin that survives a halved forecast',
    value: '48p',
    footer: 'Yours is different. That is the point. Work it out free.',
  },
]

// ── THE RECEIPT ──────────────────────────────────────────────────────────────
// lines: [label, value, dim?]; answer: [label, value]; verdict below.
const RECEIPTS = [
  {
    n: 1,
    slug: 'you-bank-49p',
    tool: 'THE P&L',
    lines: [
      ['Consumer pays', '£1.50'],
      ['less VAT', '−£0.25', true],
      ['less retailer', '−£0.44', true],
      ['less cost price', '−£0.32', true],
    ],
    answer: ['You bank', '49p'],
    verdict: 'On a £1.50 bestseller, you keep 49p. Do the gross maths.',
  },
]

// ── THE BAD DAY ──────────────────────────────────────────────────────────────
const BADDAYS = [
  {
    n: 1,
    slug: 'the-plan-vs-the-year',
    left: { title: 'THE PLAN', rows: [['ROS', '4/store/wk'], ['Margin, year', '£25,000']] },
    right: { title: 'THE YEAR', rows: [['ROS', '2/store/wk'], ['Margin, year', '£0']], red: true },
    footer: 'Model the bad year before you sign the good one. Free.',
  },
]

const head = (w, h, bg, color = INK) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2');}
  @font-face{font-family:'Space Mono';font-weight:400;src:url(data:font/woff2;base64,${mono}) format('woff2');}
  @font-face{font-family:'Space Mono';font-weight:700;src:url(data:font/woff2;base64,${monoB}) format('woff2');}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px}
  body{background:${bg};color:${color};font-family:'Space Mono',monospace}
  .pad{position:absolute;inset:0;padding:80px;display:flex;flex-direction:column;justify-content:space-between}
  .row{display:flex;justify-content:space-between;align-items:baseline}
  .mark{font-family:'Anton';font-size:38px;letter-spacing:-.02em}
  .eyebrow{font-weight:700;font-size:24px;letter-spacing:.14em}
  .anton{font-family:'Anton';line-height:.9;letter-spacing:-.01em}
  .url{font-weight:700;font-size:28px}
</style></head><body>`

function numberCard(e, w, h) {
  return `${head(w, h, BILE)}
  <div class="pad">
    <div class="row"><span class="mark">GROSS.</span><span class="eyebrow">THE NUMBER / ${String(e.n).padStart(2, '0')}</span></div>
    <div>
      <div style="font-size:${w > 1100 ? 29 : 26}px;letter-spacing:.1em;font-weight:700;margin-bottom:36px">${e.eyebrow.toUpperCase()}</div>
      <div class="anton" style="font-size:${Math.round(w * 0.29)}px;line-height:.78">${e.value}</div>
    </div>
    <div class="row"><span style="font-size:26px;max-width:24ch">${e.footer}</span><span class="url">getgross.co.uk</span></div>
  </div></body></html>`
}

function receiptCard(e, w, h) {
  const rows = e.lines
    .map(([l, v, dim]) => `<div style="display:flex;justify-content:space-between;font-size:29px;padding:7px 0;${dim ? 'opacity:.7' : ''}"><span>${l}</span><span>${v}</span></div>`)
    .join('')
  return `${head(w, h, INK, RECEIPT)}
  <div class="pad">
    <div class="row"><span class="mark" style="color:${BILE}">GROSS.</span><span class="eyebrow" style="color:${BILE}">THE RECEIPT / ${String(e.n).padStart(2, '0')}</span></div>
    <div style="display:flex;justify-content:center">
      <div style="width:${Math.min(560, w - 300)}px;background:${RECEIPT};border:3px solid ${INK};padding:34px 38px;color:${INK}">
        <div style="border-top:3px dashed ${INK};margin-bottom:22px"></div>
        <div style="font-size:21px;letter-spacing:.1em;opacity:.6;margin-bottom:16px">GROSS. // ${e.tool}</div>
        ${rows}
        <div style="border-top:3px solid ${INK};margin:16px 0"></div>
        <div style="background:${INK};color:${BILE};display:flex;justify-content:space-between;align-items:baseline;padding:15px 19px">
          <span style="font-size:25px">${e.answer[0]}</span><span style="font-family:'Anton';font-size:60px">${e.answer[1]}</span>
        </div>
        <div style="font-size:21px;margin-top:18px;font-weight:700">${e.verdict}</div>
      </div>
    </div>
    <div class="row"><span style="font-size:25px;color:${RECEIPT}">Free. No sign-up.</span><span class="url" style="color:${BILE}">getgross.co.uk</span></div>
  </div></body></html>`
}

function badDayCard(e, w, h) {
  const panel = (p, ground, colour) => `
    <div style="flex:1;background:${ground};border:3px solid ${INK};padding:30px">
      <div style="font-family:'Anton';font-size:44px;color:${colour}">${p.title}</div>
      ${p.rows.map(([l, v]) => `<div style="display:flex;justify-content:space-between;font-size:26px;padding:10px 0;border-bottom:2px dotted ${colour};color:${colour}"><span>${l}</span><span style="font-weight:700">${v}</span></div>`).join('')}
    </div>`
  return `${head(w, h, RECEIPT)}
  <div class="pad">
    <div class="row"><span class="mark">GROSS.</span><span class="eyebrow">THE BAD DAY / ${String(e.n).padStart(2, '0')}</span></div>
    <div style="display:flex;gap:26px;align-items:stretch">
      ${panel(e.left, BILE, INK)}
      ${panel(e.right, INK, e.right.red ? REDPEN : BILE)}
    </div>
    <div class="row"><span style="font-size:26px;max-width:26ch">${e.footer}</span><span class="url">getgross.co.uk</span></div>
  </div></body></html>`
}

const SERIES = [
  ['number', NUMBERS, numberCard],
  ['receipt', RECEIPTS, receiptCard],
  ['badday', BADDAYS, badDayCard],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } })
await page.goto(pathToFileURL(OUT).href)
let count = 0
for (const [name, entries, render] of SERIES) {
  const dir = resolve(OUT, name)
  mkdirSync(resolve(dir, 'portrait'), { recursive: true })
  for (const e of entries) {
    const file = `${String(e.n).padStart(2, '0')}-${e.slug}`
    await page.setViewportSize({ width: 1200, height: 1200 })
    await page.setContent(render(e, 1200, 1200), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: resolve(dir, `${file}.png`) })
    await page.setViewportSize({ width: 1080, height: 1350 })
    await page.setContent(render(e, 1080, 1350), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: resolve(dir, `portrait/${file}.png`) })
    console.log(`${name}:`, file + '.png (+portrait)')
    count++
  }
}
await browser.close()
console.log('done —', count, 'entries × 2 sizes')
