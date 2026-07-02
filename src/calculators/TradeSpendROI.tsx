import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { tradeSpendROI, formatGBP, formatNumber } from '../utils/calculations'
import GroceryChainSettings from '../components/GroceryChainSettings'
import NumberInput from '../components/NumberInput'
import ResultCard from '../components/ResultCard'

export default function TradeSpendROI() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const tradeSpend = useStore((s) => s.scenario.tradeSpend)
  const updateScenario = useStore((s) => s.updateScenario)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = tradeSpendROI(
    product,
    grocery.retailerMargin,
    tradeSpend.investment,
    tradeSpend.targetROI,
    activeWholesalerMargin(grocery),
  )
  const noMargin = result.marginPerUnit <= 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Trade Spend ROI</h3>
        <p className="text-sm text-slate-500">
          Given an investment (promo funding, listing fees, price support), how much incremental volume do you need to break even and hit your target return?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <NumberInput label="Investment" prefix="£" min={0} value={tradeSpend.investment}
          onChange={(v) => updateScenario('tradeSpend', { investment: v })}
          help="Total trade spend at risk" />
        <NumberInput label="Target ROI" suffix="%" min={0} value={tradeSpend.targetROI * 100}
          onChange={(v) => updateScenario('tradeSpend', { targetROI: v / 100 })}
          help="e.g. 200% = £3 back per £1 spent" />
      </div>

      <GroceryChainSettings />

      {noMargin ? (
        <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          Your margin per unit is zero or negative at these chain margins — no volume of incremental sales can pay back the investment. Fix the margin first.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ResultCard label="Margin per unit" value={formatGBP(result.marginPerUnit)} />
          <ResultCard label="Margin per case" value={formatGBP(result.marginPerCase)} />
          <ResultCard label="Break-even units" value={formatNumber(Math.ceil(result.breakEvenUnits))} sub="Incremental units to recover the spend" highlight />
          <ResultCard label="Break-even cases" value={formatNumber(Math.ceil(result.breakEvenCases))} highlight />
          <ResultCard label={`Units for ${Math.round(tradeSpend.targetROI * 100)}% ROI`} value={formatNumber(Math.ceil(result.targetReturnUnits))} />
          <ResultCard label={`Cases for ${Math.round(tradeSpend.targetROI * 100)}% ROI`} value={formatNumber(Math.ceil(result.targetReturnCases))} />
        </div>
      )}
    </div>
  )
}
