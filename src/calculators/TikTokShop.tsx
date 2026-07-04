import { useStore } from '../store/useStore'
import { effectiveTikTokFees } from '../store/scenario'
import { tiktokShopMargin, tiktokAnnualPnL, rspExVat, logisticsPerUnit } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions, RateCardTag } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, n0, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/** The TikTok Cut — commission, affiliate, and the per-order nibble. */
export default function TikTokShop() {
  const product = useStore((s) => s.getActiveProduct())
  const tiktok = useStore((s) => s.scenario.tiktok)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const fees = effectiveTikTokFees(tiktok)

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
          <Field label="Sale Price" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
        </div>

        <InputSection>
          TIKTOK SHOP FEES <RateCardTag label="dated defaults — check the rate card" />
        </InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Platform commission" suffix="%" scale={100} value={fees.platformCommission}
            onCommit={(v) => updateScenario('tiktok', { platformCommission: v, estimatorOn: false })} />
          <Field label="Affiliate commission" suffix="%" scale={100} value={tiktok.affiliateCommission}
            onCommit={(v) => updateScenario('tiktok', { affiliateCommission: v })} />
          <Field label="Per-order fee" prefix="£" value={tiktok.perOrderFee}
            onCommit={(v) => updateScenario('tiktok', { perOrderFee: v })} />
          <Field label="Refund admin" suffix="%" scale={100} value={tiktok.refundAdmin}
            onCommit={(v) => updateScenario('tiktok', { refundAdmin: v })} />
          <Field label="Inbound logistics / case" prefix="£" value={tiktok.logisticsPerCase}
            onCommit={(v) => updateScenario('tiktok', { logisticsPerCase: v })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Inbound logistics is your freight into the TikTok/3PL warehouse, per case — not the shopper's delivery.
        </div>

        <InputSection>THE FULL YEAR</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Cases sold / year" inputMode="numeric" value={tiktok.casesPerYear} onCommit={(v) => updateScenario('tiktok', { casesPerYear: Math.max(0, Math.round(v)) })} />
          <Field label="Units per case" inputMode="numeric" value={product.unitsPerCase} onCommit={(v) => updateProduct(product.id, { unitsPerCase: Math.round(v) })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Feeds the annual P&L on the receipt. Per-order fee assumes one unit per order — the cautious read.
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const result = tiktokShopMargin(product, fees)
    const sp = rspExVat(product)
    const gp = result.grossProfit
    const pctVal = result.grossMarginPercent
    const logUnit = logisticsPerUnit(tiktok.logisticsPerCase, product.unitsPerCase)
    const gpAfterLog = gp - logUnit
    const noMargin = gpAfterLog <= 0

    let healthColor = BILE
    let healthLabel = HEALTH.healthy
    const pctAfter = sp > 0 ? gpAfterLog / sp : 0
    if (noMargin) { healthColor = REDPEN; healthLabel = HEALTH.underwater }
    else if (pctAfter < 0.12) { healthColor = REDPEN; healthLabel = HEALTH.thin }
    else if (pctAfter < 0.25) { healthColor = REDUCED; healthLabel = HEALTH.tight }

    // The verdict names the biggest single fee
    const parts: [string, number][] = [
      ['platform commission', result.platformFee],
      ['affiliate commission', result.affiliateFee],
      ['per-order fee', result.perOrderFee],
      ['refund admin', result.refundCost],
    ]
    const biggest = parts.reduce((a, b) => (b[1] > a[1] ? b : a))

    const verdict = noMargin
      ? `You lose ${gbp(gp)} a unit. The ${biggest[0]} is the one that hurts. Drop it or lift the price.`
      : `TikTok keeps ${gbp(result.totalFees)} of the ${gbp(sp)} sale. The ${biggest[0]} is your biggest single cost.`

    const pl = (v: number) => parseFloat((v * 100).toFixed(4))

    return (
      <div>
        <Receipt tool="THE TIKTOK CUT" name={product.name} subline="TikTok Shop margin · per unit" verdict={verdict} verdictColor={noMargin ? REDPEN : INK}>
          <Rule className="mt-4 mb-2.5" />
          <RSection label="WHAT TIKTOK TAKES" />
          <RLine label="Sale price ex-VAT" value={gbp(sp)} bold />
          <RLine label={`Platform commission (${pl(fees.platformCommission)}%)`} value={neg(result.platformFee)} dim />
          <RLine label={`Affiliate commission (${pl(fees.affiliateCommission)}%)`} value={neg(result.affiliateFee)} dim />
          <RLine label="Per-order fee" value={neg(result.perOrderFee)} dim />
          <RLine label={`Refund admin (${pl(fees.refundAdminPercent)}%)`} value={neg(result.refundCost)} dim />
          <Rule dotted className="my-2" />
          <RLine label="Total TikTok fees" value={neg(result.totalFees)} bold color={REDPEN} />
          <RLine label="Net revenue / unit" value={gbp(result.netRevenue)} bold color={result.netRevenue < 0 ? REDPEN : INK} />
          <RLine label="Net as % of gross (ex-VAT)" value={pct(result.netPctOfGross)} dim />
          <RLine label="less cost price" value={neg(product.cogsPerUnit)} dim />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="YOUR MARGIN" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Gross profit / unit', value: gbp(gp), color: gp <= 0 ? REDPEN : BILE },
              { label: 'Margin % (of gross)', value: pct(pctVal), big: false, color: gp <= 0 ? REDPEN : BILE },
            ]}
          />
          <RLine label="Margin as % of net revenue" value={result.netRevenue > 0 ? pct(result.grossMarginPctOfNet) : '—'} color={gp <= 0 ? REDPEN : INK} />
          <RLine label={`less inbound logistics (${gbp(tiktok.logisticsPerCase)}/case)`} value={neg(logUnit)} dim />
          <RLine label="Profit after logistics / unit" value={gbp(gpAfterLog)} bold color={gpAfterLog <= 0 ? REDPEN : INK} />
          {(() => {
            // The lowest sale price (inc VAT) at which the unit stops losing money, freight included
            const pctFees = fees.platformCommission + fees.affiliateCommission + fees.refundAdminPercent
            const breakEven = pctFees < 1
              ? ((fees.perOrderFee + product.cogsPerUnit + logUnit) / (1 - pctFees)) * (1 + product.vatRate)
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

          {(() => {
            const year = tiktokAnnualPnL(product, fees, tiktok.casesPerYear)
            const annualLogistics = tiktok.casesPerYear * tiktok.logisticsPerCase
            const gmAfterLog = year.gm - annualLogistics
            const yearLoss = gmAfterLog <= 0
            return (
              <>
                <Rule className="mt-3.5 mb-2.5" />
                <RSection label={`THE FULL YEAR — ${n0(tiktok.casesPerYear)} CASES`} />
                <RLine label={`Units (${n0(tiktok.casesPerYear)} × ${product.unitsPerCase})`} value={`${n0(year.units)} units`} dim />
                <RLine label="GSV (ex-VAT)" value={gbp(year.gsv)} bold />
                <RLine label="less platform commission" value={neg(year.platform)} dim />
                <RLine label="less affiliate commission" value={neg(year.affiliate)} dim />
                <RLine label="less per-order fees" value={neg(year.orderFees)} dim />
                <RLine label="less refund admin" value={neg(year.refunds)} dim />
                <Rule dotted className="my-2" />
                <RLine label="NSV" value={gbp(year.nsv)} bold color={year.nsv < 0 ? REDPEN : INK} />
                <RLine label="NSV as % of GSV" value={pct(year.nsvPctOfGsv)} dim />
                <RLine label="less COGS" value={neg(year.cogs)} dim />
                <RLine label="Gross margin, year" value={gbp(year.gm)} bold color={year.gm <= 0 ? REDPEN : INK} />
                <RLine label="GM as % of NSV" value={pct(year.gmPctOfNsv)} color={year.gm <= 0 ? REDPEN : INK} />
                <RLine label={`less inbound logistics (${n0(tiktok.casesPerYear)} × ${gbp(tiktok.logisticsPerCase)})`} value={neg(annualLogistics)} dim />
                <RLine label="Profit after logistics, year" value={gbp(gmAfterLog)} bold color={yearLoss ? REDPEN : INK} />
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
      sku="50 08813"
      group="MARKETPLACE"
      type="TIKTOK SHOP"
      title="The TikTok Cut"
      subtitle="Commission, affiliate, and the per-order nibble."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
