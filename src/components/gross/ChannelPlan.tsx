import { useState } from 'react'
import type { Product } from '../../types/product'
import { useStore } from '../../store/useStore'
import { effectiveAmazonFees, effectiveTikTokFees } from '../../store/scenario'
import {
  amazonChannelPnL,
  tiktokChannelPnL,
  channelListed,
  skuCasesPerYear,
} from '../../utils/calculations'
import { Rule, RLine, RSection } from './Receipt'
import { gbp, neg, pct, n0, REDPEN, INK } from './format'

/**
 * THE FULL CHANNEL — every SKU on a marketplace, toggled in or out, with an
 * editable cases/year each and the whole-channel P&L (GSV → fees → NSV → GM →
 * after logistics). The selling plan is a single channel cost, charged once.
 */

/** A compact commit-on-blur number input for the cases/year cells. */
function CasesInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [buf, setBuf] = useState<string | null>(null)
  const shown = buf ?? String(value)
  const commit = () => {
    if (buf === null) return
    const n = parseFloat(buf.replace(/,/g, ''))
    if (Number.isFinite(n)) onCommit(Math.max(0, Math.round(n)))
    setBuf(null)
  }
  return (
    <input
      value={shown}
      inputMode="numeric"
      aria-label="Cases per year"
      onChange={(e) => setBuf(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-[76px] border-2 border-ink bg-white px-2 py-1 font-mono text-[12px] text-right text-ink"
    />
  )
}

export default function ChannelPlan({ channel }: { channel: 'amazon' | 'tiktok' }) {
  const products = useStore((s) => s.products)
  const scenario = useStore((s) => s.scenario)
  const updateProduct = useStore((s) => s.updateProduct)

  const casesKey = channel === 'amazon' ? 'amazonCasesPerYear' : 'tiktokCasesPerYear'
  const setListed = (id: string, ch: typeof channel, on: boolean, current: Product['channels']) =>
    updateProduct(id, { channels: { ...current, [ch]: on } })
  const setCases = (id: string, v: number, current: Product['channels']) =>
    updateProduct(id, { channels: { ...current, [casesKey]: v } })

  const pnl =
    channel === 'amazon'
      ? amazonChannelPnL(products, (p) => effectiveAmazonFees(scenario.amazon, p.unitsPerCase), scenario.amazon.planMonthly, scenario.logistics.perCase)
      : tiktokChannelPnL(products, effectiveTikTokFees(scenario.tiktok), scenario.logistics.perCase)

  const gmById = new Map(pnl.rows.map((r) => [r.product.id, r.year.gm]))
  const hasLogistics = pnl.logistics > 0
  const label = channel === 'amazon' ? 'AMAZON' : 'TIKTOK'

  return (
    <div className="border-2 border-ink bg-receipt p-[18px] mt-4 font-mono">
      <div className="text-[11px] tracking-[0.1em] text-ink/60 mb-1">
        THE FULL CHANNEL — {n0(pnl.skuCount)} SKU{pnl.skuCount === 1 ? '' : 'S'} LISTED
      </div>
      <div className="text-[11px] opacity-60 mb-3">
        Toggle SKUs in or out and set how many cases each sells a year. Same {label} fee assumptions across SKUs — set them above.
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] tracking-[0.08em] opacity-55 border-b-2 border-ink pb-1.5">
        <span>SKU</span>
        <span className="text-right w-[76px]">CASES / YR</span>
        <span className="text-right w-[64px]">GM / YR</span>
      </div>

      {products.map((p) => {
        const listed = channelListed(p, channel)
        const gm = gmById.get(p.id) ?? 0
        return (
          <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1.5 border-b-2 border-dotted border-ink">
            <label className="flex items-center gap-2 text-[12px] cursor-pointer min-w-0">
              <input
                type="checkbox"
                checked={listed}
                onChange={(e) => setListed(p.id, channel, e.target.checked, p.channels)}
                className="w-[15px] h-[15px] shrink-0 accent-[#0A0A0A]"
              />
              <span className={`truncate ${listed ? '' : 'opacity-40 line-through'}`}>{p.name || 'Unnamed'}</span>
            </label>
            {listed ? (
              <CasesInput value={skuCasesPerYear(p, channel)} onCommit={(v) => setCases(p.id, v, p.channels)} />
            ) : (
              <span className="w-[76px] text-right text-[12px] opacity-40">—</span>
            )}
            <span className="w-[64px] text-right text-[12px]" style={{ color: listed ? (gm < 0 ? REDPEN : INK) : '#0A0A0A66' }}>
              {listed ? gbp(gm) : '—'}
            </span>
          </div>
        )
      })}

      {pnl.skuCount === 0 ? (
        <div className="text-[12px] opacity-60 mt-3">No SKUs listed on this channel. Tick one to build the channel P&L.</div>
      ) : (
        <>
          <Rule className="mt-3 mb-2.5" />
          <RSection label={`THE ${label} CHANNEL, FULL YEAR`} />
          <RLine label="GSV (ex-VAT)" value={gbp(pnl.gsv)} bold />
          <RLine label="less marketplace fees" value={neg(pnl.fees)} dim />
          {channel === 'amazon' && <RLine label="less selling plan (12 months)" value={neg((pnl as ReturnType<typeof amazonChannelPnL>).plan)} dim />}
          <RLine label="NSV" value={gbp(pnl.nsv)} bold color={pnl.nsv < 0 ? REDPEN : INK} />
          <RLine label="NSV as % of GSV" value={pct(pnl.nsvPctOfGsv)} dim />
          <RLine label="less COGS" value={neg(pnl.cogs)} dim />
          {hasLogistics && <RLine label="less inbound logistics" value={neg(pnl.logistics)} dim />}
          <RLine label="Gross margin, channel" value={gbp(pnl.gm)} bold color={pnl.gm < 0 ? REDPEN : INK} />
          <RLine label="GM as % of NSV" value={pct(pnl.gmPctOfNsv)} dim color={pnl.gm < 0 ? REDPEN : undefined} />
        </>
      )}
    </div>
  )
}
