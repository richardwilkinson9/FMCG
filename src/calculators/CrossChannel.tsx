import { useStore } from '../store/useStore'
import {
  activeWholesalerMargin,
  effectiveAmazonFees,
  effectiveTikTokFees,
} from '../store/scenario'
import { crossChannelComparison, formatGBP, formatPercent } from '../utils/calculations'
import GroceryChainSettings from '../components/GroceryChainSettings'

export default function CrossChannel() {
  const product = useStore((s) => s.getActiveProduct())
  const scenario = useStore((s) => s.scenario)
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const amazonFees = effectiveAmazonFees(scenario.amazon)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const comparison = crossChannelComparison(
    product,
    scenario.grocery.retailerMargin,
    amazonFees,
    tiktokFees,
    activeWholesalerMargin(scenario.grocery),
  )
  const channels = [comparison.grocery, comparison.amazon, comparison.tiktok]
  const bestMargin = Math.max(...channels.map((c) => c.grossMarginPercent))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Cross-Channel Comparison</h3>
        <p className="text-sm text-slate-500">
          Your true net margin side by side across UK Grocery, Amazon FBA and TikTok Shop. Same product, different economics.
        </p>
      </div>

      {/* One source of truth: this view uses the fees set on each calculator tab */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 no-print">
        <GroceryChainSettings />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 pt-1 border-t border-slate-200">
          <span>
            Amazon: {formatPercent(amazonFees.referralFeePercent)} referral + {formatGBP(amazonFees.fulfilmentFeePerUnit)} fulfilment
            {' — '}
            <button onClick={() => setActiveCalculator('amazon-fba')} className="text-blue-600 hover:underline">
              edit on the Amazon FBA tab
            </button>
          </span>
          <span>
            TikTok: {formatPercent(tiktokFees.platformCommission)} commission + {formatPercent(tiktokFees.affiliateCommission)} affiliate
            {' — '}
            <button onClick={() => setActiveCalculator('tiktok-shop')} className="text-blue-600 hover:underline">
              edit on the TikTok Shop tab
            </button>
          </span>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Net margin comparison across sales channels</caption>
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" className="text-left py-3 px-4 font-medium text-slate-500">Channel</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-slate-500">Net Revenue/Unit</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-slate-500">COGS/Unit</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-slate-500">Gross Profit/Unit</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-slate-500">Gross Margin %</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((ch) => {
              const isBest = ch.grossMarginPercent === bestMargin && bestMargin > 0
              const isNegative = ch.grossMarginPercent < 0
              return (
                <tr
                  key={ch.channel}
                  className={`border-b border-slate-100 ${
                    isBest ? 'bg-emerald-50' : isNegative ? 'bg-red-50' : ''
                  }`}
                >
                  <th scope="row" className="py-3 px-4 font-medium text-slate-900 text-left">
                    {ch.channel}
                    {isBest && (
                      <span className="ml-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Best
                      </span>
                    )}
                  </th>
                  <td className="py-3 px-4 text-right text-slate-700">{formatGBP(ch.netRevenuePerUnit)}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{formatGBP(ch.cogsPerUnit)}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${isNegative ? 'text-red-700' : 'text-slate-900'}`}>
                    {formatGBP(ch.grossProfitPerUnit)}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${isNegative ? 'text-red-700' : isBest ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {formatPercent(ch.grossMarginPercent)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Visual bar chart */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-600">Margin comparison</h4>
        {channels.map((ch) => {
          const pct = ch.grossMarginPercent * 100
          const width = Math.min(Math.max(Math.abs(pct), 2), 100)
          const isNegative = pct < 0
          return (
            <div key={ch.channel} className="flex items-center gap-3">
              <div className="w-44 text-sm text-slate-700 shrink-0">{ch.channel}</div>
              <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg transition-all ${
                    isNegative ? 'bg-red-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${width}%` }}
                />
                <span className={`absolute inset-y-0 flex items-center text-xs font-semibold ${
                  width > 30 ? 'left-3 text-white' : 'text-slate-700'
                }`} style={width <= 30 ? { left: `${width + 2}%` } : undefined}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-400">
        Margins shown are gross margins on net revenue per unit, before overheads, advertising and returns. Marketplace channels avoid the retailer's margin but carry per-unit fees — the comparison is most useful for deciding where a given RRP works hardest.
      </p>
    </div>
  )
}
