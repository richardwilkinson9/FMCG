import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { listingModel, formatGBP, formatNumber } from '../utils/calculations'
import GroceryChainSettings from '../components/GroceryChainSettings'
import NumberInput from '../components/NumberInput'
import ResultCard from '../components/ResultCard'

export default function ListingModel() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const listing = useStore((s) => s.scenario.listing)
  const updateScenario = useStore((s) => s.updateScenario)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = listingModel(product, grocery.retailerMargin, {
    stores: listing.stores,
    skus: listing.skus,
    weeksInPeriod: listing.weeksInPeriod,
    promoWeeks: listing.promoWeeks,
    promoUpliftPercent: listing.promoUplift,
  }, activeWholesalerMargin(grocery))

  const promoExceedsPeriod = listing.promoWeeks > listing.weeksInPeriod

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Retailer Listing Model</h3>
        <p className="text-sm text-slate-500">
          Project your revenue, volume and gross margin across a store estate over a given period.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
        <NumberInput label="Stores" min={0} value={listing.stores}
          onChange={(v) => updateScenario('listing', { stores: Math.round(v) })}
          help="Stores stocking the product" />
        <NumberInput label="SKUs" min={0} value={listing.skus}
          onChange={(v) => updateScenario('listing', { skus: Math.round(v) })}
          help="Listed lines of this product" />
        <NumberInput label="Weeks in period" min={0} value={listing.weeksInPeriod}
          onChange={(v) => updateScenario('listing', { weeksInPeriod: Math.round(v) })} />
        <NumberInput label="Promo weeks" min={0} value={listing.promoWeeks}
          onChange={(v) => updateScenario('listing', { promoWeeks: Math.round(v) })}
          help="Weeks on promotion within the period" />
        <NumberInput label="Promo volume uplift" suffix="%" min={0} value={listing.promoUplift * 100}
          onChange={(v) => updateScenario('listing', { promoUplift: v / 100 })}
          help="Extra volume during promo weeks" />
      </div>

      <GroceryChainSettings />

      {promoExceedsPeriod ? (
        <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          Promo weeks can't exceed the weeks in the period.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ResultCard label="Total volume (units)" value={formatNumber(result.totalVolume)} highlight />
          <ResultCard label="Total cases" value={formatNumber(result.totalCases)} />
          <ResultCard label="Total revenue" value={formatGBP(result.totalRevenue)} sub="Your net revenue, not retail sales value" highlight />
          <ResultCard label="Gross margin" value={formatGBP(result.totalGrossMargin)} highlight />
          <ResultCard label="Base weekly volume" value={formatNumber(result.weeklyVolume)} />
          <ResultCard label="Promo weekly volume" value={formatNumber(result.promoWeeklyVolume)} />
        </div>
      )}
    </div>
  )
}
