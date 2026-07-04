import { useStore } from '../store/useStore'
import { effectiveAmazonFees, amazonMonthlyUnits } from '../store/scenario'
import { amazonFBAMargin, estimateAmazonFBAFee, rspExVat, logisticsPerUnit } from '../utils/calculations'
import { AMAZON_CATEGORY_FEES } from '../config/fees'
import CalcShell, { InputsHeader, CalcActions, RateCardTag } from '../components/gross/CalcShell'
import ChannelPlan from '../components/gross/ChannelPlan'
import Field, { TextField, InputSection, MonoToggle } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/** The Amazon Cut — what FBA takes before you see a penny. */
export default function AmazonFBA() {
  const product = useStore((s) => s.getActiveProduct())
  const amazon = useStore((s) => s.scenario.amazon)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const byCase = amazon.sellByCase
  const sellWord = byCase ? 'case' : 'unit'

  const inputs = () => {
    if (!product) return null
    const estimated = estimateAmazonFBAFee(amazon.weightG, amazon.longestCm, amazon.medianCm, amazon.shortestCm)
    const fees = effectiveAmazonFees(amazon, product.unitsPerCase)
    return (
      <div>
        <InputsHeader />
        <InputSection first>THE PRODUCT</InputSection>
        <div className="mb-[18px]">
          <TextField label="Product name" value={product.name} onChange={(v) => updateProduct(product.id, { name: v })} />
        </div>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Cost price / unit" prefix="£" value={product.cogsPerUnit} onCommit={(v) => updateProduct(product.id, { cogsPerUnit: v })} />
          <Field label="Sale price / unit" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          <Field label="Units per case" inputMode="numeric" value={product.unitsPerCase} onCommit={(v) => updateProduct(product.id, { unitsPerCase: Math.round(v) })} />
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
        </div>

        <div className="mt-4">
          <MonoToggle
            label="SELL AS FULL CASES (NOT SINGLES)"
            on={byCase}
            onToggle={() => updateScenario('amazon', { sellByCase: !byCase })}
          />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          {byCase
            ? `One listing = one case of ${product.unitsPerCase}. Fulfilment and storage are charged once per case, so they spread across the units — usually much cheaper per unit.`
            : 'One listing = one single unit. Toggle on if you sell full cases/multipacks on Amazon.'}
        </div>

        <InputSection>
          FBA FEES <RateCardTag label="dated defaults — check the rate card" />
        </InputSection>

        <div className="mb-4">
          <MonoToggle
            label={`ESTIMATE FEE FROM ${byCase ? 'CASE' : 'UNIT'} SIZE & WEIGHT`}
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
              <Field label={`${byCase ? 'Case' : 'Unit'} weight`} suffix="g" value={amazon.weightG} onCommit={(v) => updateScenario('amazon', { weightG: v })} />
              <Field label="Longest side" suffix="cm" value={amazon.longestCm} onCommit={(v) => updateScenario('amazon', { longestCm: v })} />
              <Field label="Median side" suffix="cm" value={amazon.medianCm} onCommit={(v) => updateScenario('amazon', { medianCm: v })} />
              <Field label="Shortest side" suffix="cm" value={amazon.shortestCm} onCommit={(v) => updateScenario('amazon', { shortestCm: v })} />
            </div>
            <div className="border-2 border-ink bg-ink text-bile py-3 px-3.5 font-mono text-[13px] flex justify-between flex-wrap gap-1.5 mt-2">
              <span>SIZE TIER: {estimated.tier}</span>
              <span>
                FULFILMENT {gbp(estimated.fee)}/{sellWord}
                {byCase ? ` · ${gbp(fees.fulfilmentFeePerUnit)}/unit` : ''} · REFERRAL {(fees.referralFeePercent * 100).toFixed(0)}%
              </span>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
            <Field label="Referral fee" suffix="%" scale={100} value={amazon.referralFee} onCommit={(v) => updateScenario('amazon', { referralFee: v })} />
            <Field label={`Fulfilment / ${sellWord}`} prefix="£" value={amazon.fulfilmentFee} onCommit={(v) => updateScenario('amazon', { fulfilmentFee: v })} />
          </div>
        )}

        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4 mt-4">
          <Field label={`Storage / ${sellWord} / mo`} prefix="£" value={amazon.storageFee} onCommit={(v) => updateScenario('amazon', { storageFee: v })} />
          <Field label="Fuel surcharge" suffix="%" scale={100} value={amazon.fuelSurcharge} onCommit={(v) => updateScenario('amazon', { fuelSurcharge: v })} />
          <Field label="Inbound logistics / case" prefix="£" value={amazon.logisticsPerCase} onCommit={(v) => updateScenario('amazon', { logisticsPerCase: v })} />
          <Field label="Professional plan / mo" prefix="£" value={amazon.planMonthly} onCommit={(v) => updateScenario('amazon', { planMonthly: v })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Professional plan: Amazon's £25/month seller subscription — a fixed cost spread across your monthly volume. Inbound logistics is your freight into Amazon's FC, per case.
        </div>

        <InputSection>PLAN SPREAD (THIS SKU)</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label={`${byCase ? 'Cases' : 'Units'} sold / mo`} inputMode="numeric" value={amazon.monthlyUnits} onCommit={(v) => updateScenario('amazon', { monthlyUnits: Math.max(0, Math.round(v)) })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Only spreads the plan fee across this SKU's per-unit view. Set each SKU's annual volume — and toggle SKUs in or out — in THE FULL CHANNEL table on the right.
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const fees = effectiveAmazonFees(amazon, product.unitsPerCase)
    const result = amazonFBAMargin(product, fees)
    const sp = rspExVat(product)
    const tierName = amazon.estimatorOn
      ? estimateAmazonFBAFee(amazon.weightG, amazon.longestCm, amazon.medianCm, amazon.shortestCm).tier
      : 'manual'

    // The selling plan spread across monthly CONSUMER units (cases × case size when by case)
    const monthlyUnits = amazonMonthlyUnits(amazon, product.unitsPerCase)
    const planCut = amazon.planMonthly / (monthlyUnits || 1)
    const logUnit = logisticsPerUnit(amazon.logisticsPerCase, product.unitsPerCase)
    const totalFees = result.totalFees + planCut
    const net = result.netRevenue - planCut
    const gp = result.grossProfit - planCut
    const gpAfterLog = gp - logUnit
    const pctVal = sp > 0 ? gp / sp : 0
    const noMargin = gpAfterLog <= 0

    let healthColor = BILE
    let healthLabel = HEALTH.healthy
    const pctAfter = sp > 0 ? gpAfterLog / sp : 0
    if (noMargin) { healthColor = REDPEN; healthLabel = HEALTH.underwater }
    else if (pctAfter < 0.12) { healthColor = REDPEN; healthLabel = HEALTH.thin }
    else if (pctAfter < 0.25) { healthColor = REDUCED; healthLabel = HEALTH.tight }

    const verdict = noMargin
      ? `You lose ${gbp(gpAfterLog)} on every unit after freight. The fees are bigger than the price. ${byCase ? 'Even as cases.' : 'A single unit is not an FBA product — sell a multipack.'}`
      : `FBA keeps ${gbp(totalFees)} of the ${gbp(sp)} sale. After freight you keep ${gbp(gpAfterLog)}. ${byCase ? 'Cases carry their weight.' : 'Thin, but hey, Jeff loves you.'}`

    return (
      <div>
        <Receipt tool="THE AMAZON CUT" name={product.name} subline={`FBA margin · per unit${byCase ? ` · sold as cases of ${product.unitsPerCase}` : ''}`} verdict={verdict} verdictColor={noMargin ? REDPEN : INK}>
          <Rule className="mt-4 mb-2.5" />
          <RSection label="WHAT AMAZON TAKES" />
          <RLine label="Sale price ex-VAT" value={gbp(sp)} bold />
          <RLine label={`Referral fee (${(fees.referralFeePercent * 100).toFixed(0)}%)`} value={neg(result.referralFee)} dim />
          <RLine label={`Fulfilment (${tierName}${byCase ? ', per unit of case' : ''})`} value={neg(result.fulfilmentFee)} dim />
          <RLine label="Storage / unit" value={neg(result.storageFee)} dim />
          <RLine label="Selling plan / unit" value={neg(planCut)} dim />
          <Rule dotted className="my-2" />
          <RLine label="Total Amazon fees" value={neg(totalFees)} bold color={REDPEN} />
          <RLine label="Net revenue / unit" value={gbp(net)} bold color={net < 0 ? REDPEN : INK} />
          <RLine label="Net as % of gross (ex-VAT)" value={pct(sp > 0 ? net / sp : 0)} dim />
          <RLine label="less cost price" value={neg(product.cogsPerUnit)} dim />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="YOUR MARGIN" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Gross profit / unit', value: gbp(gp), color: gp <= 0 ? REDPEN : BILE },
              { label: 'Margin % (of gross)', value: pct(pctVal), big: false, color: gp <= 0 ? REDPEN : BILE },
            ]}
          />
          <RLine label="Margin as % of net revenue" value={net > 0 ? pct(gp / net) : '—'} color={gp <= 0 ? REDPEN : INK} />
          <RLine label={`less inbound logistics (${gbp(amazon.logisticsPerCase)}/case)`} value={neg(logUnit)} dim />
          <RLine label="Profit after logistics / unit" value={gbp(gpAfterLog)} bold color={gpAfterLog <= 0 ? REDPEN : INK} />
          {(() => {
            // The lowest sale price (inc VAT) at which the unit stops losing money, freight included
            const perUnitCosts =
              product.cogsPerUnit +
              fees.fulfilmentFeePerUnit * (1 + fees.fuelLogisticsSurcharge) +
              fees.monthlyStoragePerUnit +
              planCut +
              logUnit
            const breakEven = fees.referralFeePercent < 1
              ? (perUnitCosts / (1 - fees.referralFeePercent)) * (1 + product.vatRate)
              : Infinity
            return (
              <RLine
                label="Break-even sale price (inc VAT)"
                value={gbp(breakEven)}
                bold
                color={product.rrpIncVat < breakEven ? REDPEN : INK}
              />
            )
          })()}
        </Receipt>
        <ChannelPlan channel="amazon" />
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
