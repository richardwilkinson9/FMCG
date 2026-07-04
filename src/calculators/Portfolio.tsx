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
  channelListed,
} from '../utils/calculations'
import { PageHeader, IntroLine, EmptyState, CalcActions } from '../components/gross/CalcShell'
import GrossFooter from '../components/gross/GrossFooter'
import { Receipt, Rule, RLine, RSection } from '../components/gross/Receipt'
import { gbp, pct, n0, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

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
  const updateProduct = useStore((s) => s.updateProduct)

  const ws = activeWholesalerMargin(scenario.grocery)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const listingInputs = {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promos: scenario.listing.promos,
  }

  const rows = products.map((p) => {
    const grocery = retailerPnL(p, scenario.grocery.retailerMargin, ws)
    // Amazon fees resolve per product so sell-by-case amortises on each case size
    const amazon = amazonFBAMargin(p, effectiveAmazonFees(scenario.amazon, p.unitsPerCase))
    const tiktok = tiktokShopMargin(p, tiktokFees)
    const listing = listingModel(p, scenario.grocery.retailerMargin, listingInputs, ws)
    return { p, grocery, amazon, tiktok, listing, listed: channelListed(p, 'grocery') }
  })

  // The grocery range plan only counts SKUs listed on grocery
  const listedRows = rows.filter((r) => r.listed)
  const totalGsv = listedRows.reduce((a, r) => a + r.listing.totalGsv, 0)
  const totalFunding = listedRows.reduce((a, r) => a + r.listing.totalFunding, 0)
  const totalRevenue = listedRows.reduce((a, r) => a + r.listing.totalNsv, 0)
  const totalMargin = listedRows.reduce((a, r) => a + r.listing.totalGrossMargin, 0)
  // Inbound logistics on the grocery plan, per case across the listed range
  const totalLogistics = listedRows.reduce((a, r) => a + r.listing.totalCases * scenario.grocery.logisticsPerCase, 0)
  const marginAfterLogistics = totalMargin - totalLogistics
  const blended = totalRevenue > 0 ? totalMargin / totalRevenue : 0
  const nsvPctOfGsv = totalGsv > 0 ? totalRevenue / totalGsv : 0
  const carrier = listedRows.length
    ? listedRows.reduce((a, b) => (b.listing.totalGrossMargin > a.listing.totalGrossMargin ? b : a))
    : null
  const losers = listedRows.filter((r) => r.grocery.brandGrossMarginPerUnit <= 0)

  let healthColor = BILE
  let healthLabel = HEALTH.healthy
  if (totalMargin <= 0) { healthColor = REDPEN; healthLabel = HEALTH.underwater }
  else if (blended < 0.20) { healthColor = REDPEN; healthLabel = HEALTH.thin }
  else if (blended < 0.35) { healthColor = REDUCED; healthLabel = HEALTH.tight }

  let verdict: string
  let verdictColor = INK
  if (rows.length === 0) {
    verdict = ''
  } else if (listedRows.length === 0) {
    verdict = 'No SKUs listed on grocery. Tick some back in to build the range plan.'
  } else if (totalMargin <= 0) {
    verdictColor = REDPEN
    verdict = 'The listed range loses money over the period. This is not a range, it is a leak. Fix the cost prices first.'
  } else if (losers.length > 0) {
    verdict = `${carrier!.p.name} carries the range. ${losers[0].p.name} loses money every time it sells — the buyer will spot it before you do.`
  } else if (listedRows.length === 1) {
    verdict = `One product is a start, not a range. Blended margin ${pct(blended)}. Duplicate it on The Shelf to test a price move.`
  } else {
    verdict = `Blended margin ${pct(blended)} across ${listedRows.length} listed products. ${carrier!.p.name} carries the range.`
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
      <IntroLine />

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
                      <th scope="col" className="text-center py-2 pr-1 font-normal" title="Listed on grocery">IN</th>
                      <th scope="col" className="text-left py-2 pr-2 font-normal">PRODUCT</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">RRP</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">GROCERY</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">AMAZON</th>
                      <th scope="col" className="text-right py-2 px-2 font-normal">TIKTOK</th>
                      <th scope="col" className="text-right py-2 pl-2 font-normal">PERIOD MARGIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ p, grocery, amazon, tiktok, listing, listed }) => {
                      const isCarrier = carrier && p.id === carrier.p.id && totalMargin > 0 && listedRows.length > 1
                      const cell = (v: number, str: string) => (
                        <td className="text-right py-2 px-2" style={{ color: !listed ? '#0A0A0A55' : v < 0 ? REDPEN : INK }}>{str}</td>
                      )
                      return (
                        <tr key={p.id} className="border-b-2 border-dotted border-ink" style={{ opacity: listed ? 1 : 0.55 }}>
                          <td className="text-center pr-1">
                            <input
                              type="checkbox"
                              checked={listed}
                              aria-label={`${p.name || 'Product'} listed on grocery`}
                              onChange={(e) => updateProduct(p.id, { channels: { ...p.channels, grocery: e.target.checked } })}
                              className="w-[15px] h-[15px] accent-[#0A0A0A] align-middle"
                            />
                          </td>
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
                          {listed ? cell(listing.totalGrossMargin, gbp(listing.totalGrossMargin)) : <td className="text-right py-2 px-2" style={{ color: '#0A0A0A55' }}>out</td>}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink font-bold">
                      <td />
                      <th scope="row" className="text-left py-2.5 pr-2">TOTAL (listed)</th>
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
              <RSection label="THE ANNUAL PLAN — WHOLE RANGE" />
              <RLine
                label="Period volume, range"
                value={`${n0(rows.reduce((a, r) => a + r.listing.totalVolume, 0))} units · ${n0(rows.reduce((a, r) => a + r.listing.totalCases, 0))} cases`}
                dim
              />
              <RLine label="GSV (invoice, full list)" value={gbp(totalGsv)} bold />
              <RLine label="less promo funding" value={totalFunding > 0 ? `−${gbp(totalFunding).replace('−', '')}` : gbp(0)} dim color={totalFunding > 0 ? REDPEN : undefined} />
              <RLine label="NSV, range" value={gbp(totalRevenue)} bold />
              <RLine label="NSV as % of GSV" value={pct(nsvPctOfGsv)} dim />
              <RLine label="Gross margin, range" value={gbp(totalMargin)} bold color={totalMargin < 0 ? REDPEN : INK} />
              <RLine label="GM as % of NSV (blended)" value={pct(blended)} dim color={totalMargin < 0 ? REDPEN : INK} />
              {scenario.grocery.logisticsPerCase > 0 && (
                <>
                  <RLine label="less inbound logistics, range" value={`−${gbp(totalLogistics).replace('−', '')}`} dim color={REDPEN} />
                  <RLine label="Margin after logistics, range" value={gbp(marginAfterLogistics)} bold color={marginAfterLogistics < 0 ? REDPEN : INK} />
                </>
              )}
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
