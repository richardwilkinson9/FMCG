import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { weeklyProjection, cashPhasing, monthlyPhasing, retailerPnL, logisticsPerUnit } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock, BreakdownLabel } from '../components/gross/Receipt'
import { gbp, neg, n0, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/**
 * The Wait — when the money actually moves. Reads the same weekly spine as
 * The Listing; the only new inputs are the payment terms on either side.
 */
export default function CashFlow() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const listing = useStore((s) => s.scenario.listing)
  const logistics = useStore((s) => s.scenario.logistics)
  const cash = useStore((s) => s.scenario.cash)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)

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
          <Field label="Selling price (RSP inc VAT)" prefix="£" value={product.rrpIncVat} onCommit={(v) => updateProduct(product.id, { rrpIncVat: v })} />
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
          <Field label="Units per case" inputMode="numeric" value={product.unitsPerCase} onCommit={(v) => updateProduct(product.id, { unitsPerCase: Math.round(v) })} />
          <Field label="Rate of sale / store / wk" value={product.weeklyRateOfSale} onCommit={(v) => updateProduct(product.id, { weeklyRateOfSale: v })} />
          <Field label="Stores" inputMode="numeric" value={listing.stores} onCommit={(v) => updateScenario('listing', { stores: Math.round(v) })} />
        </div>

        <InputSection>THE TERMS</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Customer pays you in" suffix="days" inputMode="numeric" value={cash.debtorDays} onCommit={(v) => updateScenario('cash', { debtorDays: Math.max(0, Math.round(v)) })} />
          <Field label="You pay your supplier in" suffix="days" inputMode="numeric" value={cash.creditorDays} onCommit={(v) => updateScenario('cash', { creditorDays: Math.max(0, Math.round(v)) })} />
          <Field label="Shelf fill / store" suffix="cases" value={cash.shelfFillCasesPerStore} onCommit={(v) => updateScenario('cash', { shelfFillCasesPerStore: Math.max(0, v) })} />
          <Field label="Inbound logistics / case" prefix="£" value={logistics.perCase} onCommit={(v) => updateScenario('logistics', { perCase: v })} />
          <Field label="Customer investment / year" prefix="£" value={listing.annualInvestment} onCommit={(v) => updateScenario('listing', { annualInvestment: Math.max(0, v) })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Shelf fill is the one-off order to stock every store on day one — bought and invoiced in week 1, so it hits your cash on the same terms. Days round to whole weeks.
        </div>

        <div className="mt-4 border-2 border-ink bg-white p-3">
          <div className="font-mono text-[11px] tracking-[0.08em] opacity-60 mb-1.5">READS YOUR LISTING PLAN</div>
          <div className="font-mono text-[12px] leading-relaxed">
            The weekly demand — {listing.stores} stores, {listing.weeksInPeriod} weeks,{' '}
            {listing.promos.length} promo{listing.promos.length === 1 ? '' : 's'} — comes straight from The Listing.
            Change the promos, period or investment there and the cash curve follows.
          </div>
          <button
            onClick={() => { setActiveCalculator('listing-model'); window.scrollTo(0, 0) }}
            className="mt-2.5 font-mono text-[11px] tracking-[0.05em] border-2 border-ink bg-receipt py-1.5 px-2.5 cursor-pointer hover:bg-bile"
          >
            EDIT THE LISTING →
          </button>
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const logUnit = logisticsPerUnit(logistics.perCase, product.unitsPerCase)
    const listingInputs = { stores: listing.stores, skus: listing.skus, weeksInPeriod: listing.weeksInPeriod, promos: listing.promos }
    const weeks = weeklyProjection(product, grocery.retailerMargin, listingInputs, activeWholesalerMargin(grocery), logUnit)
    // Shelf fill: cases/store × stores × units/case, invoiced and bought in week 1
    const pnl = retailerPnL(product, grocery.retailerMargin, activeWholesalerMargin(grocery), logUnit)
    const shelfFillUnits = cash.shelfFillCasesPerStore * listing.stores * product.unitsPerCase
    const shelfFill = {
      nsv: shelfFillUnits * pnl.brandNetRevenue,
      cost: shelfFillUnits * (product.cogsPerUnit + logUnit),
    }
    const flow = cashPhasing(weeks, product, cash.debtorDays, cash.creditorDays, logUnit, listing.annualInvestment, shelfFill)

    // Roll the cash rows onto the same 4-4-5 months as everything else, with a
    // spill row for money still landing after M12
    const asMonthRows = flow.rows.map((r) => ({
      week: r.week, onPromo: false, volume: 0, gsv: r.cashIn, funding: r.cashOut, nsv: 0, grossMargin: 0,
      retailSalesValue: 0, cumulativeVolume: 0, cumulativeGsv: 0, cumulativeFunding: 0, cumulativeNsv: 0, cumulativeMargin: 0,
    }))
    const months = monthlyPhasing(asMonthRows, 0)
    const spillIn = flow.rows.filter((r) => r.week > 52).reduce((a, r) => a + r.cashIn, 0)
    const spillOut = flow.rows.filter((r) => r.week > 52).reduce((a, r) => a + r.cashOut, 0)

    const gapMonths = months.filter((m) => m.gsv - m.funding < 0).length
    const funded = flow.peakGap >= 0
    const healthColor = funded ? BILE : flow.peakGap > -5000 ? REDUCED : REDPEN
    const healthLabel = funded ? HEALTH.healthy : 'NEEDS FUNDING'

    const verdict = funded
      ? `The listing funds itself from week one. Terms of ${cash.debtorDays} days never put you underwater. Rare.`
      : `You are ${gbp(-flow.peakGap)} out of pocket at the worst point (week ${flow.peakGapWeek}). That is the cash this listing needs before it pays you back — margin is an opinion, this is the fact.`

    let cumulative = 0
    return (
      <div>
        <Receipt
          tool="THE WAIT"
          name={product.name}
          subline={`paid in ${cash.debtorDays} days · you pay in ${cash.creditorDays} · ${listing.weeksInPeriod}-week plan`}
          verdict={verdict}
          verdictColor={funded ? INK : REDPEN}
          stickyHero
        >
          <BreakdownLabel />
          <Rule className="mt-4 mb-2.5" />
          <RSection label="THE GAP" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            hero
            rows={[
              { label: 'Peak cash gap', value: funded ? gbp(0) : gbp(flow.peakGap), color: funded ? BILE : REDPEN },
              { label: funded ? 'never underwater' : `worst week: ${flow.peakGapWeek}`, value: '', big: false },
            ]}
          />
          <RLine label="Cash in, total (NSV received)" value={gbp(flow.totalIn)} />
          <RLine label="Cash out, total (goods + investment)" value={gbp(flow.totalOut)} />
          <RLine label="Months that drain cash" value={`${gapMonths} of 12`} dim color={gapMonths > 0 ? REDPEN : undefined} />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="THE YEAR BY MONTH — CASH (4-4-5)" />
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="The year by month, cash">
            <table className="w-full text-[12px] font-mono border-collapse min-w-[480px]">
              <thead>
                <tr className="border-b-2 border-ink text-[10px] tracking-[0.08em] opacity-60">
                  <th scope="col" className="text-left py-1.5 pr-2 font-normal">M</th>
                  <th scope="col" className="text-right py-1.5 px-2 font-normal">CASH IN</th>
                  <th scope="col" className="text-right py-1.5 px-2 font-normal">CASH OUT</th>
                  <th scope="col" className="text-right py-1.5 px-2 font-normal">NET</th>
                  <th scope="col" className="text-right py-1.5 pl-2 font-normal">RUNNING</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const net = m.gsv - m.funding
                  cumulative += net
                  return (
                    <tr key={m.month} className="border-b border-dotted border-ink">
                      <td className="py-1 pr-2 font-bold">M{m.month}</td>
                      <td className="text-right py-1 px-2">{gbp(m.gsv)}</td>
                      <td className="text-right py-1 px-2">{gbp(m.funding)}</td>
                      <td className="text-right py-1 px-2" style={{ color: net < 0 ? REDPEN : INK }}>{gbp(net)}</td>
                      <td className="text-right py-1 pl-2 font-bold" style={{ color: cumulative < 0 ? REDPEN : INK }}>{gbp(cumulative)}</td>
                    </tr>
                  )
                })}
                {(spillIn > 0 || spillOut > 0) && (
                  <tr className="border-b border-dotted border-ink">
                    <td className="py-1 pr-2 font-bold">M12+</td>
                    <td className="text-right py-1 px-2">{gbp(spillIn)}</td>
                    <td className="text-right py-1 px-2">{gbp(spillOut)}</td>
                    <td className="text-right py-1 px-2">{gbp(spillIn - spillOut)}</td>
                    <td className="text-right py-1 pl-2 font-bold" style={{ color: cumulative + spillIn - spillOut < 0 ? REDPEN : INK }}>{gbp(cumulative + spillIn - spillOut)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="font-mono text-[10px] mt-1.5 opacity-60">
            M12+ is money still moving after the year ends — the tail of your payment terms.
          </div>

          {shelfFillUnits > 0 && (
            <>
              <Rule className="mt-3.5 mb-2.5" />
              <RSection label="THE SHELF FILL (WEEK 1)" />
              <RLine label={`${n0(shelfFillUnits)} units to stock ${n0(listing.stores)} stores`} value={`${n0(cash.shelfFillCasesPerStore * listing.stores)} cases`} dim />
              <RLine label="Invoiced (cash in, later)" value={gbp(shelfFill.nsv)} dim />
              <RLine label="Goods to buy (cash out, sooner)" value={neg(shelfFill.cost)} dim color={REDPEN} />
            </>
          )}

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="THE TERMS, PLAINLY" />
          <RLine label="A week's sales become cash after" value={`${Math.round(cash.debtorDays / 7)} week${Math.round(cash.debtorDays / 7) === 1 ? '' : 's'}`} dim />
          <RLine label="You pay for those goods after" value={`${Math.round(cash.creditorDays / 7)} week${Math.round(cash.creditorDays / 7) === 1 ? '' : 's'}`} dim />
          <RLine
            label="The mismatch"
            value={`${n0(Math.abs(Math.round(cash.debtorDays / 7) - Math.round(cash.creditorDays / 7)))} week${Math.abs(Math.round(cash.debtorDays / 7) - Math.round(cash.creditorDays / 7)) === 1 ? '' : 's'} ${cash.debtorDays >= cash.creditorDays ? 'you fund' : 'in your favour'}`}
            dim
            color={cash.debtorDays > cash.creditorDays ? REDPEN : INK}
          />
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 12134"
      group="GROCERY"
      type="CASH FLOW"
      title="The Wait"
      subtitle="Margin is an opinion. Cash is a fact."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
