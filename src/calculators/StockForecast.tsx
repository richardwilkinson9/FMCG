import { useState } from 'react'
import { useStore } from '../store/useStore'
import { stockForecast, formatNumber } from '../utils/calculations'
import ResultCard from '../components/ResultCard'

export default function StockForecast() {
  const product = useStore((s) => s.getActiveProduct())
  const [stores, setStores] = useState(500)
  const [weeksOfCover, setWeeksOfCover] = useState(6)
  const [leadWeeks, setLeadWeeks] = useState(3)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = stockForecast(product, stores, weeksOfCover, leadWeeks)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Stock Forecast</h3>
        <p className="text-sm text-slate-500">
          How much stock to produce and hold, with a simple reorder point based on your rate of sale and distribution.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Stores</label>
          <input type="number" min="1" value={stores} onChange={(e) => setStores(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weeks of cover</label>
          <input type="number" min="1" value={weeksOfCover} onChange={(e) => setWeeksOfCover(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reorder lead time (weeks)</label>
          <input type="number" min="1" value={leadWeeks} onChange={(e) => setLeadWeeks(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ResultCard label="Weekly demand (units)" value={formatNumber(result.weeklyDemand)} />
        <ResultCard label="Total stock (units)" value={formatNumber(result.totalStockUnits)} highlight />
        <ResultCard label="Total stock (cases)" value={formatNumber(Math.ceil(result.totalStockCases))} highlight />
        <ResultCard label="Reorder point (units)" value={formatNumber(result.reorderPointUnits)} />
        <ResultCard label="Reorder point (cases)" value={formatNumber(Math.ceil(result.reorderPointCases))} />
      </div>
    </div>
  )
}
