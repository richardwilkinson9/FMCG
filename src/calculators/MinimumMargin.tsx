import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { solveForCostPrice, solveForRrp, formatGBP } from '../utils/calculations'
import GroceryChainSettings from '../components/GroceryChainSettings'
import NumberInput from '../components/NumberInput'
import ResultCard from '../components/ResultCard'

export default function MinimumMargin() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const minMargin = useStore((s) => s.scenario.minMargin)
  const updateScenario = useStore((s) => s.updateScenario)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const ws = activeWholesalerMargin(grocery)
  const marginsInvalid =
    grocery.retailerMargin >= 1 || minMargin.targetBrandMargin >= 1 || ws >= 1

  const costResult = solveForCostPrice(
    product.rrpIncVat, product.vatRate,
    grocery.retailerMargin, minMargin.targetBrandMargin, ws,
  )
  const rrpResult = solveForRrp(
    product.cogsPerUnit, product.vatRate,
    grocery.retailerMargin, minMargin.targetBrandMargin, ws,
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Minimum Margin Calculator</h3>
        <p className="text-sm text-slate-500">
          Fix the margins you need, and work backwards to find the cost price or RRP that makes it work.
        </p>
      </div>

      <GroceryChainSettings />

      <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
        <div className="w-44">
          <NumberInput
            label="Your target margin"
            suffix="%"
            min={0}
            value={minMargin.targetBrandMargin * 100}
            onChange={(v) => updateScenario('minMargin', { targetBrandMargin: v / 100 })}
            tooltip="The gross margin you need to make on your net revenue after everyone else in the chain has taken their cut."
          />
        </div>
        <div className="w-64">
          <label htmlFor="solve-mode" className="block text-sm font-medium text-slate-700 mb-1">Solve for</label>
          <select
            id="solve-mode"
            value={minMargin.solveMode}
            onChange={(e) => updateScenario('minMargin', { solveMode: e.target.value as 'cost' | 'rrp' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="cost">Max cost price (given RRP)</option>
            <option value="rrp">Min RRP (given COGS)</option>
          </select>
        </div>
      </div>

      {marginsInvalid ? (
        <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          Each margin must be below 100% — the maths has no answer otherwise.
        </p>
      ) : minMargin.solveMode === 'cost' ? (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Given your RRP of {formatGBP(product.rrpIncVat)} inc. VAT{grocery.wholesalerEnabled ? ' and a wholesaler in the chain' : ''}, the maximum COGS per unit you can afford:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Maximum COGS/unit" value={formatGBP(costResult.requiredCogs)} highlight />
            <ResultCard label="RSP ex-VAT" value={formatGBP(costResult.rspExVat)} />
            <ResultCard label="Cost to retailer" value={formatGBP(costResult.costToRetailer)} />
            {grocery.wholesalerEnabled && (
              <ResultCard label="Cost to wholesaler" value={formatGBP(costResult.costToWholesaler)} />
            )}
          </div>
          {product.cogsPerUnit > costResult.requiredCogs && (
            <p className="mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              Your current COGS ({formatGBP(product.cogsPerUnit)}) exceeds the maximum — you need to reduce costs by {formatGBP(product.cogsPerUnit - costResult.requiredCogs)}/unit.
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Given your COGS of {formatGBP(product.cogsPerUnit)}/unit{grocery.wholesalerEnabled ? ' and a wholesaler in the chain' : ''}, the minimum RRP needed:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Minimum RRP inc. VAT" value={formatGBP(rrpResult.rrpIncVat)} highlight />
            <ResultCard label="RSP ex-VAT" value={formatGBP(rrpResult.rspExVat)} />
            <ResultCard label="Cost to retailer" value={formatGBP(rrpResult.costToRetailer)} />
            {grocery.wholesalerEnabled && (
              <ResultCard label="Cost to wholesaler" value={formatGBP(rrpResult.costToWholesaler)} />
            )}
          </div>
          {product.rrpIncVat < rrpResult.rrpIncVat && (
            <p className="mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              Your current RRP ({formatGBP(product.rrpIncVat)}) is below the minimum — you need to increase it by {formatGBP(rrpResult.rrpIncVat - product.rrpIncVat)}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
