import { useState } from 'react'
import { useStore } from '../store/useStore'
import { tradeSpendROI, formatGBP, formatNumber } from '../utils/calculations'
import { GROCERY_DEFAULTS } from '../config/fees'
import FeeInput from '../components/FeeInput'
import ResultCard from '../components/ResultCard'

export default function TradeSpendROI() {
  const product = useStore((s) => s.getActiveProduct())
  const [retailerMargin, setRetailerMargin] = useState(GROCERY_DEFAULTS.retailerMarginPercent.value)
  const [investment, setInvestment] = useState(10000)
  const [targetROI, setTargetROI] = useState(200)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = tradeSpendROI(product, retailerMargin, investment, targetROI / 100)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Trade Spend ROI</h3>
        <p className="text-sm text-slate-500">
          Given an investment (promo funding, listing fees, price support), how much incremental volume do you need to break even and hit your target return?
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Investment £</label>
          <input type="number" step="500" min="0" value={investment}
            onChange={(e) => setInvestment(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target ROI %</label>
          <input type="number" step="10" min="0" value={targetROI}
            onChange={(e) => setTargetROI(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <FeeInput fee={GROCERY_DEFAULTS.retailerMarginPercent} value={retailerMargin} onChange={setRetailerMargin} isPercent step="0.5" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ResultCard label="Margin per unit" value={formatGBP(result.marginPerUnit)} />
        <ResultCard label="Margin per case" value={formatGBP(result.marginPerCase)} />
        <ResultCard label="Break-even units" value={formatNumber(Math.ceil(result.breakEvenUnits))} highlight />
        <ResultCard label="Break-even cases" value={formatNumber(Math.ceil(result.breakEvenCases))} highlight />
        <ResultCard label={`Units for ${targetROI}% ROI`} value={formatNumber(Math.ceil(result.targetReturnUnits))} />
        <ResultCard label={`Cases for ${targetROI}% ROI`} value={formatNumber(Math.ceil(result.targetReturnCases))} />
      </div>
    </div>
  )
}
