import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { listingModel, retailerPnL } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, n0, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/** The Listing — model the range review before the buyer does. */
export default function ListingModel() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const listing = useStore((s) => s.scenario.listing)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const inputs = () => {
    if (!product) return null
    return (
      <div>
        <InputsHeader />
        <InputSection first>THE PRODUCT</InputSection>
        <div className="mb-[18px]">
          <TextField label="Product name" value={product.name} onChange={(v) => updateProduct(product.id, { name: v })} />
        </div>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Cost price / unit" prefix="£" value={product.cogsPerUnit} onCommit={(v) => updateProduct(product.id, { cogsPerUnit: v })} />
          <Field label="RSP" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          <Field label="Units per case" inputMode="numeric" value={product.unitsPerCase} onCommit={(v) => updateProduct(product.id, { unitsPerCase: Math.round(v) })} />
          <Field label="Retailer margin" suffix="%" scale={100} tag="default" value={grocery.retailerMargin} onCommit={(v) => updateScenario('grocery', { retailerMargin: v })} />
        </div>

        <InputSection>THE DISTRIBUTION</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Stores" inputMode="numeric" value={listing.stores} onCommit={(v) => updateScenario('listing', { stores: Math.round(v) })} />
          <Field label="Rate of sale / store / wk" value={product.weeklyRateOfSale} onCommit={(v) => updateProduct(product.id, { weeklyRateOfSale: v })} />
          <Field label="Weeks in period" inputMode="numeric" value={listing.weeksInPeriod} onCommit={(v) => updateScenario('listing', { weeksInPeriod: Math.max(1, Math.min(104, Math.round(v))) })} />
          <Field label="SKUs listed" inputMode="numeric" value={listing.skus} onCommit={(v) => updateScenario('listing', { skus: Math.round(v) })} />
        </div>

        <InputSection>THE PROMOTION</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Promo start week" inputMode="numeric" value={listing.promoStartWeek} onCommit={(v) => updateScenario('listing', { promoStartWeek: Math.round(v) })} />
          <Field label="Promo weeks" inputMode="numeric" value={listing.promoWeeks} onCommit={(v) => updateScenario('listing', { promoWeeks: Math.round(v) })} />
          <Field label="Promo uplift" suffix="%" scale={100} value={listing.promoUplift} onCommit={(v) => updateScenario('listing', { promoUplift: v })} />
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const result = listingModel(product, grocery.retailerMargin, {
      stores: listing.stores,
      skus: listing.skus,
      weeksInPeriod: listing.weeksInPeriod,
      promoWeeks: listing.promoWeeks,
      promoStartWeek: listing.promoStartWeek,
      promoUpliftPercent: listing.promoUplift,
    }, activeWholesalerMargin(grocery))

    const pnl = retailerPnL(product, grocery.retailerMargin, activeWholesalerMargin(grocery))
    const net = pnl.brandNetRevenue
    const gmUnit = pnl.brandGrossMarginPerUnit
    const noMargin = gmUnit <= 0
    const maxVol = Math.max(result.promoWeeklyVolume, result.weeklyVolume, 1)

    let healthColor = BILE
    let healthLabel = 'WORTH IT'
    if (noMargin) { healthColor = REDPEN; healthLabel = 'LOSS-MAKING' }
    else if (net > 0 && gmUnit / net < 0.15) { healthColor = REDUCED; healthLabel = HEALTH.thin }

    const promoUnits = (result.promoWeeklyVolume - result.weeklyVolume) * Math.min(listing.promoWeeks, listing.weeksInPeriod)
    const verdict = noMargin
      ? `Every unit loses money - don't be an idiot. ${gbp(-result.totalGrossMargin)} lost across the period.`
      : `The listing makes ${gbp(result.totalGrossMargin)} of gross margin. The promo adds ${n0(promoUnits)} units - whether it pays is The Payback's problem.`

    return (
      <div>
        <Receipt
          tool="THE LISTING"
          name={product.name}
          subline={`${listing.weeksInPeriod}-week projection · ${listing.stores} stores`}
          verdict={verdict}
          verdictColor={noMargin ? REDPEN : INK}
        >
          <Rule className="mt-4 mb-2.5" />
          <RSection label="WEEKLY VOLUME" />
          <div className="flex items-end gap-[2px] h-[70px] border-b-2 border-ink">
            {result.weeks.map((w) => (
              <div
                key={w.week}
                className="flex-1 min-w-[2px]"
                style={{
                  height: `${Math.max(6, (w.volume / maxVol) * 100).toFixed(0)}%`,
                  background: w.onPromo ? BILE : INK,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] mt-1.5 opacity-70">
            <span>WK 1</span>
            <span>
              <span className="inline-block w-[9px] h-[9px] border-2 border-ink align-middle" style={{ background: BILE }} /> promo weeks
            </span>
            <span>WK {listing.weeksInPeriod}</span>
          </div>

          <Rule className="mt-4 mb-2.5" />
          <RLine label="Base volume / week" value={`${n0(result.weeklyVolume)} units`} />
          <RLine label="Promo volume / week" value={`${n0(result.promoWeeklyVolume)} units`} />
          <RLine label="Total volume" value={`${n0(result.totalVolume)} units`} />
          <RLine label="Total cases" value={`${n0(result.totalCases)} cases`} />
          <RLine label="Total revenue (your net)" value={gbp(result.totalRevenue)} />
          <RLine label="Retail sales value (consumer £)" value={gbp(result.totalVolume * product.rrpIncVat)} dim />
          <RLine
            label="Cases / store / week"
            value={(product.unitsPerCase > 0 ? product.weeklyRateOfSale / product.unitsPerCase : 0).toFixed(2)}
            dim
            color={product.unitsPerCase > 0 && product.weeklyRateOfSale / product.unitsPerCase < 0.5 ? REDPEN : undefined}
          />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="THE PRIZE" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Gross margin, period', value: gbp(result.totalGrossMargin), color: noMargin ? REDPEN : BILE },
              { label: 'Margin / unit', value: gbp(gmUnit), big: false, color: noMargin ? REDPEN : BILE },
            ]}
          />
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 04405"
      group="GROCERY"
      type="LISTING MODEL"
      title="The Listing"
      subtitle="Let's look at your next range review."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
