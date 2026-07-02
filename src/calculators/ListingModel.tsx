import { useState } from 'react'
import { useStore } from '../store/useStore'
import { listingModel, formatGBP, formatNumber } from '../utils/calculations'
import { GROCERY_DEFAULTS } from '../config/fees'
import FeeInput from '../components/FeeInput'
import ResultCard from '../components/ResultCard'

export default function ListingModel() {
  const product = useStore((s) => s.getActiveProduct())
  const [retailerMargin, setRetailerMargin] = useState(GROCERY_DEFAULTS.retailerMarginPercent.value)
  const [stores, setStores] = useState(500)
  const [skus, setSkus] = useState(1)
  const [weeksInPeriod, setWeeksInPeriod] = useState(52)
  const [promoWeeks, setPromoWeeks] = useState(8)
  const [promoUplift, setPromoUplift] = useState(50)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = listingModel(product, retailerMargin, {
    stores,
    skus,
    weeksInPeriod,
    promoWeeks,
    promoUpliftPercent: promoUplift / 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Retailer Listing Model</h3>
        <p className="text-sm text-slate-500">
          Project your revenue, volume and gross margin across a store estate over a given period.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Stores</label>
          <input type="number" min="1" value={stores} onChange={(e) => setStores(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SKUs</label>
          <input type="number" min="1" value={skus} onChange={(e) => setSkus(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weeks in period</label>
          <input type="number" min="1" value={weeksInPeriod} onChange={(e) => setWeeksInPeriod(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Promo weeks</label>
          <input type="number" min="0" value={promoWeeks} onChange={(e) => setPromoWeeks(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Promo volume uplift %</label>
          <input type="number" step="5" min="0" value={promoUplift} onChange={(e) => setPromoUplift(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <FeeInput fee={GROCERY_DEFAULTS.retailerMarginPercent} value={retailerMargin} onChange={setRetailerMargin} isPercent step="0.5" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ResultCard label="Total volume (units)" value={formatNumber(result.totalVolume)} highlight />
        <ResultCard label="Total cases" value={formatNumber(result.totalCases)} />
        <ResultCard label="Total revenue" value={formatGBP(result.totalRevenue)} highlight />
        <ResultCard label="Gross margin" value={formatGBP(result.totalGrossMargin)} highlight />
        <ResultCard label="Base weekly volume" value={formatNumber(result.weeklyVolume)} />
        <ResultCard label="Promo weekly volume" value={formatNumber(result.promoWeeklyVolume)} />
      </div>
    </div>
  )
}
