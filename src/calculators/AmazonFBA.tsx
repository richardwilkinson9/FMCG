import { useStore } from '../store/useStore'
import { effectiveAmazonFees } from '../store/scenario'
import { amazonFBAMargin, estimateAmazonFBAFee, rspExVat } from '../utils/calculations'
import { AMAZON_CATEGORY_FEES } from '../config/fees'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection, MonoToggle } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/** The Amazon Cut — what FBA takes before you see a penny. */
export default function AmazonFBA() {
  const product = useStore((s) => s.getActiveProduct())
  const amazon = useStore((s) => s.scenario.amazon)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const inputs = () => {
    if (!product) return null
    const estimated = estimateAmazonFBAFee(amazon.weightG, amazon.longestCm, amazon.medianCm, amazon.shortestCm)
    const fees = effectiveAmazonFees(amazon)
    return (
      <div>
        <InputsHeader />
        <InputSection first>THE PRODUCT</InputSection>
        <div className="mb-[18px]">
          <TextField label="Product name" value={product.name} onChange={(v) => updateProduct(product.id, { name: v })} />
        </div>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Cost price / unit" prefix="£" value={product.cogsPerUnit} onCommit={(v) => updateProduct(product.id, { cogsPerUnit: v })} />
          <Field label="Sale Price" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
        </div>

        <InputSection>
          FBA FEES <span className="border-2 border-ink px-[5px] py-px">dated defaults — check the rate card</span>
        </InputSection>

        <div className="mb-4">
          <MonoToggle
            label="ESTIMATE FEE FROM SIZE & WEIGHT"
            on={amazon.estimatorOn}
            onToggle={() => updateScenario('amazon', { estimatorOn: !amazon.estimatorOn })}
          />
        </div>

        {amazon.estimatorOn ? (
          <>
            <label className="block mb-4">
              <span className="block text-xs font-semibold mb-1.5">Category (sets referral fee)</span>
              <div className="relative border-2 border-ink bg-white h-[52px] flex items-center">
                <select
                  value={amazon.category}
                  onChange={(e) => updateScenario('amazon', { category: e.target.value })}
                  aria-label="Amazon category"
                  className="flex-1 border-0 outline-none bg-transparent px-3.5 font-mono text-[15px] text-ink h-full cursor-pointer appearance-none"
                >
                  {AMAZON_CATEGORY_FEES.map((c) => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </select>
                <span className="w-11 flex items-center justify-center border-l-2 border-ink font-mono text-sm h-full pointer-events-none">▾</span>
              </div>
            </label>
            <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
              <Field label="Unit weight" suffix="g" value={amazon.weightG} onCommit={(v) => updateScenario('amazon', { weightG: v })} />
              <Field label="Longest side" suffix="cm" value={amazon.longestCm} onCommit={(v) => updateScenario('amazon', { longestCm: v })} />
              <Field label="Median side" suffix="cm" value={amazon.medianCm} onCommit={(v) => updateScenario('amazon', { medianCm: v })} />
              <Field label="Shortest side" suffix="cm" value={amazon.shortestCm} onCommit={(v) => updateScenario('amazon', { shortestCm: v })} />
            </div>
            <div className="border-2 border-ink bg-ink text-bile py-3 px-3.5 font-mono text-[13px] flex justify-between flex-wrap gap-1.5 mt-2">
              <span>SIZE TIER: {estimated.tier}</span>
              <span>FULFILMENT {gbp(estimated.fee)} · REFERRAL {(fees.referralFeePercent * 100).toFixed(0)}%</span>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
            <Field label="Referral fee" suffix="%" scale={100} value={amazon.referralFee} onCommit={(v) => updateScenario('amazon', { referralFee: v })} />
            <Field label="Fulfilment / unit" prefix="£" value={amazon.fulfilmentFee} onCommit={(v) => updateScenario('amazon', { fulfilmentFee: v })} />
          </div>
        )}

        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4 mt-4">
          <Field label="Storage / unit / mo" prefix="£" value={amazon.storageFee} onCommit={(v) => updateScenario('amazon', { storageFee: v })} />
          <Field label="Fuel surcharge" suffix="%" scale={100} value={amazon.fuelSurcharge} onCommit={(v) => updateScenario('amazon', { fuelSurcharge: v })} />
          <Field label="Selling plan / mo" prefix="£" value={amazon.planMonthly} onCommit={(v) => updateScenario('amazon', { planMonthly: v })} />
          <Field label="Units sold / mo" inputMode="numeric" value={amazon.monthlyUnits} onCommit={(v) => updateScenario('amazon', { monthlyUnits: Math.round(v) })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Fixed costs spread across monthly volume. Fewer units, heavier per-unit fees.
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const fees = effectiveAmazonFees(amazon)
    const result = amazonFBAMargin(product, fees)
    const sp = rspExVat(product)
    const tierName = amazon.estimatorOn
      ? estimateAmazonFBAFee(amazon.weightG, amazon.longestCm, amazon.medianCm, amazon.shortestCm).tier
      : 'manual'

    // The receipt spreads the selling plan across monthly volume as a per-unit fee
    const planCut = amazon.planMonthly / (amazon.monthlyUnits || 1)
    const totalFees = result.totalFees + planCut
    const net = result.netRevenue - planCut
    const gp = result.grossProfit - planCut
    const pctVal = sp > 0 ? gp / sp : 0
    const noMargin = gp <= 0

    let healthColor = BILE
    let healthLabel = HEALTH.healthy
    if (noMargin) { healthColor = REDPEN; healthLabel = HEALTH.underwater }
    else if (pctVal < 0.12) { healthColor = REDPEN; healthLabel = HEALTH.thin }
    else if (pctVal < 0.25) { healthColor = REDUCED; healthLabel = HEALTH.tight }

    const verdict = noMargin
      ? `You lose ${gbp(gp)} on every unit. The fees are bigger than the price. A single unit is not an FBA product — sell a multipack.`
      : `FBA keeps ${gbp(totalFees)} of the ${gbp(sp)} sale. You keep ${gbp(gp)}. Thin, but hey, Jeff loves you.`

    return (
      <div>
        <Receipt tool="THE AMAZON CUT" name={product.name} subline="FBA margin · per unit" verdict={verdict} verdictColor={noMargin ? REDPEN : INK}>
          <Rule className="mt-4 mb-2.5" />
          <RSection label="WHAT AMAZON TAKES" />
          <RLine label="Sale price ex-VAT" value={gbp(sp)} bold />
          <RLine label={`Referral fee (${(fees.referralFeePercent * 100).toFixed(0)}%)`} value={neg(result.referralFee)} dim />
          <RLine label={`Fulfilment (${tierName})`} value={neg(result.fulfilmentFee)} dim />
          <RLine label="Storage / unit" value={neg(result.storageFee)} dim />
          <RLine label="Selling plan / unit" value={neg(planCut)} dim />
          <Rule dotted className="my-2" />
          <RLine label="Total Amazon fees" value={neg(totalFees)} bold color={REDPEN} />
          <RLine label="Net revenue / unit" value={gbp(net)} bold color={net < 0 ? REDPEN : INK} />
          <RLine label="less cost price" value={neg(product.cogsPerUnit)} dim />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="YOUR MARGIN" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Gross profit / unit', value: gbp(gp), color: noMargin ? REDPEN : BILE },
              { label: 'Margin %', value: pct(pctVal), big: false, color: noMargin ? REDPEN : BILE },
            ]}
          />
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 07706"
      group="MARKETPLACE"
      type="AMAZON FBA"
      title="The Amazon Cut"
      subtitle="What FBA takes before you see a penny."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
