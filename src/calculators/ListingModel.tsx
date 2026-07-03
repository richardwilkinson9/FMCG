import { useState } from 'react'
import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { listingModel, formatGBP, formatNumber } from '../utils/calculations'
import GroceryChainSettings from '../components/GroceryChainSettings'
import NumberInput from '../components/NumberInput'
import ResultCard from '../components/ResultCard'

export default function ListingModel() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const listing = useStore((s) => s.scenario.listing)
  const updateScenario = useStore((s) => s.updateScenario)
  const [showWeekly, setShowWeekly] = useState(false)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = listingModel(product, grocery.retailerMargin, {
    stores: listing.stores,
    skus: listing.skus,
    weeksInPeriod: listing.weeksInPeriod,
    promoWeeks: listing.promoWeeks,
    promoStartWeek: listing.promoStartWeek,
    promoUpliftPercent: listing.promoUplift,
  }, activeWholesalerMargin(grocery))

  const promoExceedsPeriod = listing.promoWeeks > listing.weeksInPeriod
  const promoClamped =
    !promoExceedsPeriod &&
    listing.promoWeeks > 0 &&
    listing.promoStartWeek + listing.promoWeeks - 1 > listing.weeksInPeriod

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Retailer Listing Model</h3>
        <p className="text-sm text-slate-500">
          Project your revenue, volume and gross margin across a store estate, week by week.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
        <NumberInput label="Stores" min={0} value={listing.stores}
          onChange={(v) => updateScenario('listing', { stores: Math.round(v) })}
          help="Stores stocking the product" />
        <NumberInput label="SKUs" min={0} value={listing.skus}
          onChange={(v) => updateScenario('listing', { skus: Math.round(v) })}
          help="Listed lines of this product" />
        <NumberInput label="Weeks in period" min={0} value={listing.weeksInPeriod}
          onChange={(v) => updateScenario('listing', { weeksInPeriod: Math.min(Math.round(v), 104) })}
          help="52 = a full year (104 max)" />
        <NumberInput label="Promo start week" min={1} value={listing.promoStartWeek}
          onChange={(v) => updateScenario('listing', { promoStartWeek: Math.round(v) })}
          help="Week the promotion begins" />
        <NumberInput label="Promo weeks" min={0} value={listing.promoWeeks}
          onChange={(v) => updateScenario('listing', { promoWeeks: Math.round(v) })}
          help="Length of the promotion" />
        <NumberInput label="Promo volume uplift" suffix="%" min={0} value={listing.promoUplift * 100}
          onChange={(v) => updateScenario('listing', { promoUplift: v / 100 })}
          help="Extra volume during promo weeks" />
      </div>

      <GroceryChainSettings />

      {promoExceedsPeriod ? (
        <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          Promo weeks can't exceed the weeks in the period.
        </p>
      ) : (
        <>
          {promoClamped && (
            <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
              The promotion runs past the end of the period, so only the weeks inside the period are counted. Start it earlier or extend the period.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ResultCard label="Total volume (units)" value={formatNumber(result.totalVolume)} highlight />
            <ResultCard label="Total cases" value={formatNumber(result.totalCases)} />
            <ResultCard label="Total revenue" value={formatGBP(result.totalRevenue)} sub="Your net revenue, not retail sales value" highlight />
            <ResultCard label="Gross margin" value={formatGBP(result.totalGrossMargin)} highlight />
            <ResultCard label="Base weekly volume" value={formatNumber(result.weeklyVolume)} />
            <ResultCard label="Promo weekly volume" value={formatNumber(result.promoWeeklyVolume)} />
          </div>

          {/* Week-by-week phasing */}
          <div>
            <button
              onClick={() => setShowWeekly(!showWeekly)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 no-print"
              aria-expanded={showWeekly}
            >
              {showWeekly ? '▾ Hide' : '▸ Show'} week-by-week phasing
            </button>

            {showWeekly && (
              <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Weekly sales phasing</caption>
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th scope="col" className="text-left py-2 px-3 font-medium text-slate-500">Wk</th>
                        <th scope="col" className="text-left py-2 px-3 font-medium text-slate-500">Promo</th>
                        <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Volume</th>
                        <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Revenue</th>
                        <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Margin</th>
                        <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Cum. revenue</th>
                        <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Cum. margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.weeks.map((w) => (
                        <tr key={w.week} className={`border-b border-slate-100 ${w.onPromo ? 'bg-amber-50' : ''}`}>
                          <td className="py-1.5 px-3 text-slate-700">{w.week}</td>
                          <td className="py-1.5 px-3">
                            {w.onPromo && (
                              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                Promo
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-700">{formatNumber(w.volume)}</td>
                          <td className="py-1.5 px-3 text-right text-slate-700">{formatGBP(w.revenue)}</td>
                          <td className="py-1.5 px-3 text-right text-slate-700">{formatGBP(w.grossMargin)}</td>
                          <td className="py-1.5 px-3 text-right text-slate-500">{formatGBP(w.cumulativeRevenue)}</td>
                          <td className="py-1.5 px-3 text-right text-slate-500">{formatGBP(w.cumulativeMargin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 px-3 py-2 bg-slate-50 border-t border-slate-200">
                  This phasing drives the Supply Plan tab, and exports to Excel as a live formula-driven sheet.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
