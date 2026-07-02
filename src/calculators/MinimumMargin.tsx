import { useState } from 'react'
import { useStore } from '../store/useStore'
import { solveForCostPrice, solveForRrp, formatGBP } from '../utils/calculations'
import { GROCERY_DEFAULTS } from '../config/fees'
import ResultCard from '../components/ResultCard'
import Tooltip from '../components/Tooltip'

export default function MinimumMargin() {
  const product = useStore((s) => s.getActiveProduct())
  const [retailerMargin, setRetailerMargin] = useState(GROCERY_DEFAULTS.retailerMarginPercent.value * 100)
  const [targetBrandMargin, setTargetBrandMargin] = useState(30)
  const [solveMode, setSolveMode] = useState<'cost' | 'rrp'>('cost')
  const [useWholesaler, setUseWholesaler] = useState(false)
  const [wholesalerMargin, setWholesalerMargin] = useState(GROCERY_DEFAULTS.wholesalerMarginPercent.value * 100)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const retailerDec = retailerMargin / 100
  const brandDec = targetBrandMargin / 100
  const wsDec = useWholesaler ? wholesalerMargin / 100 : 0

  const costResult = solveForCostPrice(product.rrpIncVat, product.vatRate, retailerDec, brandDec, wsDec)
  const rrpResult = solveForRrp(product.cogsPerUnit, product.vatRate, retailerDec, brandDec, wsDec)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Minimum Margin Calculator</h3>
        <p className="text-sm text-slate-500">
          Fix the margins you need, and work backwards to find the cost price or RRP that makes it work.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Retailer margin %</label>
          <input type="number" step="0.5" value={retailerMargin}
            onChange={(e) => setRetailerMargin(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your target margin %</label>
          <input type="number" step="0.5" value={targetBrandMargin}
            onChange={(e) => setTargetBrandMargin(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Solve for</label>
          <select value={solveMode} onChange={(e) => setSolveMode(e.target.value as 'cost' | 'rrp')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="cost">Max cost price (given RRP)</option>
            <option value="rrp">Min RRP (given COGS)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={useWholesaler} onChange={(e) => setUseWholesaler(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm font-medium text-slate-700">
            Via wholesaler
            <Tooltip text={GROCERY_DEFAULTS.wholesalerMarginPercent.note} />
          </span>
        </label>
        {useWholesaler && (
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1">Wholesaler margin %</label>
            <input type="number" step="0.5" value={wholesalerMargin}
              onChange={(e) => setWholesalerMargin(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        )}
      </div>

      {solveMode === 'cost' ? (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Given your RRP of {formatGBP(product.rrpIncVat)} inc. VAT{useWholesaler ? ' and a wholesaler in the chain' : ''}, the maximum COGS per unit you can afford:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Maximum COGS/unit" value={formatGBP(costResult.requiredCogs)} highlight />
            <ResultCard label="RSP ex-VAT" value={formatGBP(costResult.rspExVat)} />
            <ResultCard label="Cost to retailer" value={formatGBP(costResult.costToRetailer)} />
            {useWholesaler && <ResultCard label="Cost to wholesaler" value={formatGBP(costResult.costToWholesaler)} />}
          </div>
          {product.cogsPerUnit > costResult.requiredCogs && (
            <p className="mt-3 text-sm text-red-600">
              Your current COGS ({formatGBP(product.cogsPerUnit)}) exceeds the maximum — you need to reduce costs by {formatGBP(product.cogsPerUnit - costResult.requiredCogs)}/unit.
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Given your COGS of {formatGBP(product.cogsPerUnit)}/unit{useWholesaler ? ' and a wholesaler in the chain' : ''}, the minimum RRP needed:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Minimum RRP inc. VAT" value={formatGBP(rrpResult.rrpIncVat)} highlight />
            <ResultCard label="RSP ex-VAT" value={formatGBP(rrpResult.rspExVat)} />
            <ResultCard label="Cost to retailer" value={formatGBP(rrpResult.costToRetailer)} />
            {useWholesaler && <ResultCard label="Cost to wholesaler" value={formatGBP(rrpResult.costToWholesaler)} />}
          </div>
          {product.rrpIncVat < rrpResult.rrpIncVat && (
            <p className="mt-3 text-sm text-red-600">
              Your current RRP ({formatGBP(product.rrpIncVat)}) is below the minimum — you need to increase it by {formatGBP(rrpResult.rrpIncVat - product.rrpIncVat)}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
