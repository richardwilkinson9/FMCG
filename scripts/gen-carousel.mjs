/**
 * Social carousel generator — THREE full design directions, same campaign copy:
 *
 *   v1-bile     Bile poster: green ground, ink type, receipt cards (the original)
 *   v2-ink      Ink poster: black ground, bile type — the night-shift inversion
 *   v3-receipt  Till roll: the slide IS a receipt — paper, tears, line items
 *
 * Outputs marketing/carousel/<design>/slide-01..10.png (1080×1350, Instagram)
 * and gross-carousel-<design>.pdf (LinkedIn document post) per design.
 *
 * Brand rules held in all three: 2px+ ink borders, radius 0 (sticker excepted),
 * reduced-yellow max once per slide and never touching bile without an ink rule,
 * red-pen for negatives only, Anton display / Space Mono numerals.
 *
 * Edit copy/cards below and re-run: node scripts/gen-carousel.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUTROOT = resolve(ROOT, 'marketing/carousel')

const b64 = (p) => readFileSync(resolve(ROOT, 'public/fonts', p)).toString('base64')
const anton = b64('Anton-400.woff2')
const monoR = b64('SpaceMono-400.woff2')
const monoB = b64('SpaceMono-700.woff2')

const INK = '#0A0A0A'
const BILE = '#C6F215'
const RECEIPT = '#F7F5EF'
const REDUCED = '#FFD400'
const REDPEN = '#E4002B'

/** Ledger the Rat — colour/holes set per design. */
const rat = (color, hole, w = 420) => `
<svg viewBox="0 0 240 190" width="${w}" style="display:block;color:${color}">
  <g fill="currentColor" fill-rule="evenodd">
    <path d="M30 118 Q20 118 22 108 Q26 92 46 88 Q40 74 52 66 Q64 58 80 64 Q92 56 104 66 Q120 60 150 66 Q186 74 200 104 Q210 124 196 140 Q182 154 150 152 L86 152 Q60 154 48 140 Q38 130 40 122 Q34 122 30 118 Z M64 96 a6 6 0 1 0 0.1 0 Z"/>
    <circle cx="96" cy="56" r="15"/>
    <circle cx="96" cy="56" r="6" fill="${hole}"/>
  </g>
  <path d="M198 130 Q232 128 234 96 Q235 78 220 74" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
  <path d="M96 152 L92 174 M120 152 L124 174 M156 152 L160 174" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
  <path d="M28 112 L6 106 M28 118 L4 120 M30 124 L8 132" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M104 44 L128 30" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
  <path d="M112 78 L112 104" stroke="currentColor" stroke-width="3"/>
  <rect x="104" y="104" width="18" height="13" fill="${hole}" stroke="currentColor" stroke-width="2.5"/>
  <rect x="118" y="128" width="40" height="30" fill="${hole}" stroke="currentColor" stroke-width="3"/>
  <rect x="123" y="132" width="30" height="7" fill="currentColor"/>
  <path d="M124 146 h4 M133 146 h4 M142 146 h4 M124 152 h4 M133 152 h4 M142 152 h4" stroke="currentColor" stroke-width="3"/>
</svg>`

const barcode = (h, cls = '') => `<span class="barcode ${cls}" style="height:${h}px">${'<i></i>'.repeat(28)}</span>`

// ── The campaign copy (same in all three designs) ─────────────────────────────
const TOOLS = ['The P&L', 'The Waterfall', 'The Floor', 'The Listing', 'The Payback', 'The Stock Answer', 'The Amazon Cut', 'The TikTok Cut', 'The Line-Up', 'The Range', 'The Shelf']

const SLIDES = [
  { eyebrow: 'A WORD ON YOUR NUMBERS', head: 'Your margin is gross.', size: 128, kind: 'sticker' },
  { eyebrow: 'UNFORTUNATELY', head: 'Not the good kind of gross.', size: 104, kind: 'dict' },
  {
    eyebrow: 'THE CHAIN', head: 'The retailer takes 35%. You said thank you.', size: 84, kind: 'receipt',
    title: 'THE P&L',
    rows: [['Shelf price ex-VAT', '£1.25', 'bold'], ['less retailer margin (35%)', '−£0.44', 'dim'], ['You bank / unit', '£0.81', 'total']],
  },
  { eyebrow: 'GROSS TO NET', head: 'Then promo funding. Then back margin. Then “other”.', size: 84, kind: 'waterfall' },
  {
    eyebrow: 'THE MARKETPLACE', head: 'Amazon’s fees on your £1.50 can: £2.65.', size: 84, kind: 'receipt',
    title: 'THE AMAZON CUT',
    rows: [['Sale price (inc VAT)', '£1.50', 'bold'], ['Total Amazon fees', '−£2.65', 'dim'], ['Your “profit” / unit', '−£1.72', 'red']],
    footer: 'A single can is not an FBA product.',
  },
  { eyebrow: 'THE MEETING', head: 'Your buyer knows these numbers. You’re guessing.', size: 84, kind: 'vs' },
  { eyebrow: 'SO', head: 'We built the calculators. Eleven of them.', size: 92, kind: 'grid' },
  {
    eyebrow: 'THE CATCH', head: 'Free. No sign-up. No webinar. No “journey”.', size: 92, kind: 'receipt',
    title: 'THE BILL',
    rows: [['11 calculators', '£0.00'], ['The Excel model', '£0.00'], ['Your email address', 'not required', 'dim'], ['TO PAY', '£0.00', 'total']],
  },
  { eyebrow: 'THE SMALL PRINT', head: 'The maths is checked. The rat is not real.', size: 84, kind: 'rat' },
  { eyebrow: 'GO ON THEN', head: 'Do the gross maths.', size: 128, kind: 'cta', cta: 'getgross.co.uk' },
]

// ── Design themes ─────────────────────────────────────────────────────────────
const DESIGNS = [
  {
    id: 'v1-bile',
    chrome: 'poster',
    bg: BILE, fg: INK, frame: INK,
    blockBg: INK, blockFg: BILE, // answer/CTA block
    cardBg: RECEIPT, cardFg: INK,
    gridCellBg: BILE, gridBorder: INK, fillBg: INK, fillBar: BILE,
    barCost: INK, ratColor: INK, ratHole: BILE,
    youBg: INK, youFg: BILE,
    barcodeColor: INK,
  },
  {
    id: 'v2-ink',
    chrome: 'poster',
    bg: INK, fg: BILE, frame: BILE,
    blockBg: BILE, blockFg: INK,
    cardBg: RECEIPT, cardFg: INK,
    gridCellBg: INK, gridBorder: BILE, fillBg: BILE, fillBar: INK,
    barCost: RECEIPT, ratColor: BILE, ratHole: INK,
    youBg: BILE, youFg: INK,
    barcodeColor: BILE,
  },
  {
    id: 'v3-receipt',
    chrome: 'roll',
    bg: RECEIPT, fg: INK, frame: INK,
    blockBg: INK, blockFg: BILE,
    cardBg: RECEIPT, cardFg: INK,
    gridCellBg: RECEIPT, gridBorder: INK, fillBg: INK, fillBar: RECEIPT,
    barCost: INK, ratColor: INK, ratHole: RECEIPT,
    youBg: INK, youFg: BILE,
    barcodeColor: INK,
  },
]

// ── Slide content per kind (theme-aware) ─────────────────────────────────────
function extraFor(s, t) {
  const roll = t.chrome === 'roll'
  switch (s.kind) {
    case 'sticker':
      return `<div class="sticker">KEEP<br>SWIPING</div>`
    case 'dict':
      return `
        <div class="dict">
          <div class="dword">gross <span class="dipa">/ɡrəʊs/</span></div>
          <div class="ddef"><b>1.</b> before the deductions.</div>
          <div class="ddef"><b>2.</b> what the deductions are.</div>
        </div>`
    case 'receipt': {
      const rows = s.rows.map(([l, v, cls]) => {
        if (cls === 'total') return `<div class="rline total"><span>${l}</span><span class="rval">${v}</span></div>`
        return `<div class="rline ${cls || ''}"><span>${l}</span><span class="rval">${v}</span></div>`
      }).join('')
      if (roll) {
        // On the till roll the items sit straight on the paper
        return `
          <div class="items">
            <div class="rhead"><span>// ${s.title}</span><span>04 JUL 2026</span></div>
            <div class="rrule"></div>
            ${rows}
            ${s.footer ? `<div class="rrule dotted"></div><div class="rfoot">${s.footer}</div>` : ''}
          </div>`
      }
      return `
        <div class="rcpt">
          <div class="tear"></div>
          <div class="rhead"><span>GROSS. // ${s.title}</span><span>04 JUL 2026</span></div>
          <div class="rrule"></div>
          ${rows}
          ${s.footer ? `<div class="rrule dotted"></div><div class="rfoot">${s.footer}</div>` : ''}
          <div class="tear"></div>
        </div>`
    }
    case 'waterfall':
      return `
        <div class="wf">
          <div class="wfbar">
            <div style="width:39%;background:${t.barCost}"></div>
            <div style="width:23%;background:${REDUCED};border-left:5px solid ${INK};border-right:5px solid ${INK}"></div>
            <div style="width:38%;background:${BILE}"></div>
          </div>
          <div class="wfleg">
            <span><i style="background:${t.barCost}"></i>COST 39%</span>
            <span><i style="background:${REDUCED};border-color:${INK}"></i>TRADE 23%</span>
            <span><i style="background:${BILE};border-color:${INK}"></i>YOURS 38%</span>
          </div>
        </div>`
    case 'vs':
      return `
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
        </div>`
    case 'grid':
      return `
        <div class="grid">
          ${TOOLS.map((n) => `<div class="cell">${n}</div>`).join('')}
          <div class="cell fill">${barcode(26, 'fillbar')}</div>
        </div>`
    case 'rat':
      return `<div class="rat">${rat(t.ratColor, t.ratHole)}</div>`
    default:
      return ''
  }
}

// ── Chromes ───────────────────────────────────────────────────────────────────
function posterSlide(s, i, t) {
  const n = String(i + 1).padStart(2, '0')
  const last = i === SLIDES.length - 1
  return `
  <div class="slide">
    <div class="top"><span class="mark">GROSS.</span><span class="sku">SKU 50 000${n}</span></div>
    <div class="mid">
      <div class="eyebrow">${s.eyebrow}</div>
      <div class="head" style="font-size:${s.size}px">${s.head}</div>
      ${extraFor(s, t)}
      ${s.cta ? `<div class="ctablock">${s.cta}</div>` : ''}
    </div>
    <div class="foot">
      <span class="counter">${n} / 10</span>
      ${last ? barcode(64) : '<span class="swipe">→</span>'}
    </div>
  </div>`
}

function rollSlide(s, i, t) {
  const n = String(i + 1).padStart(2, '0')
  const last = i === SLIDES.length - 1
  return `
  <div class="slide">
    <div class="tearline top"></div>
    <div class="inner">
      <div class="top">
        <span class="mark">GROSS.</span>
        <span class="sku">TILL 04 · 04 JUL 2026</span>
      </div>
      <div class="toprule"></div>
      <div class="mid">
        <div class="eyebrow">DEPT: ${s.eyebrow}</div>
        <div class="head" style="font-size:${Math.round(s.size * 0.92)}px">${s.head}</div>
        ${extraFor(s, t)}
        ${s.cta ? `<div class="ctablock">${s.cta}</div>` : ''}
      </div>
      <div class="botrule"></div>
      <div class="foot">
        <span class="counter">ITEM ${n} OF 10${last ? '' : ' · SWIPE →'}</span>
        ${last ? barcode(56) : '<span class="vatline">VAT NUMBER: NOT APPLICABLE.</span>'}
      </div>
    </div>
    <div class="tearline bottom"></div>
  </div>`
}

// ── Stylesheet, parameterised by theme ────────────────────────────────────────
function css(t) {
  const roll = t.chrome === 'roll'
  return `
  @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2')}
  @font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${monoR}) format('woff2');font-weight:400}
  @font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${monoB}) format('woff2');font-weight:700}
  *{margin:0;padding:0;box-sizing:border-box}
  .slide{width:1080px;height:1350px;background:${t.bg};color:${t.fg};position:relative;
    display:flex;flex-direction:column;page-break-after:always;font-family:'Space Mono',monospace;
    ${roll ? 'padding:34px 0;' : `border:18px solid ${t.frame};padding:64px 72px;justify-content:space-between;`}}
  ${roll ? `
  .tearline{height:0;border-top:7px dashed ${INK};margin:0 26px}
  .inner{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:44px 84px 34px}
  .toprule{border-top:5px solid ${INK};margin-top:20px}
  .botrule{border-top:5px solid ${INK};margin-bottom:18px}
  .vatline{font-size:22px;letter-spacing:.06em;opacity:.6}
  ` : ''}
  .top{display:flex;justify-content:space-between;align-items:baseline}
  .mark{font-family:'Anton';font-size:60px;letter-spacing:-.03em}
  .sku{font-size:25px;letter-spacing:.1em}
  .mid{display:flex;flex-direction:column;justify-content:center;flex:1;min-height:0}
  .eyebrow{font-size:25px;font-weight:700;letter-spacing:.14em;border:4px solid ${t.fg};
    align-self:flex-start;padding:9px 16px;margin-bottom:44px}
  .head{font-family:'Anton';line-height:1.02;letter-spacing:-.015em;max-width:13ch}
  .ctablock{margin-top:56px;background:${t.blockBg};color:${t.blockFg};align-self:flex-start;
    font-size:52px;font-weight:700;padding:26px 38px}
  .foot{display:flex;justify-content:space-between;align-items:center}
  .counter{font-size:28px;letter-spacing:.1em}
  .swipe{font-size:80px;font-weight:700;line-height:1}
  .barcode{display:flex;gap:6px;align-items:flex-end}
  .barcode i{display:block;width:7px;height:100%;background:${t.barcodeColor}}
  .barcode i:nth-child(3n){height:75%}.barcode i:nth-child(4n){width:12px}
  .barcode i:nth-child(7n){height:88%;width:4px}
  .barcode.fillbar i{background:${t.fillBar}}

  .sticker{position:absolute;top:${roll ? 300 : 150}px;right:${roll ? 110 : 84}px;width:210px;height:210px;border-radius:50%;
    background:${REDUCED};border:5px solid ${INK};color:${INK};display:flex;align-items:center;justify-content:center;
    text-align:center;font-weight:700;font-size:32px;line-height:1.15;letter-spacing:.06em;transform:rotate(-9deg)}

  .dict{margin-top:56px;background:${t.cardBg};color:${t.cardFg};border:5px solid ${t.frame};padding:36px 40px;align-self:flex-start}
  .dword{font-weight:700;font-size:44px}
  .dipa{font-weight:400;opacity:.6;font-size:32px}
  .ddef{font-size:32px;margin-top:16px;line-height:1.3}

  .rcpt{margin-top:52px;background:${t.cardBg};color:${t.cardFg};border:5px solid ${t.frame};padding:0 36px;width:700px}
  .tear{border-top:4px dashed ${INK};margin:0 -36px}
  .rhead{display:flex;justify-content:space-between;font-size:24px;padding:22px 0 10px;letter-spacing:.02em}
  .rrule{border-top:4px solid ${INK};margin:10px ${roll ? '0' : '-36px'} 6px}
  .rrule.dotted{border-top-style:dotted}
  .rline{display:flex;justify-content:space-between;font-size:30px;padding:10px 0;gap:24px}
  .rline.bold{font-weight:700}
  .rline.dim{opacity:.66}
  .rline.red .rval{color:${REDPEN};font-weight:700}
  .rline.total{font-weight:700;background:${t.blockBg};color:${t.blockFg};margin:8px ${roll ? '0' : '-36px'} 0;padding:14px 36px}
  .rcpt .rline.total{margin-bottom:0}
  .rcpt .rline:last-child{padding-bottom:20px}
  .rval{white-space:nowrap}
  .rfoot{font-size:24px;padding:8px 0 20px;opacity:.75}
  .items{margin-top:52px;width:100%}
  .items .rline{font-size:34px}
  .items .rhead{font-size:26px}

  .wf{margin-top:64px;width:100%}
  .wfbar{display:flex;height:110px;border:5px solid ${t.frame};background:${t.bg}}
  .wfleg{display:flex;gap:40px;margin-top:22px;font-size:27px;font-weight:700;letter-spacing:.04em}
  .wfleg i{display:inline-block;width:24px;height:24px;border:4px solid ${t.frame};margin-right:12px;vertical-align:-2px}

  .vs{display:flex;margin-top:56px;width:100%}
  .vcol{flex:1;border:5px solid ${t.frame};padding:30px 34px;background:${t.cardBg};color:${t.cardFg}}
  .vcol+.vcol{border-left:0}
  .vhead{font-weight:700;font-size:27px;letter-spacing:.12em;border-bottom:4px solid currentColor;padding-bottom:14px;margin-bottom:18px}
  .vrow{font-size:29px;padding:8px 0;display:flex;justify-content:space-between}
  .vyou{background:${t.youBg};color:${t.youFg}}
  .vbig{font-family:'Anton';font-size:120px;text-align:center;line-height:1.1}

  .grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:56px;width:100%}
  .cell{border:4px solid ${t.gridBorder};margin:-2px;padding:24px 20px;font-family:'Anton';
    font-size:34px;letter-spacing:.01em;background:${t.gridCellBg};color:${t.fg}}
  .cell.fill{background:${t.fillBg};display:flex;align-items:center;justify-content:center}

  .rat{margin-top:48px;align-self:center}`
}

// ── Render all designs ────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})

for (const design of DESIGNS) {
  const out = resolve(OUTROOT, design.id)
  mkdirSync(out, { recursive: true })
  const slideFn = design.chrome === 'roll' ? rollSlide : posterSlide
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css(design)}</style></head><body>${SLIDES.map((s, i) => slideFn(s, i, design)).join('\n')}</body></html>`
  writeFileSync(resolve(out, 'carousel.html'), html)

  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const slides = page.locator('.slide')
  const count = await slides.count()
  for (let i = 0; i < count; i++) {
    await slides.nth(i).screenshot({ path: resolve(out, `slide-${String(i + 1).padStart(2, '0')}.png`) })
  }
  await page.pdf({
    path: resolve(out, `gross-carousel-${design.id}.pdf`),
    width: '1080px', height: '1350px', printBackground: true, pageRanges: `1-${count}`,
  })
  await page.close()
  console.log(`${design.id}: ${count} slides + pdf`)
}

await browser.close()
console.log('done')
