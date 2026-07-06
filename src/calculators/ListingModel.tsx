import { useStore, generateId } from '../store/useStore'
import { activeWholesalerMargin, suggestPromoTiming, PROMO_MECHANICS, MAX_PROMOS, type Promo } from '../store/scenario'
import { listingModel, retailerPnL, logisticsPerUnit, monthlyPhasing } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import Field, { TextField, InputSection, MonoToggle } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, n0, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/** The Listing — model the range review before the buyer does. */
export default function ListingModel() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const listing = useStore((s) => s.scenario.listing)
  const logistics = useStore((s) => s.scenario.logistics)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  const setPromos = (promos: Promo[]) => updateScenario('listing', { promos })
  const patchPromo = (id: string, patch: Partial<Promo>) =>
    setPromos(listing.promos.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const addPromo = () => {
    if (listing.promos.length >= MAX_PROMOS) return
    const preset = PROMO_MECHANICS[0]
    const next: Promo = {
      id: generateId(),
      startWeek: 1,
      weeks: 4,
      mechanic: preset.label,
      discount: preset.discount,
      uplift: preset.uplift,
      supplierFunded: true,
    }
    setPromos(suggestPromoTiming([...listing.promos, next], listing.weeksInPeriod))
  }

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
          <Field label="Retailer margin" suffix="%" scale={100} tag="default" value={grocery.retailerMargin} onCommit={(v) => updateScenario('grocery', { retailerMargin: v })} />
          <Field label="Inbound logistics / case" prefix="£" value={logistics.perCase} onCommit={(v) => updateScenario('logistics', { perCase: v })} />
          <Field label="Customer investment / year" prefix="£" value={listing.annualInvestment} onCommit={(v) => updateScenario('listing', { annualInvestment: Math.max(0, v) })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Customer investment is fixed cash behind the listing — gate fees, marketing support, whatever the buyer called it. Paid in four even quarterly instalments (weeks 1, 14, 27, 40).
        </div>

        <InputSection>THE DISTRIBUTION</InputSection>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Stores" inputMode="numeric" value={listing.stores} onCommit={(v) => updateScenario('listing', { stores: Math.round(v) })} />
          <Field label="Rate of sale / store / wk" value={product.weeklyRateOfSale} onCommit={(v) => updateProduct(product.id, { weeklyRateOfSale: v })} />
          <Field label="Weeks in period" inputMode="numeric" value={listing.weeksInPeriod} onCommit={(v) => updateScenario('listing', { weeksInPeriod: Math.max(1, Math.min(104, Math.round(v))) })} />
          <Field label="SKUs listed" inputMode="numeric" value={listing.skus} onCommit={(v) => updateScenario('listing', { skus: Math.round(v) })} />
        </div>

        <InputSection>
          THE PROMO CALENDAR <span className="font-normal opacity-70">({listing.promos.length} of {MAX_PROMOS} — two to six a year is normal)</span>
        </InputSection>

        {listing.promos.length === 0 && (
          <div className="font-mono text-[13px] border-2 border-ink p-3.5 mb-4">
            No promos on the calendar. Base rate of sale all year.
          </div>
        )}

        {listing.promos.map((promo, i) => (
          <div key={promo.id} className="border-2 border-ink mb-4">
            <div className="flex items-center justify-between bg-ink text-bile font-mono text-[12px] px-3 py-1.5">
              <span>PROMO {i + 1} · {promo.mechanic.toUpperCase()} · WK {promo.startWeek}–{promo.startWeek + promo.weeks - 1}</span>
              <button
                onClick={() => setPromos(listing.promos.filter((p) => p.id !== promo.id))}
                aria-label={`Remove promo ${i + 1}`}
                className="cursor-pointer bg-transparent border-0 text-bile font-mono text-[14px] hover:text-redpen"
              >
                ×
              </button>
            </div>
            <div className="p-3">
              <label className="block mb-3">
                <span className="block text-xs font-semibold mb-1.5">Mechanic (sets the price cut)</span>
                <div className="relative border-2 border-ink bg-white h-[52px] flex items-center">
                  <select
                    value={promo.mechanic}
                    onChange={(e) => {
                      const preset = PROMO_MECHANICS.find((m) => m.label === e.target.value)
                      if (preset) patchPromo(promo.id, { mechanic: preset.label, discount: preset.discount, uplift: preset.uplift })
                    }}
                    aria-label={`Promo ${i + 1} mechanic`}
                    className="flex-1 border-0 outline-none bg-transparent px-3.5 font-mono text-[15px] text-ink h-full cursor-pointer appearance-none"
                  >
                    {PROMO_MECHANICS.map((m) => (
                      <option key={m.label} value={m.label}>{m.label}</option>
                    ))}
                  </select>
                  <span className="w-11 flex items-center justify-center border-l-2 border-ink font-mono text-sm h-full pointer-events-none">▾</span>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start week" inputMode="numeric" value={promo.startWeek} onCommit={(v) => patchPromo(promo.id, { startWeek: Math.max(1, Math.round(v)) })} />
                <Field label="Length" suffix="wks" inputMode="numeric" value={promo.weeks} onCommit={(v) => patchPromo(promo.id, { weeks: Math.max(1, Math.round(v)) })} />
                <Field label="Price cut" suffix="%" scale={100} value={promo.discount} onCommit={(v) => patchPromo(promo.id, { discount: v, mechanic: 'Custom' })} />
                <Field label="Volume uplift" suffix="%" scale={100} value={promo.uplift} onCommit={(v) => patchPromo(promo.id, { uplift: v })} />
              </div>
              <div className="mt-3">
                <MonoToggle
                  label="FULLY SUPPLIER FUNDED"
                  on={promo.supplierFunded}
                  onToggle={() => patchPromo(promo.id, { supplierFunded: !promo.supplierFunded })}
                />
              </div>
              <div className="font-mono text-[11px] mt-1.5 opacity-65">
                {promo.supplierFunded
                  ? 'You fund the cut off invoice. The retailer keeps their margin %.'
                  : 'The retailer funds the cut. You bank full list price.'}
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={addPromo}
            disabled={listing.promos.length >= MAX_PROMOS}
            className="border-2 border-ink bg-ink text-bile px-4 py-2.5 font-mono text-[13px] cursor-pointer hover:bg-bile hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + ADD PROMO
          </button>
          {listing.promos.length > 0 && (
            <button
              onClick={() => setPromos(suggestPromoTiming(listing.promos, listing.weeksInPeriod))}
              className="border-2 border-ink bg-receipt text-ink px-4 py-2.5 font-mono text-[13px] cursor-pointer hover:bg-bile"
            >
              SUGGEST TIMING
            </button>
          )}
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Suggest timing spreads the promos evenly across the period. Buyers plan by quarter; so should you.
        </div>
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const logUnit = logisticsPerUnit(logistics.perCase, product.unitsPerCase)
    const result = listingModel(product, grocery.retailerMargin, listing, activeWholesalerMargin(grocery), logUnit, listing.annualInvestment)
    const instalments = Math.floor((listing.weeksInPeriod - 1) / 13) + 1

    const pnl = retailerPnL(product, grocery.retailerMargin, activeWholesalerMargin(grocery), logUnit)
    const gmUnit = pnl.brandGrossMarginPerUnit
    const noMargin = result.totalGrossMargin <= 0
    const maxVol = Math.max(result.peakWeeklyVolume, result.weeklyVolume, 1)

    let healthColor = BILE
    let healthLabel = 'WORTH IT'
    if (noMargin) { healthColor = REDPEN; healthLabel = 'LOSS-MAKING' }
    else if (result.gmPctOfNsv < 0.15) { healthColor = REDUCED; healthLabel = HEALTH.thin }

    const totalIncremental = result.promoSummaries.reduce((a, p) => a + p.incrementalUnits, 0)
    const investmentSinksIt = !noMargin && result.totalInvestment > 0 && result.marginAfterInvestment <= 0
    const verdict = noMargin
      ? `Every unit loses money - don't be an idiot. ${gbp(-result.totalGrossMargin)} lost across the period.`
      : investmentSinksIt
        ? `The listing makes ${gbp(result.totalGrossMargin)} of margin and hands back ${gbp(result.totalInvestment)} in customer investment. You are paying to be on the shelf.`
        : `The listing makes ${gbp(result.totalGrossMargin)} of gross margin. The promos add ${n0(totalIncremental)} units and cost ${gbp(result.totalFunding)} in funding - whether they pay is The Payback's problem.`

    return (
      <div>
        <Receipt
          tool="THE LISTING"
          name={product.name}
          subline={`${listing.weeksInPeriod}-week projection · ${listing.stores} stores · ${listing.promos.length} promo${listing.promos.length === 1 ? '' : 's'}`}
          verdict={verdict}
          verdictColor={noMargin || investmentSinksIt ? REDPEN : INK}
        >
          <Rule className="mt-4 mb-2.5" />
          <RSection label="WEEKLY VOLUME" />
          <div className="flex items-end gap-[2px] h-[70px] border-b-2 border-ink">
            {result.weeks.map((w) => (
              <div
                key={w.week}
                className="flex-1 min-w-[2px]"
                style={{
                  height: `${Math.max(6, (w.volume / maxVol) * 100).toFixed(0)}%`,
                  background: w.onPromo ? BILE : INK,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] mt-1.5 opacity-70">
            <span>WK 1</span>
            <span>
              <span className="inline-block w-[9px] h-[9px] border-2 border-ink align-middle" style={{ background: BILE }} /> promo weeks
            </span>
            <span>WK {listing.weeksInPeriod}</span>
          </div>

          <Rule className="mt-4 mb-2.5" />
          <RSection label="THE VOLUME" />
          <RLine label="Base volume / week" value={`${n0(result.weeklyVolume)} units`} />
          <RLine label="Peak promo volume / week" value={`${n0(result.peakWeeklyVolume)} units`} />
          <RLine label="Total volume" value={`${n0(result.totalVolume)} units`} />
          <RLine label="Total cases" value={`${n0(result.totalCases)} cases`} />
          <RLine
            label="Cases / store / week"
            value={(product.unitsPerCase > 0 ? product.weeklyRateOfSale / product.unitsPerCase : 0).toFixed(2)}
            dim
            color={product.unitsPerCase > 0 && product.weeklyRateOfSale / product.unitsPerCase < 0.5 ? REDPEN : undefined}
          />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="THE ANNUAL PLAN — GROSS TO NET" />
          <RLine label="GSV (invoice, full list)" value={gbp(result.totalGsv)} bold />
          <RLine label="less promo funding" value={neg(result.totalFunding)} dim color={result.totalFunding > 0 ? REDPEN : undefined} />
          <RLine label="NSV" value={gbp(result.totalNsv)} bold />
          <RLine label="NSV as % of GSV" value={pct(result.nsvPctOfGsv)} dim />
          <RLine label={`less COGS + logistics (${gbp(logistics.perCase)}/case)`} value={neg(result.totalVolume * (product.cogsPerUnit + logisticsPerUnit(logistics.perCase, product.unitsPerCase)))} dim />
          <RLine label="Retail sales value (consumer £)" value={gbp(result.totalRetailSalesValue)} dim />

          {result.promoSummaries.length > 0 && (
            <>
              <Rule dotted className="mt-3 mb-2" />
              <RSection label="PROMO BY PROMO" />
              {result.promoSummaries.map((ps) => {
                const promo = listing.promos[ps.index]
                return (
                  <RLine
                    key={promo.id}
                    label={`${ps.index + 1}. ${promo.mechanic} · wk ${promo.startWeek} · ${ps.weeksInPeriod} wks${ps.clamped ? ' (clipped)' : ''}${promo.supplierFunded ? '' : ' · retailer funded'}`}
                    value={`+${n0(ps.incrementalUnits)} units · ${gbp(ps.fundingCost)}`}
                    dim
                    color={ps.clamped ? REDPEN : undefined}
                  />
                )
              })}
            </>
          )}

          <Rule className="mt-3.5 mb-2.5" />
          {(() => {
            // The year on the 4-4-5 calendar — how a buyer or FD reads the plan
            const months = monthlyPhasing(result.weeks, listing.annualInvestment)
            const shown = months.filter((m) => m.weekStart <= listing.weeksInPeriod || m.investment > 0)
            return (
              <>
                <RSection label="THE YEAR BY MONTH (4-4-5)" />
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] font-mono border-collapse min-w-[520px]">
                    <thead>
                      <tr className="border-b-2 border-ink text-[10px] tracking-[0.08em] opacity-60">
                        <th scope="col" className="text-left py-1.5 pr-2 font-normal">M</th>
                        <th scope="col" className="text-left py-1.5 pr-2 font-normal">WKS</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">VOLUME</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">NSV</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">GM</th>
                        <th scope="col" className="text-right py-1.5 px-2 font-normal">INVEST</th>
                        <th scope="col" className="text-right py-1.5 pl-2 font-normal">NET</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((m) => (
                        <tr key={m.month} className="border-b border-dotted border-ink">
                          <td className="py-1 pr-2 font-bold">M{m.month}</td>
                          <td className="py-1 pr-2 opacity-60">{m.weekStart}–{m.weekEnd}</td>
                          <td className="text-right py-1 px-2">{n0(m.volume)}</td>
                          <td className="text-right py-1 px-2">{gbp(m.nsv)}</td>
                          <td className="text-right py-1 px-2" style={{ color: m.grossMargin < 0 ? REDPEN : INK }}>{gbp(m.grossMargin)}</td>
                          <td className="text-right py-1 px-2" style={{ color: m.investment > 0 ? REDPEN : INK }}>{m.investment > 0 ? `−${gbp(m.investment).replace('−', '')}` : '—'}</td>
                          <td className="text-right py-1 pl-2 font-bold" style={{ color: m.netOfInvestment < 0 ? REDPEN : INK }}>{gbp(m.netOfInvestment)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="font-mono text-[10px] mt-1.5 opacity-55">
                  4-4-5 retail calendar. Investment instalments land in M1, M4, M7, M10. NET = gross margin less investment.
                </div>
                <Rule className="mt-3.5 mb-2.5" />
              </>
            )
          })()}
          <RSection label="THE PRIZE" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Gross margin, period', value: gbp(result.totalGrossMargin), color: noMargin ? REDPEN : BILE },
              { label: 'GM as % of NSV', value: pct(result.gmPctOfNsv), big: false, color: noMargin ? REDPEN : BILE },
            ]}
          />
          <RLine label="Margin / unit (off promo)" value={gbp(gmUnit)} color={gmUnit <= 0 ? REDPEN : INK} />
          <RLine
            label={`less customer investment (${instalments} quarterly instalment${instalments === 1 ? '' : 's'} of ${gbp(listing.annualInvestment / 4)})`}
            value={neg(result.totalInvestment)}
            dim
            color={result.totalInvestment > 0 ? REDPEN : undefined}
          />
          <RLine
            label="Margin after investment, period"
            value={gbp(result.marginAfterInvestment)}
            bold
            color={result.marginAfterInvestment <= 0 ? REDPEN : INK}
          />
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 04405"
      group="GROCERY"
      type="LISTING MODEL"
      title="The Listing"
      subtitle="Let's look at your next range review."
      inputs={inputs}
      receipt={receipt}
    />
  )
}
