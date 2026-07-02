import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { retailerPnL, formatGBP, formatPercent } from '../utils/calculations'
import GroceryChainSettings from '../components/GroceryChainSettings'
import ResultCard from '../components/ResultCard'

export default function RetailerPnL() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const marginsInvalid = grocery.retailerMargin >= 1 || (grocery.wholesalerEnabled && grocery.wholesalerMargin >= 1)
  const result = retailerPnL(product, grocery.retailerMargin, activeWholesalerMargin(grocery))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Retailer P&L / Margin Builder</h3>
        <p className="text-sm text-slate-500">
          From your cost price and RRP, see the full margin waterfall — including wholesaler if applicable.
        </p>
      </div>

      <GroceryChainSettings />

      {marginsInvalid ? (
        <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          Margins must be below 100% — at 100% or more, nobody in the chain pays anything for the product.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard
              label="RSP ex-VAT"
              value={formatGBP(result.rspExVat)}
              sub="What the shopper pays, minus VAT"
            />
            <ResultCard
              label="Cost to retailer"
              value={formatGBP(result.costToRetailer)}
              sub="RSP ex-VAT less the retailer's margin"
            />
            <ResultCard label="Retailer margin/unit" value={formatGBP(result.retailerMarginPerUnit)} />
            <ResultCard label="Retailer margin %" value={formatPercent(result.retailerMarginPercent)} />
          </div>

          {grocery.wholesalerEnabled && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResultCard label="Wholesaler margin/unit" value={formatGBP(result.wholesalerMarginPerUnit)} />
              <ResultCard label="Wholesaler margin %" value={formatPercent(result.wholesalerMarginPercent)} />
              <ResultCard
                label="Cost to wholesaler"
                value={formatGBP(result.costToWholesaler)}
                sub="The price you invoice — your net revenue"
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard
              label="Your gross margin/unit"
              value={formatGBP(result.brandGrossMarginPerUnit)}
              sub="Net revenue less COGS"
              highlight={result.brandGrossMarginPerUnit > 0}
              negative={result.brandGrossMarginPerUnit < 0}
            />
            <ResultCard
              label="Your gross margin %"
              value={formatPercent(result.brandGrossMarginPercent)}
              sub="On your net revenue"
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
        </>
      )}
    </div>
  )
}
