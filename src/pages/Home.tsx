import { useState } from 'react'
import { useStore } from '../store/useStore'
import { activeWholesalerMargin, effectiveAmazonFees, effectiveTikTokFees } from '../store/scenario'
import { crossChannelComparison, rspExVat, logisticsPerUnit } from '../utils/calculations'
import { gbp, pct, BILE, REDUCED, REDPEN, INK } from '../components/gross/format'
import { receiptStamp } from '../components/gross/Receipt'
import Barcode from '../components/gross/Barcode'
import LedgerRat from '../components/gross/LedgerRat'

const CARDS = [
  { id: 'products', name: 'The Shelf', sub: 'Your Range', sku: '50 00019', group: 'SPINE' },
  { id: 'retailer-pnl', name: 'The P&L', sub: 'How much is the retailer rinsing you for', sku: '50 01142', group: 'GROCERY' },
  { id: 'waterfall', name: 'The Waterfall', sub: 'Every deduction between shelf and bank.', sku: '50 02231', group: 'GROCERY' },
  { id: 'min-margin', name: 'The Floor', sub: 'Lowest cost price that still clears cost.', sku: '50 03318', group: 'GROCERY' },
  { id: 'listing-model', name: 'The Listing', sub: 'Model the range review first.', sku: '50 04405', group: 'GROCERY' },
  { id: 'trade-spend', name: 'The Payback', sub: 'How much volume pays the promo back.', sku: '50 05512', group: 'GROCERY' },
  { id: 'stock-forecast', name: 'The Stock Answer', sub: 'What to order. When. Before you run out.', sku: '50 06629', group: 'GROCERY' },
  { id: 'cash-flow', name: 'The Wait', sub: 'Margin is an opinion. Cash is a fact.', sku: '50 12134', group: 'GROCERY', isNew: true },
  { id: 'amazon-fba', name: 'The Amazon Cut', sub: 'What Bezos takes before you see a penny.', sku: '50 07706', group: 'MARKETPLACE' },
  { id: 'tiktok-shop', name: 'The TikTok Cut', sub: 'Not as bad as Bezos (but not far off it)', sku: '50 08813', group: 'MARKETPLACE' },
  { id: 'cross-channel', name: 'The Line-Up', sub: 'Net margin, every channel, side by side.', sku: '50 09920', group: 'COMPARE' },
  { id: 'portfolio', name: 'The Range', sub: 'The whole portfolio on one till roll.', sku: '50 11027', group: 'COMPARE' },
]

/** Traffic light for the mock receipt, on gp as a share of shelf ex-VAT. */
function light(share: number, negative: boolean): string {
  if (negative || share < 0.12) return REDPEN
  if (share < 0.25) return REDUCED
  return BILE
}

export default function Home() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const product = useStore((s) => s.getActiveProduct())
  const scenario = useStore((s) => s.scenario)
  const startProduct = useStore((s) => s.startProduct)
  const [email, setEmail] = useState('')
  const [unionState, setUnionState] = useState<'idle' | 'sending' | 'signed' | 'failed'>('idle')

  const joinUnion = async () => {
    if (!email.includes('@') || unionState === 'sending') return
    setUnionState('sending')
    const { unionSignup, logEvent } = await import('../store/cloud')
    const { ok } = await unionSignup(email)
    if (ok) logEvent('union')
    setUnionState(ok ? 'signed' : 'failed')
    if (!ok) setTimeout(() => setUnionState('idle'), 3000)
  }

  const go = (id: string) => {
    setActiveCalculator(id)
    window.scrollTo(0, 0)
  }

  // Live Line-Up preview from the actual product spine
  const preview = (() => {
    if (!product) return null
    const comparison = crossChannelComparison(
      product,
      scenario.grocery.retailerMargin,
      effectiveAmazonFees(scenario.amazon, product.unitsPerCase),
      effectiveTikTokFees(scenario.tiktok),
      activeWholesalerMargin(scenario.grocery),
      logisticsPerUnit(scenario.logistics.perCase, product.unitsPerCase),
    )
    const rsp = rspExVat(product)
    const rows = [
      { ch: 'GROCERY', gp: comparison.grocery.grossProfitPerUnit },
      { ch: 'AMAZON FBA', gp: comparison.amazon.grossProfitPerUnit },
      { ch: 'TIKTOK SHOP', gp: comparison.tiktok.grossProfitPerUnit },
    ].map((r) => ({
      ...r,
      share: rsp > 0 ? r.gp / rsp : 0,
    }))
    return { rows, name: product.name }
  })()

  return (
    <div className="bg-receipt text-ink font-body">
      {/* HERO */}
      <div className="bg-bile border-b-2 border-ink py-[clamp(48px,7vw,96px)] px-[clamp(22px,4vw,48px)]">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="font-display text-[clamp(88px,20vw,260px)] leading-[0.82] tracking-[-0.05em] m-0 text-ink">
            GROSS.
          </h1>
          <div className="font-display text-[clamp(26px,4.5vw,54px)] leading-[0.95] tracking-[-0.02em] mt-[22px] text-ink">
            Calculators for FMCG's grossest maths.
          </div>
          <button
            onClick={() => { startProduct(); go('products') }}
            className="inline-flex items-center gap-3 mt-[34px] bg-ink text-receipt border-2 border-ink py-4 px-[26px] text-base font-semibold cursor-pointer hover:bg-receipt hover:text-ink"
          >
            Feed me a product. <span className="font-mono">→</span>
          </button>
        </div>
      </div>

      {/* SPINE EXPLAINER */}
      <div className="border-b-2 border-ink py-[clamp(48px,6vw,80px)] px-[clamp(22px,4vw,48px)]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col min-[821px]:flex-row items-stretch min-[821px]:items-center gap-5">
            <div className="flex-1 border-2 border-ink bg-white p-[26px]">
              <div className="font-mono text-xs tracking-[0.1em] opacity-55">STEP 01</div>
              <div className="font-mono text-[26px] font-bold mt-2.5 tracking-[-0.01em]">PRODUCTS</div>
              <div className="text-sm mt-2">Cost price, RRP, rate of sale, etc.</div>
            </div>
            <div className="font-mono text-[34px] font-bold rotate-90 min-[821px]:rotate-0 self-center" aria-hidden="true">→</div>
            <div className="flex-1 border-2 border-ink bg-white p-[26px]">
              <div className="font-mono text-xs tracking-[0.1em] opacity-55">STEP 02</div>
              <div className="font-mono text-[26px] font-bold mt-2.5 tracking-[-0.01em]">CALCULATORS</div>
              <div className="text-sm mt-2">11 tools to do your job for you.</div>
            </div>
            <div className="font-mono text-[34px] font-bold rotate-90 min-[821px]:rotate-0 self-center" aria-hidden="true">→</div>
            <div className="flex-1 border-2 border-ink bg-ink text-receipt p-[26px]">
              <div className="font-mono text-xs tracking-[0.1em] text-bile">STEP 03</div>
              <div className="font-mono text-[26px] font-bold mt-2.5 tracking-[-0.01em] text-bile">RECEIPT</div>
              <div className="text-sm mt-2">The maths all done for you.</div>
            </div>
          </div>
        </div>
      </div>

      {/* CALCULATOR GRID */}
      <div id="calculators" className="border-b-2 border-ink py-[clamp(48px,6vw,80px)] px-[clamp(22px,4vw,48px)]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-[34px]">
            <h2 className="font-display text-[clamp(28px,3.6vw,48px)] tracking-[-0.02em] m-0">The calculators</h2>
            <div className="font-mono text-xs tracking-[0.08em] opacity-60">12 TOOLS · ONE SPINE · NO SIGN-UP</div>
          </div>
          <div className="grid grid-cols-1 min-[821px]:grid-cols-3">
            {CARDS.map((card) => (
              <button
                key={card.id}
                onClick={() => go(card.id)}
                className="relative flex flex-col justify-between min-h-[210px] border-2 border-ink -m-px bg-receipt text-ink text-left p-[22px] cursor-pointer hover:bg-bile"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] tracking-[0.1em] border-2 border-ink py-0.5 px-[7px]">{card.group}</span>
                    <span className="font-mono text-xl leading-none" aria-hidden="true">→</span>
                  </div>
                  <div className="font-display text-[clamp(26px,2.6vw,34px)] tracking-[-0.01em] leading-[0.95] mt-5">{card.name}</div>
                  <div className="text-[13.5px] mt-2 max-w-[26ch]">{card.sub}</div>
                </div>
                <div className="flex items-end justify-between border-t-2 border-ink mt-[18px] pt-2.5">
                  <span className="font-mono text-xs tracking-[0.05em]">SKU {card.sku}</span>
                </div>
                {card.isNew && (
                  <div className="absolute -top-4 -right-3.5 w-[74px] h-[74px] !rounded-full bg-reduced border-2 border-ink flex flex-col items-center justify-center rotate-[-9deg] font-mono text-center leading-[1.05]">
                    <span className="text-[10px] tracking-[0.06em]">JUST IN</span>
                    <span className="text-[15px] font-bold">NEW</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LINE-UP FEATURE */}
      <div id="lineup" className="bg-ink text-bile border-b-2 border-ink py-[clamp(48px,6vw,84px)] px-[clamp(22px,4vw,48px)]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 min-[821px]:grid-cols-2 gap-11 items-center">
            <div>
              <div className="font-mono text-xs tracking-[0.1em] text-bile">SKU 50 09920 · COMPARE</div>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[0.9] tracking-[-0.02em] mt-3.5 mb-0 text-bile">The Line-Up</h2>
              <p className="text-base max-w-[44ch] mt-[18px] mb-0 text-receipt">
                Same products. Different channels.
              </p>
              <p className="text-sm max-w-[44ch] mt-4 mb-0 font-mono text-bile">A £1.50 can on FBA. Don't.</p>
            </div>
            {/* Live mock receipt */}
            {preview && (
              <div className="bg-receipt text-ink border-2 border-ink py-[26px] px-6 font-mono">
                <div className="border-t-2 border-dashed border-ink h-0 -mt-2 -mx-2 mb-3.5" />
                <div className="flex justify-between text-xs">
                  <span>GROSS. // THE LINE-UP</span>
                  <span>{receiptStamp()}</span>
                </div>
                <div className="text-[13px] mt-1">{preview.name} · net margin / unit</div>
                <div className="border-t-2 border-ink my-3.5" />
                {preview.rows.map((row) => (
                  <div key={row.ch} className="flex items-center justify-between py-[9px]">
                    <span className="flex items-center gap-2.5 text-sm">
                      <span className="w-[13px] h-[13px] border-2 border-ink inline-block" style={{ background: light(row.share, row.gp < 0) }} />
                      {row.ch}
                    </span>
                    <span className="text-right">
                      <span className="text-[17px] font-bold" style={{ color: row.gp < 0 ? REDPEN : INK }}>{gbp(row.gp)}</span>
                      <span className="block text-[11px]" style={{ color: row.gp < 0 ? REDPEN : INK }}>{pct(row.share)} of RSP</span>
                    </span>
                  </div>
                ))}
                <div className="border-t-2 border-ink mt-3.5 mb-3" />
                <div className="text-[11px] leading-normal">VAT number: not applicable. This is a website.</div>
                <div className="border-b-2 border-dashed border-ink h-0 mt-3.5 -mx-2 -mb-2" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* UNION STRIP */}
      <div id="union" className="border-b-2 border-ink py-[clamp(48px,6vw,80px)] px-[clamp(22px,4vw,48px)]">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-col min-[821px]:flex-row items-stretch min-[821px]:items-end justify-between gap-8">
            <div>
              <h2 className="font-display text-[clamp(30px,4vw,54px)] tracking-[-0.02em] leading-[0.92] m-0">
                Join the Union.<br />It's free, obviously.
              </h2>
              <p className="text-sm mt-4 mb-0 font-mono max-w-[42ch]">The rate card, kept current. When Amazon or a multiple moves a fee, you get the email before your buyer does. It's called The Ledger.</p>
            </div>
            {unionState === 'signed' ? (
              <p className="font-mono text-sm m-0 self-center">In. We'll email when a fee moves.</p>
            ) : (
              <div className="flex flex-col gap-1.5 min-w-[320px] shrink-0">
                <div className="flex border-2 border-ink bg-white">
                  <input
                    type="email"
                    aria-label="Email address"
                    placeholder="name@brand.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinUnion()}
                    className="border-0 outline-none py-[15px] px-4 font-mono text-sm bg-white text-ink w-[200px]"
                  />
                  <button
                    onClick={joinUnion}
                    disabled={unionState === 'sending'}
                    className="border-0 border-l-2 border-ink bg-ink text-receipt px-[22px] text-sm font-semibold cursor-pointer hover:bg-bile hover:text-ink"
                  >
                    {unionState === 'sending' ? 'Signing…' : 'Sign up'}
                  </button>
                </div>
                {unionState === 'failed' && (
                  <span className="font-mono text-[11px]" style={{ color: '#E4002B' }}>
                    That didn't save. Try again in a minute.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-ink text-receipt pt-[clamp(40px,5vw,64px)] px-[clamp(22px,4vw,48px)] pb-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10">
            <Barcode height={52} />
          </div>
          <div className="flex flex-col min-[821px]:flex-row justify-between gap-8 min-[821px]:gap-10">
            <div className="max-w-[320px]">
              <div className="font-display text-[34px] tracking-[-0.04em] leading-none text-bile">GROSS.</div>
              <p className="text-[13px] mt-4 mb-0 opacity-85">The maths is checked. The rat is not real.</p>
              <div className="font-mono text-[11px] mt-[18px] text-bile">DEFAULTS CHECKED: 03 JUL 2026</div>
            </div>
            <div className="flex gap-14 text-sm">
              <div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-bile mb-3">TOOLS</div>
                <div className="flex flex-col gap-[9px]">
                  <button onClick={() => go('trade-spend')} className="text-receipt text-left bg-transparent border-0 p-0 text-sm cursor-pointer hover:text-bile">The Payback</button>
                  <button onClick={() => go('cross-channel')} className="text-receipt text-left bg-transparent border-0 p-0 text-sm cursor-pointer hover:text-bile">The Line-Up</button>
                  <button onClick={() => go('retailer-pnl')} className="text-receipt text-left bg-transparent border-0 p-0 text-sm cursor-pointer hover:text-bile">The P&L</button>
                </div>
              </div>
              <div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-bile mb-3">THE UNION</div>
                <div className="flex flex-col gap-[9px]">
                  <a href="#union" className="text-receipt no-underline hover:text-bile">The Ledger</a>
                  <button onClick={() => go('methodology')} className="text-receipt text-left bg-transparent border-0 p-0 text-sm cursor-pointer hover:text-bile">The Rate Card</button>
                </div>
              </div>
            </div>
            <div className="shrink-0 text-center">
              <div className="w-[180px] text-bile">
                <LedgerRat holeColor="#0A0A0A" />
              </div>
              <div className="font-mono text-[11px] text-bile mt-2.5 max-w-[180px]">run it again with the real cost price.</div>
            </div>
          </div>
          <div className="border-t-2 border-bile mt-9 pt-4 flex justify-between flex-wrap gap-2.5 font-mono text-[11px] opacity-70">
            <span>GROSS. // FREE COMMERCIAL CALCULATORS FOR UK FMCG BRAND TEAMS</span>
            <span>VAT NUMBER: NOT APPLICABLE. THIS IS A WEBSITE.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
