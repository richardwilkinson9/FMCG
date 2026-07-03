import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { weeklyProjection, stockLedger, formatNumber } from '../utils/calculations'
import NumberInput from '../components/NumberInput'
import ResultCard from '../components/ResultCard'

export default function StockForecast() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const listing = useStore((s) => s.scenario.listing)
  const stock = useStore((s) => s.scenario.stock)
  const updateScenario = useStore((s) => s.updateScenario)
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  // Demand comes straight from the listing projection, promo spikes included
  const weeks = weeklyProjection(product, grocery.retailerMargin, {
    stores: listing.stores,
    skus: listing.skus,
    weeksInPeriod: listing.weeksInPeriod,
    promoWeeks: listing.promoWeeks,
    promoStartWeek: listing.promoStartWeek,
    promoUpliftPercent: listing.promoUplift,
  }, activeWholesalerMargin(grocery))

  const plan = stockLedger(
    weeks.map((w) => w.volume),
    stock.startingStockUnits,
    stock.leadWeeks,
    stock.weeksOfCover,
    product.unitsPerCase,
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Supply Plan</h3>
        <p className="text-sm text-slate-500">
          A week-by-week stock ledger driven by your Listing Model demand — promo spikes pull orders forward, which is exactly when stockouts happen.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
        <NumberInput label="Starting stock" suffix="units" min={0} value={stock.startingStockUnits}
          onChange={(v) => updateScenario('stock', { startingStockUnits: Math.round(v) })}
          help="Stock on hand at week 1" />
        <NumberInput label="Lead time" suffix="wks" min={0} value={stock.leadWeeks}
          onChange={(v) => updateScenario('stock', { leadWeeks: Math.round(v) })}
          help="Weeks from placing an order to stock arriving" />
        <NumberInput label="Weeks of cover" min={0} value={stock.weeksOfCover}
          onChange={(v) => updateScenario('stock', { weeksOfCover: Math.round(v) })}
          help="Buffer ordered on top of lead-time demand" />
      </div>

      <p className="text-xs text-slate-500">
        Demand: {formatNumber(listing.stores)} stores × {product.weeklyRateOfSale} units/week
        {listing.promoWeeks > 0 && `, +${Math.round(listing.promoUplift * 100)}% for ${listing.promoWeeks} promo weeks from week ${listing.promoStartWeek}`}
        {' — '}
        <button onClick={() => setActiveCalculator('listing-model')} className="text-blue-600 hover:underline no-print">
          adjust on the Listing Model tab
        </button>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Total to order" value={formatNumber(plan.totalOrdered)} sub={`${formatNumber(plan.totalOrderedCases)} cases over the period`} highlight />
        <ResultCard label="Purchase orders" value={formatNumber(plan.orderCount)} sub="Times you'll place an order" />
        <ResultCard label="Peak stock held" value={formatNumber(plan.peakStock)} sub="Highest closing stock — warehouse space" />
        <ResultCard
          label="Stockout weeks"
          value={formatNumber(plan.stockoutWeeks)}
          sub={plan.stockoutWeeks > 0 ? `${formatNumber(plan.lostUnits)} units of unmet demand` : 'Demand fully covered'}
          highlight={plan.stockoutWeeks === 0}
          negative={plan.stockoutWeeks > 0}
        />
      </div>

      {plan.stockoutWeeks > 0 && (
        <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          You run out of stock in {plan.stockoutWeeks} week{plan.stockoutWeeks > 1 ? 's' : ''} — usually the promo period arriving before replenishment can. Increase starting stock, shorten the lead time, or hold more weeks of cover.
        </p>
      )}

      {/* Weekly ledger */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Weekly stock ledger</caption>
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th scope="col" className="text-left py-2 px-3 font-medium text-slate-500">Wk</th>
                <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Demand</th>
                <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Opening</th>
                <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Arrivals</th>
                <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Order placed</th>
                <th scope="col" className="text-right py-2 px-3 font-medium text-slate-500">Closing</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((r) => (
                <tr key={r.week} className={`border-b border-slate-100 ${r.shortfall > 0 ? 'bg-red-50' : ''}`}>
                  <td className="py-1.5 px-3 text-slate-700">{r.week}</td>
                  <td className="py-1.5 px-3 text-right text-slate-700">{formatNumber(r.demand)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-500">{formatNumber(r.opening)}</td>
                  <td className="py-1.5 px-3 text-right text-slate-700">{r.arrivals > 0 ? formatNumber(r.arrivals) : '—'}</td>
                  <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                    {r.orderPlaced > 0 ? formatNumber(r.orderPlaced) : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right text-slate-700">{formatNumber(r.closing)}</td>
                  <td className="py-1.5 px-3">
                    {r.shortfall > 0 ? (
                      <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                        Stockout −{formatNumber(r.shortfall)}
                      </span>
                    ) : r.orderPlaced > 0 ? (
                      <span className="text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        Order
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 px-3 py-2 bg-slate-50 border-t border-slate-200">
          Policy: when stock on hand plus stock on order won't cover lead-time demand, order enough to cover the next {stock.leadWeeks + stock.weeksOfCover} weeks, in whole cases. The Excel export makes the order column editable so planners can override it.
        </p>
      </div>
    </div>
  )
}
