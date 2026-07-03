import { useStore } from '../store/useStore'
import { stockLedger } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { n0, BILE, REDPEN, INK } from '../components/gross/format'

/**
 * The Stock Answer — what to order and when. Demand takes its promo shape
 * from the shared Listing scenario; the planning horizon is its own field.
 */
export default function StockForecast() {
  const product = useStore((s) => s.getActiveProduct())
  const listing = useStore((s) => s.scenario.listing)
  const stock = useStore((s) => s.scenario.stock)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const inputs = () => {
    if (!product) return null
    return (
      <div>
        <InputsHeader />
        <InputSection first>THE PRODUCT</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <TextField label="Product name" value={product.name} onChange={(v) => updateProduct(product.id, { name: v })} />
          <Field label="Units per case" inputMode="numeric" value={product.unitsPerCase} onCommit={(v) => updateProduct(product.id, { unitsPerCase: Math.round(v) })} />
        </div>

        <InputSection>THE DEMAND</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Stores" inputMode="numeric" value={listing.stores} onCommit={(v) => updateScenario('listing', { stores: Math.round(v) })} />
          <Field label="Rate of sale / store / wk" value={product.weeklyRateOfSale} onCommit={(v) => updateProduct(product.id, { weeklyRateOfSale: v })} />
          <Field label="Weeks to plan" inputMode="numeric" value={stock.planWeeks} onCommit={(v) => updateScenario('stock', { planWeeks: Math.max(1, Math.min(104, Math.round(v))) })} />
          <Field label="Promo uplift" suffix="%" scale={100} value={listing.promoUplift} onCommit={(v) => updateScenario('listing', { promoUplift: v })} />
          <Field label="Promo start week" inputMode="numeric" value={listing.promoStartWeek} onCommit={(v) => updateScenario('listing', { promoStartWeek: Math.round(v) })} />
          <Field label="Promo weeks" inputMode="numeric" value={listing.promoWeeks} onCommit={(v) => updateScenario('listing', { promoWeeks: Math.round(v) })} />
        </div>

        <InputSection>THE SUPPLY</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Starting stock" inputMode="numeric" value={stock.startingStockUnits} onCommit={(v) => updateScenario('stock', { startingStockUnits: Math.round(v) })} />
          <Field label="Lead time" suffix="wks" inputMode="numeric" value={stock.leadWeeks} onCommit={(v) => updateScenario('stock', { leadWeeks: Math.max(0, Math.round(v)) })} />
          <Field label="Weeks of cover" suffix="wks" inputMode="numeric" value={stock.weeksOfCover} onCommit={(v) => updateScenario('stock', { weeksOfCover: Math.max(0, Math.round(v)) })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Order-up-to: top up to cover the lead time plus your weeks of cover, rounded to whole cases.
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    // Weekly demand with the shared promo shape over this plan's horizon
    const base = product.weeklyRateOfSale * listing.stores
    const demand: number[] = []
    for (let w = 1; w <= stock.planWeeks; w++) {
      const onPromo = w >= listing.promoStartWeek && w < listing.promoStartWeek + listing.promoWeeks
      demand.push(onPromo ? base * (1 + listing.promoUplift) : base)
    }
    const plan = stockLedger(demand, stock.startingStockUnits, stock.leadWeeks, stock.weeksOfCover, product.unitsPerCase)
    const totalDemand = demand.reduce((a, b) => a + b, 0)
    const maxStock = Math.max(1, plan.peakStock)

    const ok = plan.stockoutWeeks === 0
    const verdict = ok
      ? `${plan.orderCount} orders across the period, no stockouts. Peak stock ${n0(plan.peakStock)} units — cash tied up on a pallet, but nothing lost.`
      : `You run dry for ${plan.stockoutWeeks} week(s) and lose ${n0(plan.lostUnits)} units of demand. Order earlier, hold more cover, or shorten the lead time.`

    return (
      <div>
        <Receipt
          tool="THE STOCK ANSWER"
          name={product.name}
          subline={`${stock.planWeeks}-week supply plan`}
          verdict={verdict}
          verdictColor={ok ? INK : REDPEN}
        >
          <Rule className="mt-4 mb-2.5" />
          <RSection label="STOCK ON HAND, EACH WEEK" />
          <div className="flex items-end gap-[2px] h-[70px] border-b-2 border-ink">
            {plan.rows.map((r) => (
              <div
                key={r.week}
                className="flex-1 min-w-[2px]"
                style={{
                  height: `${Math.max(4, (r.closing / maxStock) * 100).toFixed(0)}%`,
                  background: r.shortfall > 0 ? REDPEN : INK,
                }}
              />
            ))}
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] flex-wrap">
            <span className="flex items-center gap-[5px]"><span className="w-[9px] h-[9px] border-2 border-ink" style={{ background: INK }} />closing stock</span>
            <span className="flex items-center gap-[5px]"><span className="w-[9px] h-[9px] border-2 border-ink" style={{ background: REDPEN }} />stockout week</span>
          </div>

          <Rule className="mt-4 mb-2.5" />
          <RLine label="Demand, period" value={`${n0(totalDemand)} units`} />
          <RLine label="Orders placed" value={n0(plan.orderCount)} />
          <RLine label="Peak stock held" value={`${n0(plan.peakStock)} units`} />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="THE ORDER" health={{ color: ok ? BILE : REDPEN, label: ok ? 'COVERED' : 'STOCKOUT' }} />
          <AnswerBlock
            rows={[
              { label: 'Total to order', value: `${n0(plan.totalOrderedCases)} cases` },
              { label: 'In units', value: n0(plan.totalOrdered), big: false },
            ]}
          />
          <RLine label="Stockout weeks" value={n0(plan.stockoutWeeks)} color={ok ? INK : REDPEN} />
          <RLine label="Lost sales" value={`${n0(plan.lostUnits)} units`} color={ok ? INK : REDPEN} />
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 06629"
      group="GROCERY"
      type="SUPPLY PLAN"
      title="The Stock Answer"
      subtitle="What to order, and when, before you run out."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
