import { useState } from 'react'
import { useStore } from '../store/useStore'
import {
  crossChannelComparison,
  formatGBP,
  formatPercent,
  type AmazonFBAFees,
  type TikTokFees,
} from '../utils/calculations'
import { GROCERY_DEFAULTS, AMAZON_FBA_DEFAULTS, TIKTOK_SHOP_DEFAULTS } from '../config/fees'
import Tooltip from '../components/Tooltip'

export default function CrossChannel() {
  const product = useStore((s) => s.getActiveProduct())

  const [retailerMargin, setRetailerMargin] = useState(GROCERY_DEFAULTS.retailerMarginPercent.value)
  const [useWholesaler, setUseWholesaler] = useState(false)
  const [wholesalerMargin, setWholesalerMargin] = useState(GROCERY_DEFAULTS.wholesalerMarginPercent.value)
  const [amazonFees, setAmazonFees] = useState<AmazonFBAFees>({
    referralFeePercent: AMAZON_FBA_DEFAULTS.referralFeePercent.value,
    fulfilmentFeePerUnit: AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit.value,
    monthlyStoragePerUnit: AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit.value,
    fuelLogisticsSurcharge: AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge.value,
  })
  const [tiktokFees, setTiktokFees] = useState<TikTokFees>({
    platformCommission: TIKTOK_SHOP_DEFAULTS.platformCommission.value,
    affiliateCommission: TIKTOK_SHOP_DEFAULTS.affiliateCommission.value,
    perOrderFee: TIKTOK_SHOP_DEFAULTS.perOrderFee.value,
    refundAdminPercent: TIKTOK_SHOP_DEFAULTS.refundAdminPercent.value,
  })

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const wsMargin = useWholesaler ? wholesalerMargin : 0
  const comparison = crossChannelComparison(product, retailerMargin, amazonFees, tiktokFees, wsMargin)
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

      {/* Compact fee controls */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
          Adjust channel fees
        </summary>
        <div className="mt-4 space-y-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Grocery</h4>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-48">
                <label className="block text-sm text-slate-600 mb-1">Retailer margin %</label>
                <input type="number" step="0.5" value={retailerMargin * 100}
                  onChange={(e) => setRetailerMargin((parseFloat(e.target.value) || 0) / 100)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={useWholesaler} onChange={(e) => setUseWholesaler(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">
                  Via wholesaler
                  <Tooltip text={GROCERY_DEFAULTS.wholesalerMarginPercent.note} />
                </span>
              </label>
              {useWholesaler && (
                <div className="w-48">
                  <label className="block text-sm text-slate-600 mb-1">Wholesaler margin %</label>
                  <input type="number" step="0.5" value={wholesalerMargin * 100}
                    onChange={(e) => setWholesalerMargin((parseFloat(e.target.value) || 0) / 100)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Amazon FBA</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Referral %</label>
                <input type="number" step="0.5" value={amazonFees.referralFeePercent * 100}
                  onChange={(e) => setAmazonFees({ ...amazonFees, referralFeePercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Fulfilment £</label>
                <input type="number" step="0.05" value={amazonFees.fulfilmentFeePerUnit}
                  onChange={(e) => setAmazonFees({ ...amazonFees, fulfilmentFeePerUnit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Storage £/unit</label>
                <input type="number" step="0.01" value={amazonFees.monthlyStoragePerUnit}
                  onChange={(e) => setAmazonFees({ ...amazonFees, monthlyStoragePerUnit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Fuel surcharge %</label>
                <input type="number" step="0.1" value={amazonFees.fuelLogisticsSurcharge * 100}
                  onChange={(e) => setAmazonFees({ ...amazonFees, fuelLogisticsSurcharge: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">TikTok Shop</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Platform %</label>
                <input type="number" step="0.5" value={tiktokFees.platformCommission * 100}
                  onChange={(e) => setTiktokFees({ ...tiktokFees, platformCommission: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Affiliate %</label>
                <input type="number" step="0.5" value={tiktokFees.affiliateCommission * 100}
                  onChange={(e) => setTiktokFees({ ...tiktokFees, affiliateCommission: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Per-order £</label>
                <input type="number" step="0.05" value={tiktokFees.perOrderFee}
                  onChange={(e) => setTiktokFees({ ...tiktokFees, perOrderFee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Refund admin %</label>
                <input type="number" step="0.5" value={tiktokFees.refundAdminPercent * 100}
                  onChange={(e) => setTiktokFees({ ...tiktokFees, refundAdminPercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>
        </div>
      </details>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-medium text-slate-500">Channel</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">Net Revenue/Unit</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">COGS/Unit</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">Gross Profit/Unit</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">Gross Margin %</th>
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
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {ch.channel}
                    {isBest && (
                      <span className="ml-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Best
                      </span>
                    )}
                  </td>
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
                  width > 30 ? 'left-3 text-white' : 'left-[calc(100%+8px)] text-slate-700'
                }`} style={width <= 30 ? { left: `${width + 2}%` } : undefined}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
