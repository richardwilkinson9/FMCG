import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { retailerPnL, rspExVat } from '../utils/calculations'
import { GROCERY_DEFAULTS } from '../config/fees'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection, MonoToggle } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

const DATED_TAG = 'dated default — check the rate card'

/** The P&L — who takes what, per unit. */
export default function RetailerPnL() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
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
        </div>

        <InputSection>THE CHAIN</InputSection>
        <div className="mb-[18px]">
          <Field label="Retailer margin" suffix="%" scale={100} tag={DATED_TAG} value={grocery.retailerMargin} onCommit={(v) => updateScenario('grocery', { retailerMargin: v })} />
        </div>
        <MonoToggle
          label="SELLING VIA A WHOLESALER"
          on={grocery.wholesalerEnabled}
          onToggle={() => updateScenario('grocery', { wholesalerEnabled: !grocery.wholesalerEnabled })}
        />
        {grocery.wholesalerEnabled && (
          <div className="mt-4">
            <Field label="Wholesaler margin" suffix="%" scale={100} tag={DATED_TAG} value={grocery.wholesalerMargin} onCommit={(v) => updateScenario('grocery', { wholesalerMargin: v })} />
          </div>
        )}
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          {GROCERY_DEFAULTS.retailerMarginPercent.note}
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const wsOn = grocery.wholesalerEnabled
    const result = retailerPnL(product, grocery.retailerMargin, activeWholesalerMargin(grocery))
    const rsp = rspExVat(product)
    const vatCut = product.rrpIncVat - rsp
    const gmUnit = result.brandGrossMarginPerUnit
    const gmPct = result.brandGrossMarginPercent
    const noMargin = gmUnit <= 0

    let healthColor = BILE
    let healthLabel = HEALTH.healthy
    if (noMargin) { healthColor = REDPEN; healthLabel = HEALTH.underwater }
    else if (gmPct < 0.20) { healthColor = REDPEN; healthLabel = HEALTH.thin }
    else if (gmPct < 0.35) { healthColor = REDUCED; healthLabel = HEALTH.tight }

    const verdict = noMargin
      ? `You make ${gbp(gmUnit)} a unit. You are paying to be stocked. Fix the cost price or the RRP.`
      : `You keep ${gbp(gmUnit)} of every ${gbp(rsp)} on the shelf. Back margin is still margin.`

    return (
      <div>
        <Receipt tool="THE P&L" name={product.name} subline="who takes what · per unit" verdict={verdict} verdictColor={noMargin ? REDPEN : INK}>
          <Rule className="mt-4 mb-2.5" />
          <RSection label="THE WATERFALL" />
          <RLine label="Consumer pays (inc VAT)" value={gbp(product.rrpIncVat)} />
          <RLine label="less VAT" value={neg(vatCut)} dim />
          <RLine label="Shelf price ex-VAT" value={gbp(rsp)} bold />
          <RLine label={`less retailer margin (${Math.round(grocery.retailerMargin * 100)}%)`} value={neg(result.retailerMarginPerUnit)} dim />
          {wsOn && (
            <RLine label={`less wholesaler margin (${Math.round(grocery.wholesalerMargin * 100)}%)`} value={neg(result.wholesalerMarginPerUnit)} dim />
          )}
          <RLine label="You bank / unit" value={gbp(result.brandNetRevenue)} bold />
          <RLine label="less cost price" value={neg(product.cogsPerUnit)} dim />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="YOUR MARGIN" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Gross margin / unit', value: gbp(gmUnit), color: noMargin ? REDPEN : BILE },
              { label: 'Margin %', value: pct(gmPct), big: false, color: noMargin ? REDPEN : BILE },
            ]}
          />
          <RLine label="Margin / case" value={gbp(result.marginPerCase)} color={noMargin ? REDPEN : INK} />
          <RLine label="Net revenue / case" value={gbp(result.revenuePerCase)} />
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 01142"
      group="GROCERY"
      type="RETAILER P&L"
      title="The P&L"
      subtitle="What the retailer really makes on you."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
