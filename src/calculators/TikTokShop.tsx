import { useStore } from '../store/useStore'
import { effectiveTikTokFees } from '../store/scenario'
import { tiktokShopMargin, rspExVat } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, BILE, REDUCED, REDPEN, INK } from '../components/gross/format'

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
          <Field label="Sale price (inc VAT)" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
        </div>

        <InputSection>
          TIKTOK SHOP FEES <span className="border-2 border-ink px-[5px] py-px">dated defaults — check the rate card</span>
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
    const noMargin = gp <= 0

    let healthColor = BILE
    let healthLabel = 'HEALTHY'
    if (noMargin) { healthColor = REDPEN; healthLabel = 'UNDERWATER' }
    else if (pctVal < 0.12) { healthColor = REDPEN; healthLabel = 'THIN' }
    else if (pctVal < 0.25) { healthColor = REDUCED; healthLabel = 'TIGHT' }

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
