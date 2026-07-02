import { useStore } from '../store/useStore'
import { stockForecast, formatNumber } from '../utils/calculations'
import NumberInput from '../components/NumberInput'
import ResultCard from '../components/ResultCard'

export default function StockForecast() {
  const product = useStore((s) => s.getActiveProduct())
  const stock = useStore((s) => s.scenario.stock)
  const updateScenario = useStore((s) => s.updateScenario)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = stockForecast(product, stock.stores, stock.weeksOfCover, stock.leadWeeks)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Stock Forecast</h3>
        <p className="text-sm text-slate-500">
          How much stock to produce and hold, with a simple reorder point based on your rate of sale and distribution.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
        <NumberInput label="Stores" min={0} value={stock.stores}
          onChange={(v) => updateScenario('stock', { stores: Math.round(v) })}
          help="Stores stocking the product" />
        <NumberInput label="Weeks of cover" min={0} value={stock.weeksOfCover}
          onChange={(v) => updateScenario('stock', { weeksOfCover: Math.round(v) })}
          help="How many weeks of demand to hold" />
        <NumberInput label="Reorder lead time" suffix="wks" min={0} value={stock.leadWeeks}
          onChange={(v) => updateScenario('stock', { leadWeeks: Math.round(v) })}
          help="Weeks from placing an order to stock arriving" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ResultCard label="Weekly demand (units)" value={formatNumber(result.weeklyDemand)} sub="Rate of sale × stores" />
        <ResultCard label="Stock to hold (units)" value={formatNumber(result.totalStockUnits)} highlight />
        <ResultCard label="Stock to hold (cases)" value={formatNumber(Math.ceil(result.totalStockCases))} highlight />
        <ResultCard label="Reorder point (units)" value={formatNumber(result.reorderPointUnits)} sub="Reorder when stock falls to this level" />
        <ResultCard label="Reorder point (cases)" value={formatNumber(Math.ceil(result.reorderPointCases))} />
      </div>
    </div>
  )
}
