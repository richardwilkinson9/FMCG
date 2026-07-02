import { useState } from 'react'
import { useStore } from '../store/useStore'
import { retailerPnL, formatGBP, formatPercent } from '../utils/calculations'
import { GROCERY_DEFAULTS } from '../config/fees'
import FeeInput from '../components/FeeInput'
import ResultCard from '../components/ResultCard'

export default function RetailerPnL() {
  const product = useStore((s) => s.getActiveProduct())
  const [retailerMargin, setRetailerMargin] = useState(GROCERY_DEFAULTS.retailerMarginPercent.value)
  const [useWholesaler, setUseWholesaler] = useState(false)
  const [wholesalerMargin, setWholesalerMargin] = useState(GROCERY_DEFAULTS.wholesalerMarginPercent.value)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const wsMargin = useWholesaler ? wholesalerMargin : 0
  const result = retailerPnL(product, retailerMargin, wsMargin)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Retailer P&L / Margin Builder</h3>
        <p className="text-sm text-slate-500">
          From your cost price and RRP, see the full margin waterfall — including wholesaler if applicable.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end max-w-2xl">
        <div className="w-48">
          <FeeInput
            fee={GROCERY_DEFAULTS.retailerMarginPercent}
            value={retailerMargin}
            onChange={setRetailerMargin}
            isPercent
            step="0.5"
          />
        </div>

        <div className="flex items-center gap-3 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useWholesaler}
              onChange={(e) => setUseWholesaler(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Via wholesaler</span>
          </label>
        </div>

        {useWholesaler && (
          <div className="w-48">
            <FeeInput
              fee={GROCERY_DEFAULTS.wholesalerMarginPercent}
              value={wholesalerMargin}
              onChange={setWholesalerMargin}
              isPercent
              step="0.5"
            />
          </div>
        )}
      </div>

      {/* Margin waterfall */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="RSP ex-VAT" value={formatGBP(result.rspExVat)} />
        <ResultCard label="Cost to retailer" value={formatGBP(result.costToRetailer)} />
        <ResultCard label="Retailer margin/unit" value={formatGBP(result.retailerMarginPerUnit)} />
        <ResultCard label="Retailer margin %" value={formatPercent(result.retailerMarginPercent)} />
      </div>

      {useWholesaler && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ResultCard label="Wholesaler margin/unit" value={formatGBP(result.wholesalerMarginPerUnit)} />
          <ResultCard label="Wholesaler margin %" value={formatPercent(result.wholesalerMarginPercent)} />
          <ResultCard label="Cost to wholesaler (your price)" value={formatGBP(result.costToWholesaler)} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard
          label="Your gross margin/unit"
          value={formatGBP(result.brandGrossMarginPerUnit)}
          highlight={result.brandGrossMarginPerUnit > 0}
          negative={result.brandGrossMarginPerUnit < 0}
        />
        <ResultCard
          label="Your gross margin %"
          value={formatPercent(result.brandGrossMarginPercent)}
          highlight={result.brandGrossMarginPercent > 0}
          negative={result.brandGrossMarginPercent < 0}
        />
        <ResultCard label="Revenue/case" value={formatGBP(result.revenuePerCase)} />
        <ResultCard
          label="Margin/case"
          value={formatGBP(result.marginPerCase)}
          highlight={result.marginPerCase > 0}
          negative={result.marginPerCase < 0}
        />
      </div>
    </div>
  )
}
