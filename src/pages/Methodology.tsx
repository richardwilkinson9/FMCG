import { useStore } from '../store/useStore'
import { PageHeader, IntroLine } from '../components/gross/CalcShell'
import GrossFooter from '../components/gross/GrossFooter'
import {
  UK_VAT_RATE,
  AMAZON_FBA_DEFAULTS,
  TIKTOK_SHOP_DEFAULTS,
  GROCERY_DEFAULTS,
} from '../config/fees'
import { BENCHMARKS, BENCHMARK_CHECKED, BENCHMARK_SOURCE } from '../config/benchmarks'

/** The date every default on this page was last reviewed against a rate card. */
const CHECKED = '03 JUL 2026'

interface Row {
  label: string
  value: string
  source: string
}

interface Section {
  heading: string
  blurb: string
  rows: Row[]
}

const pctStr = (v: number) => `${(v * 100).toFixed(v * 100 % 1 === 0 ? 0 : 1)}%`
const gbpStr = (v: number) => `£${v.toFixed(2)}`

const SECTIONS: Section[] = [
  {
    heading: 'VAT',
    blurb: 'Prices are entered inc VAT and stripped to ex-VAT before any margin maths.',
    rows: [
      { label: UK_VAT_RATE.label, value: pctStr(UK_VAT_RATE.value), source: 'HMRC standard rate. Most food is zero-rated — set per product.' },
    ],
  },
  {
    heading: 'UK grocery chain',
    blurb: 'Retailer and wholesaler margins are indicative starting points. Your real terms override them everywhere.',
    rows: [
      { label: GROCERY_DEFAULTS.retailerMarginPercent.label, value: pctStr(GROCERY_DEFAULTS.retailerMarginPercent.value), source: 'Typical UK multiple front margin, 30–40% on RSP ex-VAT. Category and retailer dependent.' },
      { label: GROCERY_DEFAULTS.wholesalerMarginPercent.label, value: pctStr(GROCERY_DEFAULTS.wholesalerMarginPercent.value), source: 'Typical UK wholesaler margin, 20–30% on their selling price. Zero if you sell direct.' },
    ],
  },
  {
    heading: 'Amazon FBA (UK)',
    blurb: 'Fulfilment is looked up from your size tier and weight; the rest are the published defaults.',
    rows: [
      { label: AMAZON_FBA_DEFAULTS.referralFeePercent.label, value: pctStr(AMAZON_FBA_DEFAULTS.referralFeePercent.value), source: 'Amazon Seller Central referral schedule. 8–15% by category; 15% for most grocery.' },
      { label: AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit.label, value: `${gbpStr(AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit.value)} (standard parcel)`, source: 'Amazon UK FBA fulfilment fee schedule, by size tier and unit weight.' },
      { label: AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit.label, value: gbpStr(AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit.value), source: 'Amazon UK monthly storage. Higher Oct–Dec — verify for peak.' },
      { label: AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge.label, value: pctStr(AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge.value), source: 'Amazon UK fuel & inflation surcharge on fulfilment. Verify it still applies.' },
      { label: AMAZON_FBA_DEFAULTS.professionalPlanMonthly.label, value: `${gbpStr(AMAZON_FBA_DEFAULTS.professionalPlanMonthly.value)} / month`, source: 'Amazon Professional selling plan, excl. VAT.' },
    ],
  },
  {
    heading: 'TikTok Shop (UK)',
    blurb: 'Commission is set by your category; affiliate and refund admin you set per product.',
    rows: [
      { label: TIKTOK_SHOP_DEFAULTS.platformCommission.label, value: pctStr(TIKTOK_SHOP_DEFAULTS.platformCommission.value), source: 'TikTok Shop Seller Centre commission. 5% for some Beauty/Electronics, 9% most else.' },
      { label: TIKTOK_SHOP_DEFAULTS.affiliateCommission.label, value: pctStr(TIKTOK_SHOP_DEFAULTS.affiliateCommission.value), source: 'Creator affiliate rate you set — typical range 10–20%.' },
      { label: TIKTOK_SHOP_DEFAULTS.perOrderFee.label, value: gbpStr(TIKTOK_SHOP_DEFAULTS.perOrderFee.value), source: 'Indicative per-order handling. Verify on Seller Centre.' },
      { label: TIKTOK_SHOP_DEFAULTS.refundAdminPercent.label, value: pctStr(TIKTOK_SHOP_DEFAULTS.refundAdminPercent.value), source: 'Estimated returns/refunds admin. Set from your category return rate.' },
    ],
  },
]

/**
 * The Rate Card — every fee default in one place, with what it is, when it was
 * checked and where it comes from. The trust backbone: the maths is only as
 * good as these numbers, so they are shown, dated and sourced, and every one
 * is editable on its calculator.
 */
export default function Methodology() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <PageHeader
        sku="50 00000"
        group="TRUST"
        type="RATE CARD"
        title="The Rate Card"
        subtitle="Every default, dated and sourced. Check it against your own."
        stampNote="this is the source of truth"
      />
      <IntroLine />

      <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
        <div className="max-w-[900px] mx-auto">
          <div className="border-2 border-ink bg-white p-[clamp(18px,3vw,30px)]">
            <p className="font-mono text-[13px] leading-relaxed m-0">
              The maths is sacred. The numbers it runs on are not — rate cards move. Every
              default below is a starting point, dated and attributed, and every one is an
              editable field on its calculator. Change it there and the whole model reprices.
              Nothing here is stored; the figures are checked by hand and the date says when.
            </p>
            <div className="font-mono text-[11px] mt-4 border-2 border-ink bg-ink text-bile inline-block px-2.5 py-1">
              DEFAULTS CHECKED: {CHECKED}
            </div>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.heading} className="mt-8">
              <h2 className="font-display text-[clamp(24px,3vw,36px)] tracking-[-0.01em] m-0">{section.heading}</h2>
              <p className="text-sm mt-1.5 mb-3.5 max-w-[64ch]">{section.blurb}</p>
              <div className="border-2 border-ink">
                <div className="hidden min-[721px]:grid grid-cols-[1fr_auto_2fr] gap-4 bg-ink text-bile font-mono text-[11px] tracking-[0.08em] px-4 py-2">
                  <span>DEFAULT</span>
                  <span className="text-right">VALUE</span>
                  <span>WHERE IT COMES FROM</span>
                </div>
                {section.rows.map((row, i) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-1 min-[721px]:grid-cols-[1fr_auto_2fr] gap-1 min-[721px]:gap-4 px-4 py-3 ${i > 0 ? 'border-t-2 border-dotted border-ink' : ''}`}
                  >
                    <span className="font-semibold text-sm">{row.label}</span>
                    <span className="font-mono text-sm min-[721px]:text-right">{row.value}</span>
                    <span className="text-[13px] opacity-80">{row.source}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8">
            <h2 className="font-display text-[clamp(24px,3vw,36px)] tracking-[-0.01em] m-0">Category benchmarks</h2>
            <p className="text-sm mt-1.5 mb-3.5 max-w-[64ch]">
              The P&L shows an indicative brand gross-margin range for your category. These are
              broad bands for a sense-check — not targets, and never a precise figure. {BENCHMARK_SOURCE}
            </p>
            <div className="border-2 border-ink">
              <div className="hidden min-[721px]:grid grid-cols-[1fr_auto] gap-4 bg-ink text-bile font-mono text-[11px] tracking-[0.08em] px-4 py-2">
                <span>CATEGORY</span>
                <span className="text-right">GROSS MARGIN (OF NET REVENUE)</span>
              </div>
              {BENCHMARKS.map((b, i) => (
                <div key={b.category} className={`grid grid-cols-1 min-[721px]:grid-cols-[1fr_auto] gap-1 min-[721px]:gap-4 px-4 py-3 ${i > 0 ? 'border-t-2 border-dotted border-ink' : ''}`}>
                  <span className="font-semibold text-sm">{b.category}</span>
                  <span className="font-mono text-sm min-[721px]:text-right">{(b.low * 100).toFixed(0)}% – {(b.high * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div className="font-mono text-[11px] mt-2 opacity-60">Indicative, checked {BENCHMARK_CHECKED}. Widen or edit in the benchmark config.</div>
          </div>

          <div className="mt-8 border-2 border-ink bg-ink text-receipt p-[clamp(18px,3vw,30px)]">
            <div className="font-mono text-[11px] tracking-[0.1em] text-bile">SIZE TIERS &amp; CATEGORY TABLES</div>
            <p className="text-sm mt-2 mb-0 max-w-[64ch]">
              The Amazon Cut looks fulfilment up from a UK size-tier table (small envelope to
              large oversize) and referral from a per-category table; The TikTok Cut sets
              commission from its own category table. All three live in the fee config and are
              summarised on their calculators — pick your category and they set themselves.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => { setActiveCalculator('amazon-fba'); window.scrollTo(0, 0) }}
              className="border-2 border-ink bg-receipt text-ink px-4 py-3 text-sm font-semibold cursor-pointer hover:bg-bile"
            >
              The Amazon Cut
            </button>
            <button
              onClick={() => { setActiveCalculator('tiktok-shop'); window.scrollTo(0, 0) }}
              className="border-2 border-ink bg-receipt text-ink px-4 py-3 text-sm font-semibold cursor-pointer hover:bg-bile"
            >
              The TikTok Cut
            </button>
            <button
              onClick={() => { setActiveCalculator('retailer-pnl'); window.scrollTo(0, 0) }}
              className="border-2 border-ink bg-receipt text-ink px-4 py-3 text-sm font-semibold cursor-pointer hover:bg-bile"
            >
              The P&L
            </button>
          </div>

          <p className="font-mono text-[11px] mt-8 opacity-60">
            VAT number: not applicable. This is a website.
          </p>
        </div>
      </div>

      <GrossFooter />
    </div>
  )
}
