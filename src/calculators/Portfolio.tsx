import { useStore } from '../store/useStore'
import {
  activeWholesalerMargin,
  effectiveAmazonFees,
  effectiveTikTokFees,
} from '../store/scenario'
import {
  retailerPnL,
  amazonFBAMargin,
  tiktokShopMargin,
  listingModel,
} from '../utils/calculations'
import { PageHeader, EmptyState, CalcActions } from '../components/gross/CalcShell'
import GrossFooter from '../components/gross/GrossFooter'
import { Receipt, Rule, RLine, RSection } from '../components/gross/Receipt'
import { gbp, pct, n0, BILE, REDUCED, REDPEN, INK } from '../components/gross/format'

/** Traffic light on grocery margin % (same thresholds as The P&L). */
function light(marginPct: number, negative: boolean): string {
  if (negative || marginPct < 0.20) return REDPEN
  if (marginPct < 0.35) return REDUCED
  return BILE
}

/**
 * The Range — every product on one till roll. Reads the whole shelf with the
 * same shared scenario as every other page; grocery projections use the
 * Listing settings applied to each product.
 */
export default function Portfolio() {
  const products = useStore((s) => s.products)
  const scenario = useStore((s) => s.scenario)
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)

  const ws = activeWholesalerMargin(scenario.grocery)
  const amazonFees = effectiveAmazonFees(scenario.amazon)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const listingInputs = {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promoWeeks: scenario.listing.promoWeeks,
    promoStartWeek: scenario.listing.promoStartWeek,
    promoUpliftPercent: scenario.listing.promoUplift,
  }

  const rows = products.map((p) => {
    const grocery = retailerPnL(p, scenario.grocery.retailerMargin, ws)
    const amazon = amazonFBAMargin(p, amazonFees)
    const tiktok = tiktokShopMargin(p, tiktokFees)
    const listing = listingModel(p, scenario.grocery.retailerMargin, listingInputs, ws)
    return { p, grocery, amazon, tiktok, listing }
  })

  const totalRevenue = rows.reduce((a, r) => a + r.listing.totalRevenue, 0)
  const totalMargin = rows.reduce((a, r) => a + r.listing.totalGrossMargin, 0)
  const blended = totalRevenue > 0 ? totalMargin / totalRevenue : 0
  const carrier = rows.length
    ? rows.reduce((a, b) => (b.listing.totalGrossMargin > a.listing.totalGrossMargin ? b : a))
    : null
  const losers = rows.filter((r) => r.grocery.brandGrossMarginPerUnit <= 0)

  let healthColor = BILE
  let healthLabel = 'HEALTHY'
  if (totalMargin <= 0) { healthColor = REDPEN; healthLabel = 'UNDERWATER' }
  else if (blended < 0.20) { healthColor = REDPEN; healthLabel = 'THIN' }
  else if (blended < 0.35) { healthColor = REDUCED; healthLabel = 'TIGHT' }

  let verdict: string
  let verdictColor = INK
  if (rows.length === 0) {
    verdict = ''
  } else if (totalMargin <= 0) {
    verdictColor = REDPEN
    verdict = 'The whole range loses money over the period. This is not a range, it is a leak. Fix the cost prices first.'
  } else if (losers.length > 0) {
    verdict = `${carrier!.p.name} carries the range. ${losers[0].p.name} loses money every time it sells — the buyer will spot it before you do.`
  } else if (rows.length === 1) {
    verdict = `One product is a start, not a range. Blended margin ${pct(blended)}. Duplicate it on The Shelf to test a price move.`
  } else {
    verdict = `Blended margin ${pct(blended)} across ${rows.length} products. ${carrier!.p.name} carries the range.`
  }

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <PageHeader
        sku="50 11027"
        group="COMPARE"
        type="PORTFOLIO"
        title="The Range"
        subtitle="Every product on one till roll."
        stampNote="same assumptions as every page"
      />

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
          <div className="max-w-[900px] mx-auto">
            <Receipt
              tool="THE RANGE"
              name={`${rows.length} product${rows.length === 1 ? '' : 's'} · ${scenario.listing.weeksInPeriod} weeks · ${n0(scenario.listing.stores)} stores`}
              subline="grocery projection uses your Listing settings on every product"
              verdict={verdict}
              verdictColor={verdictColor}
            >
              <Rule className="mt-4 mb-2.5" />
              <RSection label="THE RANGE, PRODUCT BY PRODUCT" health={{ color: healthColor, label: healthLabel }} />

              {/* Table — margin by channel + period margin per product */}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b-2 border-ink text-[11px] tracking-[0.08em] opacity-60">
                      <th scope="col" className="text-left py-2 pr-2 font-normal">PRODUCT</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">RRP</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">GROCERY</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">AMAZON</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">TIKTOK</th>
                      <th scope="col" className="text-right py-2 pl-2 font-normal">PERIOD MARGIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ p, grocery, amazon, tiktok, listing }) => {
                      const isCarrier = carrier && p.id === carrier.p.id && totalMargin > 0 && rows.length > 1
                      const cell = (v: number, str: string) => (
                        <td className="text-right py-2 px-2" style={{ color: v < 0 ? REDPEN : INK }}>{str}</td>
                      )
                      return (
                        <tr key={p.id} className="border-b-2 border-dotted border-ink">
                          <th scope="row" className="text-left py-2 pr-2 font-bold">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 border-2 border-ink inline-block shrink-0"
                                style={{ background: light(grocery.brandGrossMarginPercent, grocery.brandGrossMarginPerUnit <= 0) }}
                              />
                              {p.name || 'Unnamed'}
                              {isCarrier && (
                                <span className="text-[10px] font-normal tracking-[0.08em] border-2 border-ink bg-ink text-bile py-px px-1.5">
                                  CARRIES
                                </span>
                              )}
                            </span>
                          </th>
                          <td className="text-right py-2 px-2">{gbp(p.rrpIncVat)}</td>
                          {cell(grocery.brandGrossMarginPercent, pct(grocery.brandGrossMarginPercent))}
                          {cell(amazon.grossMarginPercent, pct(amazon.grossMarginPercent))}
                          {cell(tiktok.grossMarginPercent, pct(tiktok.grossMarginPercent))}
                          {cell(listing.totalGrossMargin, gbp(listing.totalGrossMargin))}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink font-bold">
                      <th scope="row" className="text-left py-2.5 pr-2">TOTAL</th>
                      <td />
                      <td colSpan={3} className="text-right py-2.5 px-2">
                        blended {pct(blended)}
                      </td>
                      <td className="text-right py-2.5 pl-2" style={{ color: totalMargin < 0 ? REDPEN : INK }}>
                        {gbp(totalMargin)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <Rule className="mt-3.5 mb-2.5" />
              <RLine label="Period net revenue, range" value={gbp(totalRevenue)} />
              <RLine label="Period gross margin, range" value={gbp(totalMargin)} bold color={totalMargin < 0 ? REDPEN : INK} />
            </Receipt>

            <div className="no-print flex gap-3 mt-4">
              <button
                onClick={() => { setActiveCalculator('products'); window.scrollTo(0, 0) }}
                className="flex-1 border-2 border-ink bg-receipt text-ink p-[15px] text-sm font-semibold cursor-pointer hover:bg-bile"
              >
                Edit the range on The Shelf
              </button>
            </div>
            <CalcActions />
          </div>
        </div>
      )}

      <GrossFooter />
    </div>
  )
}
