/**
 * Social carousel generator — 10 on-brand slides, bile green, Anton/Space Mono.
 *
 * Outputs to marketing/carousel/:
 *  - slide-01.png … slide-10.png at 1080×1350 (4:5 — Instagram's best format,
 *    also correct inside a LinkedIn PDF)
 *  - gross-carousel.pdf (LinkedIn carousels are PDF "document" posts)
 *
 * Edit SLIDES below and re-run: node scripts/gen-carousel.mjs
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

/** The copy. ≤10 words a slide. Every line earns the next swipe. */
const SLIDES = [
  { eyebrow: 'A WORD ON YOUR NUMBERS', text: 'Your margin is gross.' },
  { eyebrow: 'UNFORTUNATELY', text: 'Not the good kind of gross.' },
  { eyebrow: 'THE CHAIN', text: 'The retailer takes 35%. You said thank you.' },
  { eyebrow: 'GROSS TO NET', text: 'Then promo funding. Then back margin. Then “other”.' },
  { eyebrow: 'THE MARKETPLACE', text: 'Amazon’s fees on your £1.50 can: £2.65.' },
  { eyebrow: 'THE MEETING', text: 'Your buyer knows these numbers. You’re guessing.' },
  { eyebrow: 'SO', text: 'We built the calculators. Eleven of them.' },
  { eyebrow: 'THE CATCH', text: 'Free. No sign-up. No webinar. No “journey”.' },
  { eyebrow: 'THE SMALL PRINT', text: 'The maths is checked. The rat is not real.' },
  { eyebrow: 'GO ON THEN', text: 'Do the gross maths.', cta: 'getgross.co.uk' },
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
      <div class="text">${s.text}</div>
      ${s.cta ? `<div class="cta">${s.cta}</div>` : ''}
    </div>
    <div class="foot">
      <span class="counter">${n} / ${String(SLIDES.length).padStart(2, '0')}</span>
      ${last
        ? `<span class="barcode">${'<i></i>'.repeat(28)}</span>`
        : '<span class="swipe">→</span>'}
    </div>
  </div>`
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Anton';src:url(data:font/woff2;base64,${anton}) format('woff2')}
  @font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${monoR}) format('woff2');font-weight:400}
  @font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${monoB}) format('woff2');font-weight:700}
  *{margin:0;padding:0;box-sizing:border-box}
  .slide{width:1080px;height:1350px;background:#C6F215;color:#0A0A0A;
    border:18px solid #0A0A0A;padding:72px;display:flex;flex-direction:column;
    justify-content:space-between;page-break-after:always;font-family:'Space Mono',monospace}
  .top{display:flex;justify-content:space-between;align-items:baseline}
  .mark{font-family:'Anton';font-size:64px;letter-spacing:-.03em}
  .sku{font-size:26px;letter-spacing:.1em}
  .eyebrow{font-size:28px;font-weight:700;letter-spacing:.14em;border:4px solid #0A0A0A;
    display:inline-block;padding:10px 18px;margin-bottom:56px}
  .text{font-family:'Anton';font-size:118px;line-height:1.02;letter-spacing:-.015em;max-width:12ch}
  .cta{margin-top:64px;background:#0A0A0A;color:#C6F215;display:inline-block;
    font-size:52px;font-weight:700;padding:26px 38px}
  .foot{display:flex;justify-content:space-between;align-items:center}
  .counter{font-size:30px;letter-spacing:.1em}
  .swipe{font-size:84px;font-weight:700;line-height:1}
  .barcode{display:flex;gap:7px;align-items:flex-end;height:64px}
  .barcode i{display:block;width:7px;height:64px;background:#0A0A0A}
  .barcode i:nth-child(3n){height:48px}.barcode i:nth-child(4n){width:13px}
  .barcode i:nth-child(7n){height:56px;width:4px}
</style></head><body>${SLIDES.map(slideHtml).join('\n')}</body></html>`

writeFileSync(resolve(OUT, 'carousel.html'), html)

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)

// PNGs for Instagram (one per slide)
const slides = page.locator('.slide')
const count = await slides.count()
for (let i = 0; i < count; i++) {
  await slides.nth(i).screenshot({ path: resolve(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`) })
  console.log(`slide-${String(i + 1).padStart(2, '0')}.png`)
}

// PDF for LinkedIn (document post)
await page.pdf({
  path: resolve(OUT, 'gross-carousel.pdf'),
  width: '1080px',
  height: '1350px',
  printBackground: true,
  pageRanges: `1-${count}`,
})
console.log('gross-carousel.pdf')
await browser.close()
console.log(`done — ${count} slides in marketing/carousel/`)
