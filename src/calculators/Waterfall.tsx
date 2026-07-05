import { useStore } from '../store/useStore'
import { activeWholesalerMargin } from '../store/scenario'
import { retailerPnL, rspExVat, listingModel, logisticsPerUnit } from '../utils/calculations'
import CalcShell, { InputsHeader, CalcActions } from '../components/gross/CalcShell'
import BuyerStrip from '../components/gross/BuyerStrip'
import Field, { TextField, InputSection, MonoToggle } from '../components/gross/Field'
import { Receipt, Rule, RLine, RSection, AnswerBlock } from '../components/gross/Receipt'
import { gbp, neg, pct, BILE, REDUCED, REDPEN, INK, HEALTH } from '../components/gross/format'

/**
 * The Waterfall — gross to net. Starts from the brand's list price
 * (retailerPnL().brandNetRevenue: shelf ex-VAT less the chain margins) and
 * subtracts trade-spend deductions entered as % of list.
 */
export default function Waterfall() {
  const product = useStore((s) => s.getActiveProduct())
  const grocery = useStore((s) => s.scenario.grocery)
  const waterfall = useStore((s) => s.scenario.waterfall)
  const listing = useStore((s) => s.scenario.listing)
  const logistics = useStore((s) => s.scenario.logistics)
  const updateProduct = useStore((s) => s.updateProduct)
  const updateScenario = useStore((s) => s.updateScenario)

  // The promo funding implied by the actual promo calendar: annual supplier-
  // funded spend as a share of annual GSV (the same "% of list" lens).
  const calendarFundingRate = (() => {
    if (!product) return 0
    const lm = listingModel(product, grocery.retailerMargin, listing, activeWholesalerMargin(grocery))
    return lm.totalGsv > 0 ? lm.totalFunding / lm.totalGsv : 0
  })()
  const effectivePromoFunding = waterfall.promoFromCalendar ? calendarFundingRate : waterfall.promoFunding

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
          <Field label="VAT rate" suffix="%" scale={100} value={product.vatRate} onCommit={(v) => updateProduct(product.id, { vatRate: v })} />
          <Field label="Retailer margin" suffix="%" scale={100} tag="default" value={grocery.retailerMargin} onCommit={(v) => updateScenario('grocery', { retailerMargin: v })} />
        </div>

        <InputSection>
          TRADE SPEND <span className="font-normal opacity-70">(% of your list price)</span>
        </InputSection>
        <div className="mb-4">
          <MonoToggle
            label="PROMO FUNDING FROM MY CALENDAR"
            on={waterfall.promoFromCalendar}
            onToggle={() => updateScenario('waterfall', { promoFromCalendar: !waterfall.promoFromCalendar })}
          />
        </div>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-2 gap-4">
          {waterfall.promoFromCalendar ? (
            <div className="border-2 border-ink bg-white h-[52px] px-3.5 flex items-center justify-between">
              <span className="text-xs font-semibold">Promo funding</span>
              <span className="font-mono text-[15px]">{(calendarFundingRate * 100).toFixed(1)}%</span>
            </div>
          ) : (
            <Field label="Promo funding" suffix="%" scale={100} value={waterfall.promoFunding} onCommit={(v) => updateScenario('waterfall', { promoFunding: v })} />
          )}
          <Field label="Back margin / retro" suffix="%" scale={100} value={waterfall.backMargin} onCommit={(v) => updateScenario('waterfall', { backMargin: v })} />
          <Field label="Other trade spend" suffix="%" scale={100} value={waterfall.otherTrade} onCommit={(v) => updateScenario('waterfall', { otherTrade: v })} />
        </div>
        <div className="font-mono text-[11px] mt-1.5 opacity-65">
          {waterfall.promoFromCalendar
            ? `Derived from The Listing: your supplier-funded promos are ${(calendarFundingRate * 100).toFixed(1)}% of annual GSV. Edit the calendar there.`
            : 'Back margin is still margin. It still comes off your invoice.'}
        </div>
        <BuyerStrip />
      </div>
    )
  }

  const receipt = () => {
    if (!product) return null
    const ws = activeWholesalerMargin(grocery)
    const logUnit = logisticsPerUnit(logistics.perCase, product.unitsPerCase)
    const pnl = retailerPnL(product, grocery.retailerMargin, ws)
    const rsp = rspExVat(product)
    const list = pnl.brandNetRevenue
    // Landed cost per unit: COGS + the constant inbound logistics
    const landed = product.cogsPerUnit + logUnit

    const promoCut = list * effectivePromoFunding
    const retroCut = list * waterfall.backMargin
    const otherCut = list * waterfall.otherTrade
    const tradeTotal = promoCut + retroCut + otherCut
    const net = list - tradeTotal
    const gm = net - landed
    const gmPct = list > 0 ? gm / list : 0
    const noMargin = gm <= 0

    // Split bar: landed cost / trade / margin as shares of list price
    const base = list > 0 ? list : 1
    let costW = Math.max(0, (landed / base) * 100)
    let tradeW = Math.max(0, (tradeTotal / base) * 100)
    let marginW = Math.max(0, (gm / base) * 100)
    if (gm < 0) {
      const t = landed + tradeTotal
      costW = t > 0 ? (landed / t) * 100 : 0
      tradeW = t > 0 ? (tradeTotal / t) * 100 : 0
      marginW = 0
    }
    const marginBar = gm < 0 ? REDPEN : BILE

    let healthColor = BILE
    let healthLabel = HEALTH.healthy
    if (noMargin) { healthColor = REDPEN; healthLabel = HEALTH.underwater }
    else if (gmPct < 0.15) { healthColor = REDPEN; healthLabel = HEALTH.thin }
    else if (gmPct < 0.30) { healthColor = REDUCED; healthLabel = HEALTH.tight }

    const verdict = noMargin
      ? `Trade spend and cost eat the whole list price. You net ${gbp(gm)} a unit. The promo plan does not work.`
      : `Trade spend takes ${gbp(tradeTotal)} of your ${gbp(list)} list price. You keep ${gbp(gm)}. Back margin is still margin.`

    return (
      <div>
        <Receipt tool="THE WATERFALL" name={product.name} subline="gross to net · per unit" verdict={verdict} verdictColor={noMargin ? REDPEN : INK}>
          <Rule className="mt-4 mb-2.5" />
          <RLine label="Shelf price ex-VAT" value={gbp(rsp)} />
          <RLine label={`less retailer margin (${Math.round(grocery.retailerMargin * 100)}%)`} value={neg(pnl.retailerMarginPerUnit)} dim />
          {grocery.wholesalerEnabled && (
            <RLine label={`less wholesaler margin (${Math.round(grocery.wholesalerMargin * 100)}%)`} value={neg(pnl.wholesalerMarginPerUnit)} dim />
          )}
          <RLine label="Your list price" value={gbp(list)} bold />
          <RLine label={`less promo funding (${parseFloat((effectivePromoFunding * 100).toFixed(4))}%${waterfall.promoFromCalendar ? ', from calendar' : ''})`} value={neg(promoCut)} dim />
          <RLine label={`less back margin (${parseFloat((waterfall.backMargin * 100).toFixed(4))}%)`} value={neg(retroCut)} dim />
          <RLine label={`less other trade (${parseFloat((waterfall.otherTrade * 100).toFixed(4))}%)`} value={neg(otherCut)} dim />
          <RLine
            label={`Total trade spend (${pct(list > 0 ? tradeTotal / list : 0)} of list)`}
            value={neg(tradeTotal)}
            bold
            color={REDPEN}
          />
          <Rule dotted className="my-2" />
          <RLine label="Net net revenue" value={gbp(net)} bold color={net < 0 ? REDPEN : INK} />
          <RLine label="Net as % of list (gross)" value={pct(list > 0 ? net / list : 0)} dim />
          <RLine label="Net as % of shelf ex-VAT" value={pct(rsp > 0 ? net / rsp : 0)} dim />
          <RLine label="less cost price" value={neg(product.cogsPerUnit)} dim />
          <RLine label={`less inbound logistics (${gbp(logistics.perCase)}/case)`} value={neg(logUnit)} dim />

          <Rule className="mt-3.5 mb-2.5" />
          <RSection label="WHAT IS LEFT" health={{ color: healthColor, label: healthLabel }} />
          <AnswerBlock
            rows={[
              { label: 'Net net margin / unit', value: gbp(gm), color: noMargin ? REDPEN : BILE },
              { label: 'Margin on list', value: pct(gmPct), big: false, color: noMargin ? REDPEN : BILE },
            ]}
          />
          <RLine label="Margin as % of net revenue" value={net > 0 ? pct(gm / net) : '—'} color={noMargin ? REDPEN : INK} />

          <div className="mt-3.5 mb-1.5 text-[11px] tracking-[0.1em] opacity-60">WHERE YOUR LIST PRICE GOES</div>
          <div className="flex h-[34px] border-2 border-ink overflow-hidden">
            <div style={{ width: `${costW.toFixed(1)}%`, background: INK }} />
            <div className="border-l-2 border-ink" style={{ width: `${tradeW.toFixed(1)}%`, background: REDUCED }} />
            <div className="border-l-2 border-ink" style={{ width: `${marginW.toFixed(1)}%`, background: marginBar }} />
          </div>
          <div className="flex gap-4 mt-2 text-[11px] flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-[11px] h-[11px] border-2 border-ink" style={{ background: INK }} />Cost {Math.round(costW)}%</span>
            <span className="flex items-center gap-1.5"><span className="w-[11px] h-[11px] border-2 border-ink" style={{ background: REDUCED }} />Trade spend {Math.round(tradeW)}%</span>
            <span className="flex items-center gap-1.5"><span className="w-[11px] h-[11px] border-2 border-ink" style={{ background: marginBar }} />Margin {Math.round(marginW)}%</span>
          </div>
        </Receipt>
        <CalcActions />
      </div>
    )
  }

  return (
    <CalcShell
      sku="50 02231"
      group="GROCERY"
      type="GROSS TO NET"
      title="The Waterfall"
      subtitle="Every deduction between shelf price and your bank."
      stampNote="verify your terms"
      inputs={inputs}
      receipt={receipt}
    />
  )
}
