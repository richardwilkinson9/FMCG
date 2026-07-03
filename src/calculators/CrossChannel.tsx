import { useStore } from '../store/useStore'
import { activeWholesalerMargin, effectiveAmazonFees, effectiveTikTokFees } from '../store/scenario'
import { crossChannelComparison, rspExVat } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule } from '../components/gross/Receipt'
import { gbp, pct, BILE, REDUCED, REDPEN, INK } from '../components/gross/format'

/** Traffic light on gross profit as a share of shelf ex-VAT. */
function light(share: number, negative: boolean): string {
  if (negative || share < 0.12) return REDPEN
  if (share < 0.25) return REDUCED
  return BILE
}

/** The Line-Up — net margin, every channel, side by side. */
export default function CrossChannel() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const amazon = useStore((s) => s.scenario.amazon)
  const tiktok = useStore((s) => s.scenario.tiktok)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const amazonFees = effectiveAmazonFees(amazon)
  const tiktokFees = effectiveTikTokFees(tiktok)

  const channelDot = (label: string, tag?: string) => (
    <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] mt-5 mb-3">
      <span className="w-3 h-3 border-2 border-ink bg-ink" />
      {label}
      {tag && <span className="font-normal opacity-55 border-2 border-ink px-[5px] py-px">{tag}</span>}
    </div>
  )

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
          <Field label="RSP / LIST" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
        </div>

        {channelDot('GROCERY')}
        <Field label="Retailer margin" suffix="%" scale={100} tag="dated default" value={grocery.retailerMargin} onCommit={(v) => updateScenario('grocery', { retailerMargin: v })} />

        {channelDot('AMAZON FBA', 'dated defaults')}
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Referral fee" suffix="%" scale={100} value={amazonFees.referralFeePercent}
            onCommit={(v) => updateScenario('amazon', { referralFee: v, estimatorOn: false })} />
          <Field label="Fulfilment / unit" prefix="£" value={amazonFees.fulfilmentFeePerUnit}
            onCommit={(v) => updateScenario('amazon', { fulfilmentFee: v, estimatorOn: false })} />
        </div>

        {channelDot('TIKTOK SHOP', 'dated defaults')}
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Platform fee" suffix="%" scale={100} value={tiktokFees.platformCommission}
            onCommit={(v) => updateScenario('tiktok', { platformCommission: v, estimatorOn: false })} />
          <Field label="Affiliate fee" suffix="%" scale={100} value={tiktok.affiliateCommission}
            onCommit={(v) => updateScenario('tiktok', { affiliateCommission: v })} />
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const comparison = crossChannelComparison(
      product,
      grocery.retailerMargin,
      amazonFees,
      tiktokFees,
      activeWholesalerMargin(grocery),
    )
    const rsp = rspExVat(product)

    // The lowest price (inc VAT) at which each channel stops losing money
    const ws = activeWholesalerMargin(grocery)
    const vatUp = 1 + product.vatRate
    const groceryKeep = (1 - grocery.retailerMargin) * (1 - ws)
    const amazonPerUnit =
      product.cogsPerUnit +
      amazonFees.fulfilmentFeePerUnit * (1 + amazonFees.fuelLogisticsSurcharge) +
      amazonFees.monthlyStoragePerUnit
    const tiktokPctFees = tiktokFees.platformCommission + tiktokFees.affiliateCommission + tiktokFees.refundAdminPercent

    const raw = [
      {
        name: 'GROCERY', disp: 'Grocery',
        net: comparison.grocery.netRevenuePerUnit, gp: comparison.grocery.grossProfitPerUnit,
        breakEven: groceryKeep > 0 ? (product.cogsPerUnit / groceryKeep) * vatUp : Infinity,
      },
      {
        name: 'AMAZON FBA', disp: 'Amazon',
        net: comparison.amazon.netRevenuePerUnit, gp: comparison.amazon.grossProfitPerUnit,
        breakEven: amazonFees.referralFeePercent < 1 ? (amazonPerUnit / (1 - amazonFees.referralFeePercent)) * vatUp : Infinity,
      },
      {
        name: 'TIKTOK SHOP', disp: 'TikTok',
        net: comparison.tiktok.netRevenuePerUnit, gp: comparison.tiktok.grossProfitPerUnit,
        breakEven: tiktokPctFees < 1 ? ((tiktokFees.perOrderFee + product.cogsPerUnit) / (1 - tiktokPctFees)) * vatUp : Infinity,
      },
    ]
    const bestGP = Math.max(...raw.map((r) => r.gp))
    const winner = raw.reduce((a, b) => (b.gp > a.gp ? b : a))
    const losers = raw.filter((r) => r.gp < 0)

    let verdict: string
    let verdictColor = INK
    if (winner.gp <= 0) {
      verdictColor = REDPEN
      verdict = 'Every channel loses money at this cost price. This product does not work online. Fix the cost price first.'
    } else if (losers.length) {
      const l = losers[0]
      verdict = `${winner.disp} wins at ${gbp(winner.gp)} a unit. ${l.disp} loses ${gbp(Math.abs(l.gp))} — a ${gbp(product.rrpIncVat)} single unit is not ${l.disp}’s product.`
    } else {
      verdict = `${winner.disp} pays best at ${gbp(winner.gp)} a unit. The biggest channel is rarely the one that pays.`
    }

    return (
      <div>
        <Receipt
          tool="THE LINE-UP"
          name={product.name}
          subline="gross profit / unit · same cost price"
          verdict={verdict}
          verdictColor={verdictColor}
          footer="Same cost price across all three. Runs in your browser."
        >
          <Rule className="mt-4 mb-3" />
          {raw.map((r) => {
            const share = rsp > 0 ? r.gp / rsp : 0
            const negative = r.gp < 0
            const isBest = r.gp === bestGP && r.gp > 0
            return (
              <div key={r.name} className="border-2 border-ink mb-3">
                <div className={`flex items-center justify-between py-2 px-3 border-b-2 border-ink ${isBest ? 'bg-bile' : 'bg-receipt'}`}>
                  <span className="flex items-center gap-[9px] text-[13px] font-bold">
                    <span className="w-3 h-3 border-2 border-ink inline-block" style={{ background: light(share, negative) }} />
                    {r.name}
                  </span>
                  {isBest && (
                    <span className="text-[10px] tracking-[0.08em] border-2 border-ink bg-ink text-bile py-0.5 px-[7px]">BEST</span>
                  )}
                </div>
                <div className="py-[11px] px-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs">Gross profit / unit</span>
                    <span className="text-[23px] font-bold" style={{ color: negative ? REDPEN : INK }}>{gbp(r.gp)}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-[5px]">
                    <span className="opacity-75">net revenue {gbp(r.net)}</span>
                    <span className="font-bold" style={{ color: negative ? REDPEN : INK }}>{pct(share)} of shelf</span>
                  </div>
                  <div className="flex justify-between text-xs mt-[5px]">
                    <span className="opacity-75">break-even price (inc VAT)</span>
                    <span style={{ color: product.rrpIncVat < r.breakEven ? REDPEN : INK }}>{gbp(r.breakEven)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 09920"
      group="COMPARE"
      type="CROSS-CHANNEL"
      title="The Line-Up"
      subtitle="Net margin, every channel, side by side."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
