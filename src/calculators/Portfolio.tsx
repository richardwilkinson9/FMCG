import { useStore } from '../store/useStore'
import {
  activeWholesalerMargin,
  effectiveAmazonFees,
  effectiveTikTokFees,
} from '../store/scenario'
import {
  retailerPnL,
  amazonFBAMargin,
  tiktokShopMargin,
  listingModel,
  formatGBP,
  formatPercent,
  formatNumber,
} from '../utils/calculations'

/**
 * Portfolio — every product side by side with grocery-period projections and
 * per-channel margins. Read-only: it aggregates what's already defined, using
 * the same shared scenario as every other tab.
 */
export default function Portfolio() {
  const products = useStore((s) => s.products)
  const scenario = useStore((s) => s.scenario)
  const setActiveProduct = useStore((s) => s.setActiveProduct)
  const duplicateProduct = useStore((s) => s.duplicateProduct)

  const ws = activeWholesalerMargin(scenario.grocery)
  const amazonFees = effectiveAmazonFees(scenario.amazon)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const listingInputs = {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promoWeeks: scenario.listing.promoWeeks,
    promoStartWeek: scenario.listing.promoStartWeek,
    promoUpliftPercent: scenario.listing.promoUplift,
  }

  const rows = products.map((p) => {
    const grocery = retailerPnL(p, scenario.grocery.retailerMargin, ws)
    const amazon = amazonFBAMargin(p, amazonFees)
    const tiktok = tiktokShopMargin(p, tiktokFees)
    const listing = listingModel(p, scenario.grocery.retailerMargin, listingInputs, ws)
    const best = Math.max(grocery.brandGrossMarginPercent, amazon.grossMarginPercent, tiktok.grossMarginPercent)
    const bestChannel =
      best === grocery.brandGrossMarginPercent ? 'Grocery'
        : best === amazon.grossMarginPercent ? 'Amazon' : 'TikTok'
    return { product: p, grocery, amazon, tiktok, listing, bestChannel, best }
  })

  const totalRevenue = rows.reduce((a, r) => a + r.listing.totalRevenue, 0)
  const totalMargin = rows.reduce((a, r) => a + r.listing.totalGrossMargin, 0)
  const totalVolume = rows.reduce((a, r) => a + r.listing.totalVolume, 0)
  const blendedMargin = totalRevenue > 0 ? totalMargin / totalRevenue : 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Portfolio</h3>
        <p className="text-sm text-slate-500">
          Every product side by side — grocery projection over {scenario.listing.weeksInPeriod} weeks
          ({formatNumber(scenario.listing.stores)} stores) and margin by channel. Uses the same assumptions as every other tab.
        </p>
      </div>

      {products.length === 1 && (
        <p className="p-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg no-print">
          One product so far — this view earns its keep with a range.{' '}
          <button
            onClick={() => duplicateProduct(products[0].id)}
            className="font-medium text-blue-700 underline hover:text-blue-900"
          >
            Duplicate it to compare scenarios
          </button>{' '}
          (e.g. current vs proposed pricing), or add products above.
        </p>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <caption className="sr-only">Product portfolio summary</caption>
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th scope="col" className="text-left py-2.5 px-3 font-medium text-slate-500">Product</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">RRP</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">COGS</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">Grocery %</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">Amazon %</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">TikTok %</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">Period volume</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">Period revenue</th>
              <th scope="col" className="text-right py-2.5 px-3 font-medium text-slate-500">Period margin</th>
              <th scope="col" className="text-left py-2.5 px-3 font-medium text-slate-500">Best channel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product: p, grocery, amazon, tiktok, listing, bestChannel, best }) => (
              <tr key={p.id} className="border-b border-slate-100">
                <th scope="row" className="py-2.5 px-3 text-left">
                  <button
                    onClick={() => setActiveProduct(p.id)}
                    className="font-medium text-slate-900 hover:text-blue-700 hover:underline"
                    title="Make this the active product"
                  >
                    {p.name || 'Unnamed'}
                  </button>
                </th>
                <td className="py-2.5 px-3 text-right text-slate-700">{formatGBP(p.rrpIncVat)}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{formatGBP(p.cogsPerUnit)}</td>
                <td className={`py-2.5 px-3 text-right font-medium ${grocery.brandGrossMarginPercent < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                  {formatPercent(grocery.brandGrossMarginPercent)}
                </td>
                <td className={`py-2.5 px-3 text-right font-medium ${amazon.grossMarginPercent < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                  {formatPercent(amazon.grossMarginPercent)}
                </td>
                <td className={`py-2.5 px-3 text-right font-medium ${tiktok.grossMarginPercent < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                  {formatPercent(tiktok.grossMarginPercent)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700">{formatNumber(listing.totalVolume)}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{formatGBP(listing.totalRevenue)}</td>
                <td className={`py-2.5 px-3 text-right font-medium ${listing.totalGrossMargin < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                  {formatGBP(listing.totalGrossMargin)}
                </td>
                <td className="py-2.5 px-3">
                  {best > 0 && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {bestChannel}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold border-t border-slate-200">
              <th scope="row" className="py-2.5 px-3 text-left text-slate-900">
                Total ({rows.length} product{rows.length !== 1 ? 's' : ''})
              </th>
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3" />
              <td colSpan={3} className="py-2.5 px-3 text-right text-slate-500 font-normal text-xs">
                Blended grocery margin: <span className="font-semibold text-slate-900">{formatPercent(blendedMargin)}</span>
              </td>
              <td className="py-2.5 px-3 text-right text-slate-900">{formatNumber(totalVolume)}</td>
              <td className="py-2.5 px-3 text-right text-slate-900">{formatGBP(totalRevenue)}</td>
              <td className="py-2.5 px-3 text-right text-slate-900">{formatGBP(totalMargin)}</td>
              <td className="py-2.5 px-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Period volume, revenue and margin use the grocery channel with your Listing Model settings applied to every product. Channel margin columns show per-unit gross margin on net revenue.
      </p>
    </div>
  )
}
