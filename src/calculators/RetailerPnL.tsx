import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { retailerPnL, rspExVat, logisticsPerUnit, listingModel } from '../utils/calculations'
import { GROCERY_DEFAULTS } from '../config/fees'
import { BENCHMARK_CATEGORIES, BENCHMARK_CHECKED, benchmarkFor } from '../config/benchmarks'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import BuyerStrip from '../components/gross/BuyerStrip'
import Field, { TextField, InputSection, MonoToggle } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

const DATED_TAG = 'dated default — check the rate card'

/** The P&L — who takes what, per unit. */
export default function RetailerPnL() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const logistics = useStore((s) => s.scenario.logistics)
  const listing = useStore((s) => s.scenario.listing)
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
        <div className="mt-4 grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          <Field label="Inbound logistics / case" prefix="£" value={logistics.perCase} onCommit={(v) => updateScenario('logistics', { perCase: v })} />
          <Field label="Customer investment / year" prefix="£" value={listing.annualInvestment} onCommit={(v) => updateScenario('listing', { annualInvestment: Math.max(0, v) })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          {GROCERY_DEFAULTS.retailerMarginPercent.note} Logistics is your freight to the customer, per case — one constant, part of your landed cost. Customer investment is fixed annual cash behind the listing, paid quarterly — shared with The Listing.
        </div>

        <InputSection>THE BENCHMARK</InputSection>
        <label className="block">
          <span className="block text-xs font-semibold mb-1.5">Category (for the margin benchmark)</span>
          <div className="relative border-2 border-ink bg-white h-[52px] flex items-center">
            <select
              value={product.category ?? 'General FMCG'}
              onChange={(e) => updateProduct(product.id, { category: e.target.value })}
              aria-label="Product category"
              className="flex-1 border-0 outline-none bg-transparent px-3.5 font-mono text-[15px] text-ink h-full cursor-pointer appearance-none"
            >
              {BENCHMARK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="w-11 flex items-center justify-center border-l-2 border-ink font-mono text-sm h-full pointer-events-none">▾</span>
          </div>
        </label>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          Indicative ranges only — a sense-check, not a target. Sourced on The Rate Card.
        </div>
        <BuyerStrip />
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const wsOn = grocery.wholesalerEnabled
    const logUnit = logisticsPerUnit(logistics.perCase, product.unitsPerCase)
    const result = retailerPnL(product, grocery.retailerMargin, activeWholesalerMargin(grocery), logUnit)
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
          <RLine label="Net as % of shelf (gross)" value={pct(rsp > 0 ? result.brandNetRevenue / rsp : 0)} dim />
          <RLine label="less cost price" value={neg(product.cogsPerUnit)} dim />
          <RLine label={`less inbound logistics (${gbp(logistics.perCase)}/case)`} value={neg(logUnit)} dim />
          <RLine label="Landed cost / unit" value={neg(result.landedCostPerUnit)} dim />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="YOUR MARGIN" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Gross margin / unit', value: gbp(gmUnit), color: noMargin ? REDPEN : BILE },
              { label: 'Margin % (of net revenue)', value: pct(gmPct), big: false, color: noMargin ? REDPEN : BILE },
            ]}
          />
          <RLine label="Margin / case" value={gbp(result.marginPerCase)} color={noMargin ? REDPEN : INK} />
          <RLine label="Net revenue / case" value={gbp(result.revenuePerCase)} />

          <Rule dotted className="mt-3 mb-2" />
          {(() => {
            // Fixed annual cash behind the listing (four quarterly instalments),
            // spread per unit over the annual volume from your Listing settings
            const annual = listingModel(
              product,
              grocery.retailerMargin,
              { stores: listing.stores, skus: listing.skus, weeksInPeriod: 52, promos: listing.promos },
              activeWholesalerMargin(grocery),
              logUnit,
            )
            const invPerUnit = annual.totalVolume > 0 ? listing.annualInvestment / annual.totalVolume : 0
            const afterInv = gmUnit - invPerUnit
            return (
              <>
                <RSection label="CUSTOMER INVESTMENT" />
                <RLine label={`Annual investment (${gbp(listing.annualInvestment / 4)} × 4, quarterly)`} value={gbp(listing.annualInvestment)} dim />
                <RLine
                  label={`spread per unit (annual volume ${Math.round(annual.totalVolume).toLocaleString('en-GB')} units)`}
                  value={neg(invPerUnit)}
                  dim
                  color={invPerUnit > 0 ? REDPEN : undefined}
                />
                <RLine label="Margin after investment / unit" value={gbp(afterInv)} bold color={afterInv <= 0 ? REDPEN : INK} />
              </>
            )
          })()}

          <Rule dotted className="mt-3 mb-2" />
          {(() => {
            const bm = benchmarkFor(product.category)
            const below = gmPct < bm.low
            const above = gmPct > bm.high
            const within = !below && !above
            const verdictText = noMargin
              ? 'Below anything anyone would call a margin.'
              : within
                ? `In range for ${bm.category.toLowerCase()}.`
                : below
                  ? `Below the ${bm.category.toLowerCase()} range. Thin for the category.`
                  : `Above the ${bm.category.toLowerCase()} range. Enjoy it while it lasts.`
            const color = noMargin || below ? REDPEN : within ? INK : BILE
            return (
              <>
                <RSection label={`BENCHMARK — ${bm.category.toUpperCase()}`} />
                <RLine label="Indicative range (of net revenue)" value={`${pct(bm.low)} – ${pct(bm.high)}`} dim />
                <RLine label="You are at" value={pct(gmPct)} bold color={noMargin ? REDPEN : INK} />
                <RLine label="Read" value={verdictText} dim color={color} />
                <div className="font-mono text-[10px] mt-1 opacity-55">Indicative only — checked {BENCHMARK_CHECKED}. See The Rate Card.</div>
              </>
            )
          })()}

          <Rule dotted className="mt-3 mb-2" />
          <RSection label="IF THE BUYER PUSHES" />
          {[0.025, 0.05].map((extra) => {
            const pushed = retailerPnL(product, grocery.retailerMargin + extra, activeWholesalerMargin(grocery), logUnit)
            return (
              <RLine
                key={extra}
                label={`At ${Math.round((grocery.retailerMargin + extra) * 100 * 10) / 10}% retailer margin`}
                value={`${gbp(pushed.brandGrossMarginPerUnit)} / unit`}
                dim
                color={pushed.brandGrossMarginPerUnit <= 0 ? REDPEN : undefined}
              />
            )
          })}
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
