import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { retailerPnL, solveForCostPrice, solveForRrp } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, pct, BILE, REDPEN, INK } from '../components/gross/format'

/** The Floor — the lowest cost price (or RRP) that still clears the target margin. */
export default function MinimumMargin() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const minMargin = useStore((s) => s.scenario.minMargin)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const costMode = minMargin.solveMode === 'cost'

  const inputs = () => {
    if (!product) return null
    const modeBtn = (active: boolean) =>
      `flex-1 border-0 h-12 cursor-pointer font-mono text-[13px] font-bold tracking-[0.04em] text-ink ${active ? 'bg-bile' : 'bg-receipt'}`
    return (
      <div>
        <InputsHeader />
        <InputSection first>SOLVE FOR</InputSection>
        <div className="flex border-2 border-ink mb-[22px]">
          <button onClick={() => updateScenario('minMargin', { solveMode: 'cost' })} className={`${modeBtn(costMode)} border-r-2 border-ink`} aria-pressed={costMode}>
            COST PRICE CEILING
          </button>
          <button onClick={() => updateScenario('minMargin', { solveMode: 'rrp' })} className={modeBtn(!costMode)} aria-pressed={!costMode}>
            RRP FLOOR
          </button>
        </div>

        <InputSection first>THE PRODUCT</InputSection>
        <div className="mb-[18px]">
          <TextField label="Product name" value={product.name} onChange={(v) => updateProduct(product.id, { name: v })} />
        </div>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          {costMode ? (
            <Field label="RRP (inc VAT)" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          ) : (
            <Field label="Cost price / unit" prefix="£" value={product.cogsPerUnit} onCommit={(v) => updateProduct(product.id, { cogsPerUnit: v })} />
          )}
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
        </div>

        <InputSection>THE TARGETS</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Retailer margin" suffix="%" scale={100} tag="dated default" value={grocery.retailerMargin} onCommit={(v) => updateScenario('grocery', { retailerMargin: v })} />
          <Field label="Target brand margin" suffix="%" scale={100} value={minMargin.targetBrandMargin} onCommit={(v) => updateScenario('minMargin', { targetBrandMargin: v })} />
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const ws = activeWholesalerMargin(grocery)
    const ret = grocery.retailerMargin
    const target = minMargin.targetBrandMargin

    // Current margin at today's cost price and RRP
    const now = retailerPnL(product, ret, ws)
    const curMarginPct = now.brandGrossMarginPercent

    let answerLabel: string, answerStr: string, currentLabel: string, currentStr: string
    let headVal: number, ok: boolean, subline: string, knownReceiptLabel: string, knownStr: string
    let verdict: string

    if (costMode) {
      const solved = solveForCostPrice(product.rrpIncVat, product.vatRate, ret, target, ws)
      headVal = solved.requiredCogs - product.cogsPerUnit
      ok = product.cogsPerUnit <= solved.requiredCogs
      answerLabel = 'Highest cost price you can pay'
      answerStr = gbp(solved.requiredCogs)
      currentLabel = 'cost price now'
      currentStr = gbp(product.cogsPerUnit)
      subline = 'cost price ceiling · per unit'
      knownReceiptLabel = 'RRP (inc VAT)'
      knownStr = gbp(product.rrpIncVat)
      verdict = ok
        ? `You have ${gbp(headVal)} of headroom on cost price. The maths clears.`
        : `Your cost price is ${gbp(-headVal)} over the ceiling. You cannot hit ${Math.round(target * 100)}% at this RRP. Lift the RRP or cut the cost.`
    } else {
      const solved = solveForRrp(product.cogsPerUnit, product.vatRate, ret, target, ws)
      headVal = product.rrpIncVat - solved.rrpIncVat
      ok = product.rrpIncVat >= solved.rrpIncVat
      answerLabel = 'Lowest RRP you can list at'
      answerStr = gbp(solved.rrpIncVat)
      currentLabel = 'RRP now'
      currentStr = gbp(product.rrpIncVat)
      subline = 'RRP floor · inc VAT'
      knownReceiptLabel = 'Cost price / unit'
      knownStr = gbp(product.cogsPerUnit)
      verdict = ok
        ? `Your RRP sits ${gbp(headVal)} above the floor. Room to promote.`
        : `Your RRP is ${gbp(-headVal)} below the floor. At this cost price you cannot hit ${Math.round(target * 100)}%.`
    }

    return (
      <div>
        <Receipt tool="THE FLOOR" name={product.name} subline={subline} verdict={verdict} verdictColor={ok ? INK : REDPEN}>
          <Rule className="mt-4 mb-2.5" />
          <RSection label="THE TARGET" />
          <RLine label="Retailer margin" value={`${Math.round(ret * 100)}%`} />
          <RLine label="Target brand margin" value={`${Math.round(target * 100)}%`} />
          <RLine label={knownReceiptLabel} value={knownStr} />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="THE ANSWER" health={{ color: ok ? BILE : REDPEN, label: ok ? 'CLEARS' : 'MISSES' }} />
          <AnswerBlock rows={[{ label: answerLabel, value: answerStr, color: ok ? BILE : REDPEN }]} />
          <RLine label={`Your ${currentLabel}`} value={currentStr} />
          <RLine label="Headroom" value={gbp(headVal)} color={ok ? INK : REDPEN} />
          <RLine label="Brand margin at your price" value={pct(curMarginPct)} color={ok ? INK : REDPEN} />
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 03318"
      group="GROCERY"
      type="MINIMUM MARGIN"
      title="The Floor"
      subtitle="The lowest cost price that still clears your margin."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
