import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { generateId } from '../../store/useStore'
import type { Buyer } from '../../store/scenario'

/**
 * THE BUYERS — named term sets (retailer margin, wholesaler, trade spend).
 * Clicking a chip applies that buyer's terms to the shared scenario, which
 * every grocery page reads — so one click reprices the whole site for Tesco
 * vs Booker vs anyone else. The chip stays lit while the live terms match.
 */
export default function BuyerStrip() {
  const grocery = useStore((s) => s.scenario.grocery)
  const waterfall = useStore((s) => s.scenario.waterfall)
  const buyers = useStore((s) => s.scenario.buyers)
  const updateScenario = useStore((s) => s.updateScenario)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  const matches = (b: Buyer) =>
    b.retailerMargin === grocery.retailerMargin &&
    b.wholesalerEnabled === grocery.wholesalerEnabled &&
    b.wholesalerMargin === grocery.wholesalerMargin &&
    b.promoFunding === waterfall.promoFunding &&
    b.backMargin === waterfall.backMargin &&
    b.otherTrade === waterfall.otherTrade

  const apply = (b: Buyer) => {
    useStore.setState((state) => ({
      scenario: {
        ...state.scenario,
        grocery: {
          ...state.scenario.grocery,
          retailerMargin: b.retailerMargin,
          wholesalerEnabled: b.wholesalerEnabled,
          wholesalerMargin: b.wholesalerMargin,
        },
        waterfall: {
          ...state.scenario.waterfall,
          promoFunding: b.promoFunding,
          backMargin: b.backMargin,
          otherTrade: b.otherTrade,
        },
      },
    }))
  }

  const saveCurrent = () => {
    const buyer: Buyer = {
      id: generateId(),
      name: name.trim() || `Buyer ${buyers.length + 1}`,
      retailerMargin: grocery.retailerMargin,
      wholesalerEnabled: grocery.wholesalerEnabled,
      wholesalerMargin: grocery.wholesalerMargin,
      promoFunding: waterfall.promoFunding,
      backMargin: waterfall.backMargin,
      otherTrade: waterfall.otherTrade,
    }
    updateScenario('buyers', [...buyers, buyer] as never)
    setName('')
    setSaving(false)
  }

  const remove = (id: string) => {
    updateScenario('buyers', buyers.filter((b) => b.id !== id) as never)
  }

  const chip =
    'border-2 border-ink font-mono text-[11px] py-1.5 px-2.5 cursor-pointer tracking-[0.05em]'

  return (
    <div className="mt-4">
      <div className="font-mono text-[11px] tracking-[0.1em] opacity-60 mb-2">
        THE BUYERS <span className="font-normal">(saved terms — one click reprices every page)</span>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        {buyers.map((b) => {
          const active = matches(b)
          return (
            <span key={b.id} className="inline-flex">
              <button
                onClick={() => apply(b)}
                className={`${chip} ${active ? 'bg-bile' : 'bg-receipt hover:bg-bile'}`}
                aria-pressed={active}
                title={`${Math.round(b.retailerMargin * 100)}% retailer · trade ${Math.round((b.promoFunding + b.backMargin + b.otherTrade) * 100)}%`}
              >
                {b.name.toUpperCase()}
              </button>
              <button
                onClick={() => remove(b.id)}
                className={`${chip} border-l-0 bg-receipt hover:bg-redpen hover:text-receipt px-1.5`}
                aria-label={`Remove ${b.name}`}
              >
                ×
              </button>
            </span>
          )
        })}
        {saving ? (
          <span className="inline-flex items-stretch">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveCurrent()}
              placeholder="e.g. Tesco"
              aria-label="Buyer name"
              autoFocus
              className="border-2 border-ink bg-white font-mono text-[11px] px-2 w-32 outline-none"
            />
            <button onClick={saveCurrent} className={`${chip} border-l-0 bg-ink text-receipt hover:bg-bile hover:text-ink`}>
              SAVE
            </button>
          </span>
        ) : (
          <button onClick={() => setSaving(true)} className={`${chip} bg-receipt hover:bg-ink hover:text-receipt`}>
            + SAVE CURRENT TERMS AS A BUYER
          </button>
        )}
      </div>
    </div>
  )
}
