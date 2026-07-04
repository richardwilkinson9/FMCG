/**
 * Social carousel generator — 10 fully-designed slides on the GROSS system:
 * bile ground, ink frame, receipt cards with REAL numbers from the demo model,
 * the waterfall split bar, the tool grid, the sticker, the rat.
 *
 * Outputs to marketing/carousel/:
 *  - slide-01.png … slide-10.png at 1080×1350 (4:5 — Instagram)
 *  - gross-carousel.pdf (LinkedIn document post)
 *
 * Edit the copy/cards below and re-run: node scripts/gen-carousel.mjs
 * Brand rules honoured: 2px+ ink borders, radius 0 (sticker excepted),
 * reduced-yellow max once per slide and never touching bile without an ink
 * rule, red-pen for negatives only, Anton display / Space Mono numerals.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'marketing/carousel')
mkdirSync(OUT, { recursive: true })

const b64 = (p) => readFileSync(resolve(ROOT, 'public/fonts', p)).toString('base64')
const anton = b64('Anton-400.woff2')
const monoR = b64('SpaceMono-400.woff2')
const monoB = b64('SpaceMono-700.woff2')

const INK = '#0A0A0A'
const BILE = '#C6F215'
const RECEIPT = '#F7F5EF'
const REDUCED = '#FFD400'
const REDPEN = '#E4002B'

/** Ledger the Rat, verbatim from the site component (holeColor = bile). */
const RAT = `
<svg viewBox="0 0 240 190" width="440" style="display:block;color:${INK}">
  <g fill="currentColor" fill-rule="evenodd">
    <path d="M30 118 Q20 118 22 108 Q26 92 46 88 Q40 74 52 66 Q64 58 80 64 Q92 56 104 66 Q120 60 150 66 Q186 74 200 104 Q210 124 196 140 Q182 154 150 152 L86 152 Q60 154 48 140 Q38 130 40 122 Q34 122 30 118 Z M64 96 a6 6 0 1 0 0.1 0 Z"/>
    <circle cx="96" cy="56" r="15"/>
    <circle cx="96" cy="56" r="6" fill="${BILE}"/>
  </g>
  <path d="M198 130 Q232 128 234 96 Q235 78 220 74" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
  <path d="M96 152 L92 174 M120 152 L124 174 M156 152 L160 174" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
  <path d="M28 112 L6 106 M28 118 L4 120 M30 124 L8 132" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M104 44 L128 30" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
  <path d="M112 78 L112 104" stroke="currentColor" stroke-width="3"/>
  <rect x="104" y="104" width="18" height="13" fill="${BILE}" stroke="currentColor" stroke-width="2.5"/>
  <rect x="118" y="128" width="40" height="30" fill="${BILE}" stroke="currentColor" stroke-width="3"/>
  <rect x="123" y="132" width="30" height="7" fill="currentColor"/>
  <path d="M124 146 h4 M133 146 h4 M142 146 h4 M124 152 h4 M133 152 h4 M142 152 h4" stroke="currentColor" stroke-width="3"/>
</svg>`

const barcode = (h = 64) =>
  `<span class="barcode" style="height:${h}px">${'<i></i>'.repeat(28)}</span>`

/** A white receipt card with dashed tear lines top and bottom. */
const receipt = (title, rows, footer = '') => `
  <div class="rcpt">
    <div class="tear"></div>
    <div class="rhead"><span>GROSS. // ${title}</span><span>04 JUL 2026</span></div>
    <div class="rrule"></div>
    ${rows.map(([l, v, cls]) => `<div class="rline ${cls || ''}"><span>${l}</span><span class="rval">${v}</span></div>`).join('')}
    ${footer ? `<div class="rrule"></div><div class="rfoot">${footer}</div>` : ''}
    <div class="tear"></div>
  </div>`

// ── The slides ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    eyebrow: 'A WORD ON YOUR NUMBERS',
    head: 'Your margin is gross.',
    size: 128,
    extra: `<div class="sticker">KEEP<br>SWIPING</div>`,
  },
  {
    eyebrow: 'UNFORTUNATELY',
    head: 'Not the good kind of gross.',
    size: 104,
    extra: `
      <div class="dict">
        <div class="dword">gross <span class="dipa">/ɡrəʊs/</span></div>
        <div class="ddef"><b>1.</b> before the deductions.</div>
        <div class="ddef"><b>2.</b> what the deductions are.</div>
      </div>`,
  },
  {
    eyebrow: 'THE CHAIN',
    head: 'The retailer takes 35%. You said thank you.',
    size: 84,
    extra: receipt('THE P&L', [
      ['Shelf price ex-VAT', '£1.25', 'bold'],
      ['less retailer margin (35%)', '−£0.44', 'dim'],
      ['You bank / unit', '£0.81', 'bold'],
    ]),
  },
  {
    eyebrow: 'GROSS TO NET',
    head: 'Then promo funding. Then back margin. Then “other”.',
    size: 84,
    extra: `
      <div class="wf">
        <div class="wfbar">
          <div style="width:39%;background:${INK}"></div>
          <div style="width:23%;background:${REDUCED};border-left:4px solid ${INK};border-right:4px solid ${INK}"></div>
          <div style="width:38%;background:${BILE}"></div>
        </div>
        <div class="wfleg">
          <span><i style="background:${INK}"></i>COST 39%</span>
          <span><i style="background:${REDUCED}"></i>TRADE 23%</span>
          <span><i style="background:${BILE}"></i>YOURS 38%</span>
        </div>
      </div>`,
  },
  {
    eyebrow: 'THE MARKETPLACE',
    head: 'Amazon’s fees on your £1.50 can: £2.65.',
    size: 84,
    extra: receipt('THE AMAZON CUT', [
      ['Sale price (inc VAT)', '£1.50', 'bold'],
      ['Total Amazon fees', '−£2.65', 'dim'],
      ['Your “profit” / unit', '−£1.72', 'red'],
    ], 'A single can is not an FBA product.'),
  },
  {
    eyebrow: 'THE MEETING',
    head: 'Your buyer knows these numbers. You’re guessing.',
    size: 84,
    extra: `
      <div class="vs">
        <div class="vcol">
          <div class="vhead">THE BUYER</div>
          <div class="vrow">your cost price <b>✓</b></div>
          <div class="vrow">your real uplift <b>✓</b></div>
          <div class="vrow">your funding rate <b>✓</b></div>
        </div>
        <div class="vcol vyou">
          <div class="vhead">YOU</div>
          <div class="vbig">—</div>
        </div>
      </div>`,
  },
  {
    eyebrow: 'SO',
    head: 'We built the calculators. Eleven of them.',
    size: 92,
    extra: `
      <div class="grid">
        ${['The P&L', 'The Waterfall', 'The Floor', 'The Listing', 'The Payback', 'The Stock Answer', 'The Amazon Cut', 'The TikTok Cut', 'The Line-Up', 'The Range', 'The Shelf']
          .map((n) => `<div class="cell">${n}</div>`).join('')}
        <div class="cell fill">${barcode(26)}</div>
      </div>`,
  },
  {
    eyebrow: 'THE CATCH',
    head: 'Free. No sign-up. No webinar. No “journey”.',
    size: 92,
    extra: receipt('THE BILL', [
      ['11 calculators', '£0.00'],
      ['The Excel model', '£0.00'],
      ['Your email address', 'not required', 'dim'],
      ['TO PAY', '£0.00', 'bold'],
    ]),
  },
  {
    eyebrow: 'THE SMALL PRINT',
    head: 'The maths is checked. The rat is not real.',
    size: 84,
    extra: `<div class="rat">${RAT}</div>`,
  },
  {
    eyebrow: 'GO ON THEN',
    head: 'Do the gross maths.',
    size: 128,
    cta: 'getgross.co.uk',
  },
]

const slideHtml = (s, i) => {
  const n = String(i + 1).padStart(2, '0')
  const last = i === SLIDES.length - 1
  return `
  <div class="slide">
    <div class="top">
      <span class="mark">GROSS.</span>
      <span class="sku">SKU 50 000${n}</span>
    </div>
    <div class="mid">
      <div class="eyebrow">${s.eyebrow}</div>
      <div class="head" style="font-size:${s.size}px">${s.head}</div>
      ${s.extra || ''}
      ${s.cta ? `<div class="cta">${s.cta}</div>` : ''}
    </div>
    <div class="foot">
      <span class="counter">${n} / ${String(SLIDES.length).padStart(2, '0')}</span>
      ${last ? barcode(64) : '<span class="swipe">→</span>'}
    </div>
  </div>`
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2')}
  @font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${monoR}) format('woff2');font-weight:400}
  @font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${monoB}) format('woff2');font-weight:700}
  *{margin:0;padding:0;box-sizing:border-box}
  .slide{width:1080px;height:1350px;background:${BILE};color:${INK};position:relative;
    border:18px solid ${INK};padding:64px 72px;display:flex;flex-direction:column;
    justify-content:space-between;page-break-after:always;font-family:'Space Mono',monospace}
  .top{display:flex;justify-content:space-between;align-items:baseline}
  .mark{font-family:'Anton';font-size:60px;letter-spacing:-.03em}
  .sku{font-size:25px;letter-spacing:.1em}
  .mid{display:flex;flex-direction:column;justify-content:center;flex:1;min-height:0}
  .eyebrow{font-size:25px;font-weight:700;letter-spacing:.14em;border:4px solid ${INK};
    align-self:flex-start;padding:9px 16px;margin-bottom:44px}
  .head{font-family:'Anton';line-height:1.02;letter-spacing:-.015em;max-width:13ch}
  .cta{margin-top:56px;background:${INK};color:${BILE};align-self:flex-start;
    font-size:52px;font-weight:700;padding:26px 38px}
  .foot{display:flex;justify-content:space-between;align-items:center}
  .counter{font-size:28px;letter-spacing:.1em}
  .swipe{font-size:80px;font-weight:700;line-height:1}
  .barcode{display:flex;gap:6px;align-items:flex-end}
  .barcode i{display:block;width:7px;height:100%;background:${INK}}
  .barcode i:nth-child(3n){height:75%}.barcode i:nth-child(4n){width:12px}
  .barcode i:nth-child(7n){height:88%;width:4px}
  .cell.fill .barcode i{background:${BILE}}

  /* sticker — the one circle allowed, the one reduced-yellow element */
  .sticker{position:absolute;top:150px;right:84px;width:210px;height:210px;border-radius:50%;
    background:${REDUCED};border:5px solid ${INK};display:flex;align-items:center;justify-content:center;
    text-align:center;font-weight:700;font-size:32px;line-height:1.15;letter-spacing:.06em;
    transform:rotate(-9deg)}

  /* dictionary card */
  .dict{margin-top:56px;background:#fff;border:5px solid ${INK};padding:36px 40px;align-self:flex-start}
  .dword{font-weight:700;font-size:44px}
  .dipa{font-weight:400;opacity:.6;font-size:32px}
  .ddef{font-size:32px;margin-top:16px;line-height:1.3}

  /* receipt card */
  .rcpt{margin-top:52px;background:${RECEIPT};border:5px solid ${INK};padding:0 36px;width:700px}
  .tear{border-top:4px dashed ${INK};margin:0 -36px}
  .rhead{display:flex;justify-content:space-between;font-size:24px;padding:22px 0 10px;letter-spacing:.02em}
  .rrule{border-top:4px solid ${INK};margin:10px -36px 6px}
  .rline{display:flex;justify-content:space-between;font-size:30px;padding:10px 0;gap:24px}
  .rline.bold{font-weight:700}
  .rline.dim{opacity:.66}
  .rline.red .rval{color:${REDPEN};font-weight:700}
  .rval{white-space:nowrap}
  .rfoot{font-size:24px;padding:8px 0 20px;opacity:.75}
  .rcpt .rline:last-of-type{padding-bottom:22px}

  /* waterfall bar */
  .wf{margin-top:64px;width:100%}
  .wfbar{display:flex;height:110px;border:5px solid ${INK};background:${BILE}}
  .wfleg{display:flex;gap:40px;margin-top:22px;font-size:27px;font-weight:700;letter-spacing:.04em}
  .wfleg i{display:inline-block;width:24px;height:24px;border:4px solid ${INK};margin-right:12px;vertical-align:-2px}

  /* buyer vs you */
  .vs{display:flex;gap:0;margin-top:56px;width:100%}
  .vcol{flex:1;border:5px solid ${INK};padding:30px 34px;background:#fff}
  .vcol+.vcol{border-left:0}
  .vhead{font-weight:700;font-size:27px;letter-spacing:.12em;border-bottom:4px solid ${INK};padding-bottom:14px;margin-bottom:18px}
  .vrow{font-size:29px;padding:8px 0;display:flex;justify-content:space-between}
  .vyou{background:${INK};color:${BILE}}
  .vyou .vhead{border-color:${BILE}}
  .vbig{font-family:'Anton';font-size:120px;text-align:center;line-height:1.1}

  /* tool grid */
  .grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:56px;width:100%}
  .cell{border:4px solid ${INK};margin:-2px;padding:24px 20px;font-family:'Anton';
    font-size:34px;letter-spacing:.01em;background:${BILE}}
  .cell.fill{background:${INK};display:flex;align-items:center;justify-content:center}

  /* the rat */
  .rat{margin-top:48px;align-self:center}
</style></head><body>${SLIDES.map(slideHtml).join('\n')}</body></html>`

writeFileSync(resolve(OUT, 'carousel.html'), html)

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)

const slides = page.locator('.slide')
const count = await slides.count()
for (let i = 0; i < count; i++) {
  await slides.nth(i).screenshot({ path: resolve(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`) })
  console.log(`slide-${String(i + 1).padStart(2, '0')}.png`)
}

await page.pdf({
  path: resolve(OUT, 'gross-carousel.pdf'),
  width: '1080px',
  height: '1350px',
  printBackground: true,
  pageRanges: `1-${count}`,
})
console.log('gross-carousel.pdf')
await browser.close()
console.log(`done — ${count} designed slides in marketing/carousel/`)
