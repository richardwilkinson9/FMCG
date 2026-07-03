import type { SavedModel } from '../../store/archive'
import { hydrateSavedModel } from '../../store/archive'
import { activeWholesalerMargin } from '../../store/scenario'
import { retailerPnL, listingModel } from '../../utils/calculations'
import { Receipt, Rule, RLine, RSection } from './Receipt'
import { gbp, pct, REDPEN, INK } from './format'

/**
 * THE AUDIT — two saved models side by side, per product and in total.
 * Deltas that cost you money print in Red-Pen; everything else stays Ink.
 */

interface ProductSnapshot {
  cost: number
  rsp: number
  ros: number
  marginUnit: number
  marginPct: number
}

function snapshot(model: SavedModel): { byProduct: Map<string, ProductSnapshot>; periodMargin: number } {
  const { products, scenario } = hydrateSavedModel(model)
  const ws = activeWholesalerMargin(scenario.grocery)
  const listingInputs = {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promoWeeks: scenario.listing.promoWeeks,
    promoStartWeek: scenario.listing.promoStartWeek,
    promoUpliftPercent: scenario.listing.promoUplift,
  }
  const byProduct = new Map<string, ProductSnapshot>()
  let periodMargin = 0
  for (const p of products) {
    const pnl = retailerPnL(p, scenario.grocery.retailerMargin, ws)
    byProduct.set(p.name, {
      cost: p.cogsPerUnit,
      rsp: p.rrpIncVat,
      ros: p.weeklyRateOfSale,
      marginUnit: pnl.brandGrossMarginPerUnit,
      marginPct: pnl.brandGrossMarginPercent,
    })
    periodMargin += listingModel(p, scenario.grocery.retailerMargin, listingInputs, ws).totalGrossMargin
  }
  return { byProduct, periodMargin }
}

function DeltaRow({ label, a, b, fmt, badWhenUp }: {
  label: string
  a: number
  b: number
  fmt: (v: number) => string
  /** true = an increase costs you money (cost price); false = a decrease does (margin) */
  badWhenUp: boolean | null
}) {
  const delta = b - a
  const bad = badWhenUp === null ? false : badWhenUp ? delta > 0 : delta < 0
  const sign = delta > 0 ? '+' : ''
  return (
    <div className="flex justify-between text-[13px] py-0.5">
      <span className="opacity-75">{label}</span>
      <span className="text-right font-mono">
        {fmt(a)} <span className="opacity-50">→</span> {fmt(b)}{' '}
        <span className="font-bold" style={{ color: bad ? REDPEN : INK }}>
          ({delta === 0 ? 'no change' : sign + fmt(delta)})
        </span>
      </span>
    </div>
  )
}

export default function ComparePanel({ a, b }: { a: SavedModel; b: SavedModel }) {
  const snapA = snapshot(a)
  const snapB = snapshot(b)
  const names = [...new Set([...snapA.byProduct.keys(), ...snapB.byProduct.keys()])]

  const totalDelta = snapB.periodMargin - snapA.periodMargin
  const verdict =
    totalDelta === 0
      ? 'No change in period margin. A meeting that could have been an email.'
      : totalDelta > 0
        ? `Period margin up ${gbp(totalDelta)} between these two saves. Someone did their job.`
        : `Period margin down ${gbp(Math.abs(totalDelta))} between these two saves. Find out who agreed to what.`

  const when = (m: SavedModel) =>
    new Date(m.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="mt-5 max-w-[760px]">
      <Receipt
        tool="THE AUDIT"
        name={`${a.name} (${when(a)}) → ${b.name} (${when(b)})`}
        subline="what moved between two saved models"
        verdict={verdict}
        verdictColor={totalDelta < 0 ? REDPEN : INK}
      >
        {names.map((name) => {
          const pa = snapA.byProduct.get(name)
          const pb = snapB.byProduct.get(name)
          return (
            <div key={name}>
              <Rule className="mt-4 mb-2" />
              <RSection label={name.toUpperCase()} />
              {!pa || !pb ? (
                <div className="text-[13px] py-0.5" style={{ color: REDPEN }}>
                  {!pa ? 'Not in the first save.' : 'Not in the second save. Delisted, or forgotten.'}
                </div>
              ) : (
                <>
                  <DeltaRow label="Cost price / unit" a={pa.cost} b={pb.cost} fmt={gbp} badWhenUp={true} />
                  <DeltaRow label="RSP" a={pa.rsp} b={pb.rsp} fmt={gbp} badWhenUp={null} />
                  <DeltaRow label="Rate of sale" a={pa.ros} b={pb.ros} fmt={(v) => v.toFixed(1)} badWhenUp={false} />
                  <DeltaRow label="Margin / unit" a={pa.marginUnit} b={pb.marginUnit} fmt={gbp} badWhenUp={false} />
                  <DeltaRow label="Margin %" a={pa.marginPct} b={pb.marginPct} fmt={pct} badWhenUp={false} />
                </>
              )}
            </div>
          )
        })}
        <Rule className="mt-4 mb-2" />
        <RSection label="THE PERIOD, WHOLE MODEL" />
        <RLine label={`Period gross margin — ${when(a)}`} value={gbp(snapA.periodMargin)} dim />
        <RLine label={`Period gross margin — ${when(b)}`} value={gbp(snapB.periodMargin)} dim />
        <RLine
          label="Change"
          value={`${totalDelta > 0 ? '+' : ''}${gbp(totalDelta)}`}
          bold
          color={totalDelta < 0 ? REDPEN : INK}
        />
      </Receipt>
    </div>
  )
}
