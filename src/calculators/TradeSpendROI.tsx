import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { retailerPnL, rspExVat, tradeSpendROI } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, ceil0, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/** The Payback — how much volume a promo needs to pay itself back. */
export default function TradeSpendROI() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const listing = useStore((s) => s.scenario.listing)
  const tradeSpend = useStore((s) => s.scenario.tradeSpend)
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
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
          <Field label="Retailer margin" suffix="%" scale={100} tag="dated default" value={grocery.retailerMargin} onCommit={(v) => updateScenario('grocery', { retailerMargin: v })} />
        </div>

        <InputSection>THE ASK</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Investment" prefix="£" value={tradeSpend.investment} onCommit={(v) => updateScenario('tradeSpend', { investment: v })} />
          <Field label="Target ROI" suffix="%" scale={100} value={tradeSpend.targetROI} onCommit={(v) => updateScenario('tradeSpend', { targetROI: v })} />
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const ws = activeWholesalerMargin(grocery)
    const pnl = retailerPnL(product, grocery.retailerMargin, ws)
    const result = tradeSpendROI(product, grocery.retailerMargin, tradeSpend.investment, tradeSpend.targetROI, ws)
    const rsp = rspExVat(product)
    const gmUnit = result.marginPerUnit
    const noMargin = gmUnit <= 0

    const pctOfRsp = rsp > 0 ? gmUnit / rsp : 0
    let healthColor = BILE
    let healthLabel = HEALTH.healthy
    if (noMargin) { healthColor = REDPEN; healthLabel = HEALTH.underwater }
    else if (pctOfRsp < 0.15) { healthColor = REDPEN; healthLabel = HEALTH.thin }
    else if (pctOfRsp < 0.28) { healthColor = REDUCED; healthLabel = HEALTH.tight }

    const roiLabel = `${Math.round(tradeSpend.targetROI * 100)}%`
    const verdict = noMargin
      ? `${gbp(gmUnit)} per unit before a penny of promo. You are paying people to take this away. Fix the cost price first.`
      : `Break-even is ${ceil0(result.breakEvenCases)} incremental cases. Sell fewer than that and the promo lost money.`

    return (
      <div>
        <Receipt tool="THE PAYBACK" name={product.name} subline="trade spend payback · per unit basis" verdict={verdict} verdictColor={noMargin ? REDPEN : INK}>
          <Rule className="mt-4 mb-2.5" />
          <RSection label="THE PRODUCT" />
          <RLine label="Cost price / unit" value={gbp(product.cogsPerUnit)} />
          <RLine label="RSP ex-VAT" value={gbp(rsp)} />
          <RLine label="Net revenue / unit" value={gbp(pnl.brandNetRevenue)} />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="MARGIN" health={{ color: healthColor, label: healthLabel }} />
          <RLine label="Margin / unit" value={gbp(gmUnit)} bold color={noMargin ? REDPEN : INK} />
          <RLine label="Margin / case" value={gbp(result.marginPerCase)} color={noMargin ? REDPEN : INK} />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="THE ANSWER" />
          <AnswerBlock
            rows={[
              { label: 'Break-even units', value: ceil0(result.breakEvenUnits), color: noMargin ? REDPEN : BILE },
              { label: 'Break-even cases', value: ceil0(result.breakEvenCases), big: false, color: noMargin ? REDPEN : BILE },
            ]}
          />
          <RLine label={`Units for ${roiLabel} ROI`} value={ceil0(result.targetReturnUnits)} />
          <RLine label={`Cases for ${roiLabel} ROI`} value={ceil0(result.targetReturnCases)} />

          <Rule dotted className="mt-3 mb-2" />
          <RSection label="THE REALITY CHECK" />
          {(() => {
            // Base volume over the promo window, from the shared Listing settings
            const promoWindowBase = product.weeklyRateOfSale * listing.stores * listing.promoWeeks
            const upliftNeeded = promoWindowBase > 0 && Number.isFinite(result.breakEvenUnits)
              ? result.breakEvenUnits / promoWindowBase
              : NaN
            return (
              <>
                <RLine
                  label={`Base volume over ${listing.promoWeeks} promo weeks`}
                  value={`${ceil0(promoWindowBase)} units`}
                  dim
                />
                <RLine
                  label="Break-even as uplift on base"
                  value={Number.isFinite(upliftNeeded) ? `+${(upliftNeeded * 100).toFixed(0)}%` : '—'}
                  bold
                  color={Number.isFinite(upliftNeeded) && upliftNeeded > 1 ? REDPEN : INK}
                />
              </>
            )
          })()}
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 05512"
      group="GROCERY"
      type="TRADE SPEND"
      title="The Payback"
      subtitle="How much volume a promo needs to pay itself back."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
